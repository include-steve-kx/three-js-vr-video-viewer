import * as THREE from './src/three.module.js';
import { OrbitControls } from './src/OrbitControls.js';
import { GUI } from './src/dat.gui.module.js';
import { vsSphere, fs, fsSphereVideoStrip, fsSphereFishEye, vsRectangle, fsRectangle } from './shaders.js';

let rectangle360Padding = 10;
let sphere360Padding = 10;

let cameraSphere, sceneSphere, rendererSphere;
let cameraRectangle, sceneRectangle, rendererRectangle;
let video, isVideoPlaying;
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

let guiSettings = {
    exp1: 0.34,
    exp2: 2.9,
    xOffset: 41.64,
    yOffset: -10.39,
    sphereYScale: 0.8,
    displayMap: true,
    vFov: 70,
}

function addGUI() {
    let gui = new GUI();
    gui.add( guiSettings, "exp1", 0, 1, 0.01 ).onChange( function ( value ) {
        guiSettings.exp1 = value;

        meshSphere.material.uniforms['exp1'].value = guiSettings.exp1;
        meshSphere.material.needsUpdate = true;

        meshRectangle.material.uniforms['exp1'].value = guiSettings.exp1;
        meshRectangle.material.needsUpdate = true;
    } );

    gui.add( guiSettings, "exp2", 1, 10, 0.01 ).onChange( function ( value ) {
        guiSettings.exp2 = value;

        meshSphere.material.uniforms['exp2'].value = guiSettings.exp2;
        meshSphere.material.needsUpdate = true;

        meshRectangle.material.uniforms['exp2'].value = guiSettings.exp2;
        meshRectangle.material.needsUpdate = true;
    } );

    gui.add( guiSettings, "xOffset", -180, 180, 0.01 ).onChange( function ( value ) {
        guiSettings.xOffset = value;

        meshSphere.material.uniforms['xOffset'].value = guiSettings.xOffset;
        meshSphere.material.needsUpdate = true;

        meshRectangle.material.uniforms['xOffset'].value = guiSettings.xOffset;
        meshRectangle.material.needsUpdate = true;
    } );
    
    gui.add( guiSettings, "yOffset", -90, 90, 0.01 ).onChange( function ( value ) {
        guiSettings.yOffset = value;

        meshSphere.material.uniforms['yOffset'].value = guiSettings.yOffset;
        meshSphere.material.needsUpdate = true;

        meshRectangle.material.uniforms['yOffset'].value = guiSettings.yOffset;
        meshRectangle.material.needsUpdate = true;
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
            if (video) {
                if (isVideoPlaying) {
                    video.pause();
                    isVideoPlaying = false;
                } else {
                    video.play();
                    isVideoPlaying = true;
                }
            }
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
            const videoSources = [
                'static/PBIBS_114/114_circle.mp4',
                // 'static/PBIBS_114/114_ellipse.mp4'
                'static/PBIBS_114/114_circle_stretched.mp4'
            ];
            const currentSrc = video.currentSrc;
            const currentIndex = videoSources.findIndex(src => currentSrc.endsWith(src));
            let newIndex;
            if (e.key === 'ArrowLeft') {
                newIndex = currentIndex <= 0 ? videoSources.length - 1 : currentIndex - 1;
            } else {
                newIndex = currentIndex >= videoSources.length - 1 ? 0 : currentIndex + 1;
            }
            video.src = videoSources[newIndex];
            console.log(`Currently playing: ${video.src}`);
            video.play();
            isVideoPlaying = true;
        }
    })
}

function initVideo() {
    // video
    video = document.getElementById( 'video' );
    video.onplaying = function() {
        isVideoPlaying = true;
    }
    // video.play();
    setTimeout(() => {
        video.play();
    }, 10);

    // document.addEventListener( 'click', () => {
    //     video.play();
    // });

    texture = new THREE.VideoTexture( video );
    texture.colorSpace = THREE.SRGBColorSpace;
}

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
            xOffset: {value: guiSettings.xOffset},
            yOffset: {value: guiSettings.yOffset},
            map: {value: texture},
            displayMap: {value: guiSettings.displayMap},
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
        70,
        (sphere360ContainerSize.width - sphere360Padding * 2) / (sphere360ContainerSize.height - sphere360Padding * 2),
        0.01,
        10000
    );
    cameraSphere.position.set(0.01, 0.01, 0.01);
    // camera.position.set(400, 400, 400);
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
        fragmentShader: fsSphereFishEye,
        uniforms: {
            exp1: {value: guiSettings.exp1},
            exp2: {value: guiSettings.exp2},
            xOffset: {value: guiSettings.xOffset},
            yOffset: {value: guiSettings.yOffset},
            map: {value: texture},
            displayMap: {value: guiSettings.displayMap},
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
        initSphereScene();
        initRectangleScene();
        animate();
    // })
}
setup();