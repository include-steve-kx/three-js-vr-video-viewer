import * as THREE from './src/three.module.js';
import { OrbitControls } from './src/OrbitControls.js';
import { GUI } from './src/dat.gui.module.js';
import { vsSphere, fs, fsSphereVideoStrip, fsSphereFishEye, fsSphereFishEyeNew, fsSphereEquidistant, vsRectangle, fsRectangle } from './shaders.js';

let rectangle360Padding = 10;
let sphere360Padding = 10;

let cameraSphere, sceneSphere, rendererSphere;
let cameraRectangle, sceneRectangle, rendererRectangle;
let controls;

let sphere360Container, sphere360ContainerSize;
let rectangle360Container, rectangle360ContainerSize;

let cameraDirection = new THREE.Vector3(1, 1, 1);
let meshHelperSphere, meshSphere;
let meshRectangle;

let texture;

// let guiSettings = { // for static/vid_2024-12-06_20-39-21-324_360.mp4
//     exp1: 0.34,
//     exp2: 2.2,
//     xOffset: -52,
//     yOffset: 11,
//     sphereYScale: 0.8,
//     displayMap: true,
//     vFov: 70,
// }

// let guiSettings = {
//     exp1: 0.34,
//     exp2: 2.9,
//     xOffset: 41.64,
//     yOffset: -10.39,
//     sphereYScale: 1,
//     displayMap: false,
//     vFov: 70,
// }

let guiSettings = {
    exp1: 0.34,
    exp2: 2.15,
    yawCorrection: -83.22,
    pitchCorrection: 0,
    rollCorrection: 0,
    sphereYScale: 1,
    displayMap: true,
    IMUCorrection: true,
    IMURealtime: true,
    IMURealtimeInverse: true,
    lookoutCameraFOV: 220,
    vFov: 70,
}

let lastIMUData = {
    yawIMU: 0,
    pitchIMU: 0,
    rollIMU: 0,
};

function updateIMU(options) {
    // corrections
    if (options.yawCorrection) {
        guiSettings.yawCorrection = options.yawCorrection;

        meshSphere.material.uniforms['yawCorrection'].value = options.yawCorrection;
        meshSphere.material.needsUpdate = true;

        meshRectangle.material.uniforms['yawCorrection'].value = options.yawCorrection;
        meshRectangle.material.needsUpdate = true;
    }
    if (options.pitchCorrection) {
        guiSettings.pitchCorrection = options.pitchCorrection;

        meshSphere.material.uniforms['pitchCorrection'].value = options.pitchCorrection;
        meshSphere.material.needsUpdate = true;

        meshRectangle.material.uniforms['pitchCorrection'].value = options.pitchCorrection;
        meshRectangle.material.needsUpdate = true;
    }
    if (options.rollCorrection) {
        guiSettings.rollCorrection = options.rollCorrection;

        meshSphere.material.uniforms['rollCorrection'].value = options.rollCorrection;
        meshSphere.material.needsUpdate = true;

        meshRectangle.material.uniforms['rollCorrection'].value = options.rollCorrection;
        meshRectangle.material.needsUpdate = true;
    }
    // real-time IMU data
    if (options.yawIMU && guiSettings.IMURealtime) {
        meshSphere.material.uniforms['yawIMU'].value = options.yawIMU;
        meshSphere.material.needsUpdate = true;

        meshRectangle.material.uniforms['yawIMU'].value = options.yawIMU;
        meshRectangle.material.needsUpdate = true;

        lastIMUData.yawIMU = options.yawIMU;
    }
    if (options.pitchIMU && guiSettings.IMURealtime) {
        meshSphere.material.uniforms['pitchIMU'].value = options.pitchIMU;
        meshSphere.material.needsUpdate = true;

        meshRectangle.material.uniforms['pitchIMU'].value = options.pitchIMU;
        meshRectangle.material.needsUpdate = true;

        lastIMUData.pitchIMU = options.pitchIMU;
    }
    if (options.rollIMU && guiSettings.IMURealtime) {
        meshSphere.material.uniforms['rollIMU'].value = options.rollIMU;
        meshSphere.material.needsUpdate = true;

        meshRectangle.material.uniforms['rollIMU'].value = options.rollIMU;
        meshRectangle.material.needsUpdate = true;

        lastIMUData.rollIMU = options.rollIMU;
    }
}

function addGUI() {
    let gui = new GUI();

    gui.add( guiSettings, "yawCorrection", -180, 180, 0.01 ).onChange( function ( value ) {
        updateIMU({yawCorrection: value});
    } );
    
    gui.add( guiSettings, "pitchCorrection", -180, 180, 0.01 ).onChange( function ( value ) {
        updateIMU({pitchCorrection: value});
    } );

    gui.add( guiSettings, "rollCorrection", -180, 180, 0.01 ).onChange( function ( value ) {
        updateIMU({rollCorrection: value});
    } );

    gui.add( guiSettings, "sphereYScale", 0, 1, 0.01 ).onChange( function ( value ) {
        guiSettings.sphereYScale = value;
        meshSphere.scale.set(1, guiSettings.sphereYScale, 1);
    } );

    gui.add( guiSettings, "displayMap").onChange( function ( value ) {
        guiSettings.displayMap = value;

        meshSphere.material.uniforms['displayMap'].value = guiSettings.displayMap;
        meshSphere.material.needsUpdate = true;

        meshRectangle.material.uniforms['displayMap'].value = guiSettings.displayMap;
        meshRectangle.material.needsUpdate = true;
    } );

    gui.add( guiSettings, "IMUCorrection").onChange( function ( value ) {
        guiSettings.IMUCorrection = value;

        meshSphere.material.uniforms['IMUCorrection'].value = guiSettings.IMUCorrection;
        meshSphere.material.needsUpdate = true;

        meshRectangle.material.uniforms['IMUCorrection'].value = guiSettings.IMUCorrection;
        meshRectangle.material.needsUpdate = true;
    } );

    gui.add( guiSettings, "IMURealtime").onChange( function ( value ) {
        guiSettings.IMURealtime = value;

        if (guiSettings.IMURealtime) {
            meshSphere.material.uniforms['yawIMU'].value = lastIMUData.yawIMU;
            meshSphere.material.needsUpdate = true;
            meshRectangle.material.uniforms['yawIMU'].value = lastIMUData.yawIMU;
            meshRectangle.material.needsUpdate = true;

            meshSphere.material.uniforms['pitchIMU'].value = lastIMUData.pitchIMU;
            meshSphere.material.needsUpdate = true;
            meshRectangle.material.uniforms['pitchIMU'].value = lastIMUData.pitchIMU;
            meshRectangle.material.needsUpdate = true;

            meshSphere.material.uniforms['rollIMU'].value = lastIMUData.rollIMU;
            meshSphere.material.needsUpdate = true;
            meshRectangle.material.uniforms['rollIMU'].value = lastIMUData.rollIMU;
            meshRectangle.material.needsUpdate = true;
        } else {
            meshSphere.material.uniforms['yawIMU'].value = 0;
            meshSphere.material.needsUpdate = true;
            meshRectangle.material.uniforms['yawIMU'].value = 0;
            meshRectangle.material.needsUpdate = true;

            meshSphere.material.uniforms['pitchIMU'].value = 0;
            meshSphere.material.needsUpdate = true;
            meshRectangle.material.uniforms['pitchIMU'].value = 0;
            meshRectangle.material.needsUpdate = true;

            meshSphere.material.uniforms['rollIMU'].value = 0;
            meshSphere.material.needsUpdate = true;
            meshRectangle.material.uniforms['rollIMU'].value = 0;
            meshRectangle.material.needsUpdate = true;
        }
    } );

    gui.add( guiSettings, "IMURealtimeInverse").onChange( function ( value ) {
        guiSettings.IMURealtimeInverse = value;

        meshSphere.material.uniforms['IMURealtimeInverse'].value = guiSettings.IMURealtimeInverse;
        meshSphere.material.needsUpdate = true;

        // meshRectangle.material.uniforms['IMURealtimeInverse'].value = guiSettings.IMURealtimeInverse;
        // meshRectangle.material.needsUpdate = true;
    } );

    gui.add( guiSettings, "lookoutCameraFOV", 60, 360, 0.1 ).onChange( function ( value ) {
        guiSettings.lookoutCameraFOV = value;
        
        meshSphere.material.uniforms['lookoutCameraFOV'].value = guiSettings.lookoutCameraFOV;
        meshSphere.material.needsUpdate = true;

        // meshRectangle.material.uniforms['lookoutCameraFOV'].value = guiSettings.lookoutCameraFOV;
        // meshRectangle.material.needsUpdate = true;
    } );
}

function setupEventListeners() {
    window.addEventListener('resize', () => {
        // update bottom sphere 360 image
        sphere360ContainerSize = sphere360Container.getBoundingClientRect();

        cameraSphere.aspect = (sphere360ContainerSize.width - sphere360Padding * 2) / (sphere360ContainerSize.height - sphere360Padding * 2);
        cameraSphere.updateProjectionMatrix();

        rendererSphere.setSize(
            sphere360ContainerSize.width - sphere360Padding * 2,
            sphere360ContainerSize.height - sphere360Padding * 2
        );

        // update top rectangle 360 image & shader parameters
        rectangle360ContainerSize = rectangle360Container.getBoundingClientRect();

        rendererRectangle.setSize(
            rectangle360ContainerSize.width - rectangle360Padding * 2,
            rectangle360ContainerSize.height - rectangle360Padding * 2
        );

        meshRectangle.material.uniforms['aspectRatio'].value = (sphere360ContainerSize.width - rectangle360Padding * 2) / (sphere360ContainerSize.height - rectangle360Padding * 2);
    })

    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            cameraSphere.position.set(0.01, 0.01, 0.01);
            cameraSphere.lookAt(0.009, 0.009, 0);
            cameraSphere.updateMatrixWorld(true);
        } else if (e.key === ' ') {
            if (videoSocket360 && videoSocket360.readyState === WebSocket.OPEN) {
                videoStatus360 = !videoStatus360;
                videoSocket360.send(JSON.stringify({
                    command: videoStatus360 ? 'resume' : 'pause'
                }));
            }
            if (nmeaSocket && nmeaSocket.readyState === WebSocket.OPEN) {
                nmeaStatus = !nmeaStatus;
                nmeaSocket.send(JSON.stringify({
                    command: nmeaStatus ? 'resume' : 'pause'
                }));
            }
        }
    })
}

// ------------------------------ 360 video stream ------------------------------ //
// for 360 view 5002
let videoStatus360 = false;
let videoSocket360;
let reconnectInterval360 = 1000; // 1 second initial reconnect interval
let maxReconnectInterval360 = 30000; // 30 seconds maximum reconnect interval
let reconnectAttempts360 = 0;
let maxReconnectAttempts360 = 10; // Maximum number of reconnection attempts
let previousImageUrl360 = null;

function initVideo() {
    // video frame
    let videoFrame360 = document.getElementById( 'video-frame-360' );

    texture = new THREE.Texture( videoFrame360 );
    texture.colorSpace = THREE.SRGBColorSpace;

    videoFrame360.addEventListener('load', () => {
        texture.needsUpdate = true;
    });

    connectVideoWebSocket360();
}

function connectVideoWebSocket360() {
    const hostname = window.location.hostname; // Get the hostname dynamically

    // 360 video web socket logic
    videoSocket360 = new WebSocket(`ws://${hostname}:5002`);

    videoSocket360.binaryType = 'arraybuffer';

    videoSocket360.onopen = function (event) {
        videoStatus360 = true;
        console.log("Video WebSocket 360 is open now.");
        reconnectInterval360 = 1000;
        reconnectAttempts360 = 0;
    };

    videoSocket360.onerror = function (event) {
        console.error("Video WebSocket error observed:", event);
    };

    videoSocket360.onclose = function (event) {
        videoStatus360 = false;
        console.log("Video WebSocket is closed now. Attempting to reconnect...", event);
        if (reconnectAttempts360 < maxReconnectAttempts360) {
            setTimeout(connectVideoWebSocket360, reconnectInterval360);
            reconnectInterval360 = Math.min(reconnectInterval360 * 2, maxReconnectInterval360);
            reconnectAttempts360++;
        } else {
            console.error('Max reconnect attempts reached. Cannot reconnect to WebSocket.');
        }
    };

    videoSocket360.onmessage = function (event) {
        handleWebSocketMessage360(event);
    };
}

function updateCVPositions(bbox) {
    meshSphere.material.uniforms['bbox'].value.x = bbox.x;
    meshSphere.material.uniforms['bbox'].value.y = bbox.y;
    meshSphere.material.uniforms['bbox'].value.width = bbox.width;
    meshSphere.material.uniforms['bbox'].value.height = bbox.height;
    meshSphere.material.needsUpdate = true;
}

let lastBboxes;
async function handleWebSocketMessage360(event) {
    // // parse the websocket information and retrieve jpeg video stream frame
    // const imageData = event.data;
    // const blob = new Blob([imageData], { type: "image/jpeg" });
    // const url = URL.createObjectURL(blob);
    // const videoFrame360 = document.getElementById('video-frame-360');
    // // Revoke the previous object URL to free up memory
    // if (previousImageUrl360) {
    //     URL.revokeObjectURL(previousImageUrl360);
    // }
    // previousImageUrl360 = url;
    // videoFrame360.src = url;

    // together with CV detection data, streaming together with 360 video
    const dataView = new DataView(event.data);
    const jsonLength = dataView.getUint32(0);
    const jsonString = new TextDecoder().decode(event.data.slice(4, 4 + jsonLength));
    const bboxesInfo = JSON.parse(jsonString);
    if (bboxesInfo.bboxes.length > 0) {
        lastBboxes = bboxesInfo.bboxes;
    }
    updateCVPositions(lastBboxes[0]);

    
    const imageData = event.data.slice(4 + jsonLength);
    const blob = new Blob([imageData], { type: "image/jpeg" });
    const url = URL.createObjectURL(blob);
    const videoFrame360 = document.getElementById('video-frame-360');
    // Revoke the previous object URL to free up memory
    if (previousImageUrl360) {
        URL.revokeObjectURL(previousImageUrl360);
    }
    previousImageUrl360 = url;
    videoFrame360.src = url;
}

// ------------------------------ IMU data stream ------------------------------ //
let nmeaSocket;
let nmeaStatus = false;
let nmeaReconnectInterval = 1000; // Initial interval for reconnection
let nmeaReconnectAttempts = 0;
const nmeaMaxReconnectAttempts = 5; // Set max attempts as needed
const nmeaMaxReconnectInterval = 16000; // Set max interval as needed

function initWorker() {
    // Initialize the worker
    const worker = new Worker(new URL('worker.js', import.meta.url));

    // WebSocket connection for NMEA data (port 3636)
    nmeaSocket = new WebSocket('ws://127.0.0.1:3636');

    // Handle data received from worker
    worker.addEventListener('message', function (event) {
        const { type, processedData } = event.data;

        if (type === 'IMU') {
            //updateIMUData Here;
            // todo Steve: log out IMU data here
            console.log(type, processedData);

            updateIMU({
                yawIMU: processedData.yaw,
                pitchIMU: processedData.pitch,
                rollIMU: processedData.roll,
            });
        }
    });

    nmeaSocket.addEventListener('open', function () {
        nmeaStatus = true;
        console.log('Connected to NMEA WebSocket');
        nmeaReconnectInterval = 1000; // Reset interval after a successful connection
        nmeaReconnectAttempts = 0;
    });

    nmeaSocket.addEventListener('message', function (event) {
        worker.postMessage(event.data);
    });

    nmeaSocket.addEventListener('error', function (event) {
        console.error('NMEA WebSocket error observed:', event);
    });

    nmeaSocket.addEventListener('close', function () {
        nmeaStatus = false;
        console.log('NMEA WebSocket is closed now. Attempting to reconnect...');
        if (nmeaReconnectAttempts < nmeaMaxReconnectAttempts) {
            setTimeout(initWorker, nmeaReconnectInterval);
            nmeaReconnectInterval = Math.min(nmeaReconnectInterval * 2, nmeaMaxReconnectInterval);
            nmeaReconnectAttempts++;
        } else {
            console.error('Max reconnect attempts reached. Cannot reconnect to NMEA WebSocket.');
        }
    });
};

function initRectangleScene() {
    // rectangle 360 renderer
    rectangle360Container = document.getElementById('rectangle-360-container');
    rectangle360Container.style.padding = `${rectangle360Padding}px`;
    rectangle360Container.style.boxSizing = 'border-box';
    rendererRectangle = new THREE.WebGLRenderer({
        antialias: true
    });
	rendererRectangle.setPixelRatio( window.devicePixelRatio );
    rectangle360ContainerSize = rectangle360Container.getBoundingClientRect();
	rendererRectangle.setSize(
        rectangle360ContainerSize.width - rectangle360Padding * 2,
        rectangle360ContainerSize.height - rectangle360Padding * 2
    );
	rectangle360Container.appendChild( rendererRectangle.domElement );
    rendererRectangle.domElement.style.borderRadius = '10px';

    // scene
    sceneRectangle = new THREE.Scene();
    sceneRectangle.background = new THREE.Color( 0x101010 );

    // camera
    cameraRectangle = new THREE.PerspectiveCamera(
        guiSettings.vFov,
        (rectangle360ContainerSize.width - rectangle360Padding * 2) / (rectangle360ContainerSize.height - rectangle360Padding * 2),
        0.01,
        10000
    );
    
    // full-screen quad
    let geo = new THREE.PlaneGeometry(2, 2);
    let mat = new THREE.ShaderMaterial({
        vertexShader: vsRectangle,
        fragmentShader: fsRectangle,
        uniforms: {
            exp1: {value: guiSettings.exp1},
            exp2: {value: guiSettings.exp2},
            yawCorrection: {value: guiSettings.yawCorrection},
            pitchCorrection: {value: guiSettings.pitchCorrection},
            rollCorrection: {value: guiSettings.rollCorrection},
            yawIMU: {value: 0},
            pitchIMU: {value: 0},
            rollIMU: {value: 0},
            map: {value: texture},
            displayMap: {value: guiSettings.displayMap},
            IMUCorrection: {value: guiSettings.IMUCorrection},
            cameraDirection: {value: cameraDirection},
            vFov: {value: guiSettings.vFov},
            aspectRatio: {value: (sphere360ContainerSize.width - rectangle360Padding * 2) / (sphere360ContainerSize.height - rectangle360Padding * 2)}, // note that this is the SPHERE container aspect ratio !!!!!
        }
    });
    meshRectangle = new THREE.Mesh(geo, mat);

    console.log(meshRectangle.material.uniforms['vFov'].value);
    console.log(meshRectangle.material.uniforms['aspectRatio'].value);

    sceneRectangle.add(meshRectangle);
}

function initSphereScene() {
    // sphere 360 renderer
    sphere360Container = document.getElementById('sphere-360-container');
    sphere360Container.style.padding = `${sphere360Padding}px`;
    sphere360Container.style.boxSizing = 'border-box';
    rendererSphere = new THREE.WebGLRenderer({
        antialias: true
    });
	rendererSphere.setPixelRatio( window.devicePixelRatio );
    sphere360ContainerSize = sphere360Container.getBoundingClientRect();
	rendererSphere.setSize(
        sphere360ContainerSize.width - sphere360Padding * 2,
        sphere360ContainerSize.height - sphere360Padding * 2
    );
	sphere360Container.appendChild( rendererSphere.domElement );
    rendererSphere.domElement.style.borderRadius = '10px';

    // scene
    sceneSphere = new THREE.Scene();
    sceneSphere.background = new THREE.Color( 0x101010 );

    // camera
    cameraSphere = new THREE.PerspectiveCamera(
        100,
        (sphere360ContainerSize.width - sphere360Padding * 2) / (sphere360ContainerSize.height - sphere360Padding * 2),
        0.01,
        10000
    );
    // cameraSphere.position.set(0.01, 0.01, 0.01);
    cameraSphere.position.set(400, 400, 400);
    cameraSphere.lookAt(0.009, 0.009, 0);
    cameraSphere.updateMatrixWorld(true);


    // grid helper
    let gridGeo = new THREE.PlaneGeometry(10, 10, 10, 10);
    gridGeo.rotateX(-Math.PI / 2);
    let gridMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        wireframe: true,
    });
    let grid = new THREE.Mesh(gridGeo, gridMat);
    sceneSphere.add(grid);

    // axes helpers
    let axesHelper1 = new THREE.AxesHelper();
    axesHelper1.position.y = 0.01;
    sceneSphere.add(axesHelper1);

    let geo = new THREE.BoxGeometry(0.1, 0.1, 0.1);
    let mat = new THREE.MeshBasicMaterial({
        color: 0xff0000,
    });
    let box = new THREE.Mesh(geo, mat);
    box.position.set(0.1, 0, 0);
    // scene.add(box);

    let axesHelper2 = new THREE.AxesHelper();
    axesHelper2.scale.set(-1, -1, -1)
    axesHelper2.position.y = 0.01;
    // scene.add(axesHelper2);

    // inner sphere with wire helper
    // const helperSphereGeo = new THREE.SphereGeometry( 299, 20, 10 );
    const helperSphereGeo = new THREE.SphereGeometry( 299, 20, 10 );
    const helperSphereMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        wireframe: true,
    });
    meshHelperSphere = new THREE.Mesh(helperSphereGeo, helperSphereMat);
    sceneSphere.add(meshHelperSphere);

    // outer sphere with 360 video texture
    const geometry = new THREE.SphereGeometry( 300, 60, 40 );
    // invert the geometry on the x-axis so that all of the faces point inward
    geometry.scale( - 1, 1, 1 );
    const material = new THREE.ShaderMaterial({
        // fragmentShader: fsTest,
        vertexShader: vsSphere,
        // fragmentShader: fs,
        // fragmentShader: fsSphereVideoStrip,

        // fragmentShader: fsSphereFishEye,
        // uniforms: {
        //     exp1: {value: guiSettings.exp1},
        //     exp2: {value: guiSettings.exp2},
        //     yawCorrection: {value: guiSettings.yawCorrection},
        //     pitchCorrection: {value: guiSettings.pitchCorrection},
        //     rollCorrection: {value: guiSettings.rollCorrection},
        //     yawIMU: {value: 0},
        //     pitchIMU: {value: 0},
        //     rollIMU: {value: 0},
        //     map: {value: texture},
        //     displayMap: {value: guiSettings.displayMap},
        //     IMUCorrection: {value: guiSettings.IMUCorrection},
        //     IMURealtimeInverse: {value: guiSettings.IMURealtimeInverse},
        // },

        // fragmentShader: fsSphereEquidistant,
        // uniforms: {
        //     uTexture: {value: texture},
        //     uFOV: {value: 190 / 180 * Math.PI},
        // },

        fragmentShader: fsSphereFishEyeNew,
        uniforms: {
            lookoutCameraFOV: {value: guiSettings.lookoutCameraFOV},
            yawCorrection: {value: guiSettings.yawCorrection},
            pitchCorrection: {value: guiSettings.pitchCorrection},
            rollCorrection: {value: guiSettings.rollCorrection},
            yawIMU: {value: 0},
            pitchIMU: {value: 0},
            rollIMU: {value: 0},
            map: {value: texture},
            displayMap: {value: guiSettings.displayMap},
            IMUCorrection: {value: guiSettings.IMUCorrection},
            IMURealtimeInverse: {value: guiSettings.IMURealtimeInverse},
            bbox: {
                value: {
                    x: 0,
                    y: 0, 
                    width: 0,
                    height: 0,
                }
            }
        },

        side: THREE.DoubleSide,
    })
    meshSphere = new THREE.Mesh( geometry, material );
    meshSphere.scale.set(1, guiSettings.sphereYScale, 1);
    sceneSphere.add( meshSphere );

    // device orientation controls
    controls = new OrbitControls( cameraSphere, rendererSphere.domElement );
    controls.target = new THREE.Vector3(0.009, 0.009, 0);
    controls.update();

    addGUI();
    setupEventListeners();
}

function animate() {
    rendererSphere.setAnimationLoop( render );
}

function render() {
    controls.update();

    // update mesh rectangle strip camera direction uniform
    cameraSphere.updateMatrixWorld(true);
    cameraSphere.getWorldDirection(cameraDirection);
    meshRectangle.material.uniforms['cameraDirection'].value = cameraDirection;

    rendererSphere.render(sceneSphere, cameraSphere);

    rendererRectangle.render(sceneRectangle, cameraRectangle);
}

// function to request access to device orientation events
let blurBg = document.getElementById('blur-bg');
let startVideoButton = document.getElementById('start-video-button');
function setup() {
    // startVideoButton.addEventListener('click', () => {
        blurBg.style.display = 'none';
        startVideoButton.style.display = 'none';
        initVideo();
        initWorker();
        initSphereScene();
        initRectangleScene();
        animate();
    // })
}
setup();