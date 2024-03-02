import * as THREE from './src/three.module.js';
import { DeviceOrientationControls } from './src/DeviceOrientationControls.js';

let camera, scene, renderer;
let video;
let controls;

function setupEventListeners() {
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight / 2; // /2 for rendering to half of the screen
        camera.updateProjectionMatrix();

        renderer.setSize( window.innerWidth, window.innerHeight );
    })
}

function init() {
    // renderer
    let container = document.getElementById('container');
    container.addEventListener( 'click', () => {
        video.play();
    });
    renderer = new THREE.WebGLRenderer({
        antialias: true
    });
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( window.innerWidth, window.innerHeight );
    renderer.setScissorTest(true); // this is for rendering to half of the screen
	// renderer.xr.enabled = true;
	// renderer.xr.setReferenceSpaceType( 'local' );
	container.appendChild( renderer.domElement );
    // document.body.appendChild( VRButton.createButton( renderer ) );

    // scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color( 0x101010 );

    camera = new THREE.PerspectiveCamera( 70, window.innerWidth / window.innerHeight / 2, 1, 2000 ); // /2 for rendering to half of the screen
    camera.layers.enable( 1 ); // render left view when no stereo available

    // video
    video = document.getElementById( 'video' );
    // video.play();
    setTimeout(() => {
        video.play();
    }, 10);

    const texture = new THREE.VideoTexture( video );
    texture.colorSpace = THREE.SRGBColorSpace;

    // left
    const geometry1 = new THREE.SphereGeometry( 300, 60, 40 );
    // invert the geometry on the x-axis so that all of the faces point inward
    geometry1.scale( - 1, 1, 1 );
    const uvs1 = geometry1.attributes.uv.array;
    for ( let i = 0; i < uvs1.length; i += 2 ) {
        // uvs1[ i ] *= 0.5;
    }
    const material1 = new THREE.MeshBasicMaterial( { map: texture } );
    const mesh1 = new THREE.Mesh( geometry1, material1 );
    mesh1.rotation.y = - Math.PI / 2;
    mesh1.layers.set( 1 ); // display in left eye only
    scene.add( mesh1 );

    // right
    // const geometry2 = new THREE.SphereGeometry( 300, 60, 40 );
    // geometry2.scale( - 1, 1, 1 );
    // const uvs2 = geometry2.attributes.uv.array;
    // for ( let i = 0; i < uvs2.length; i += 2 ) {
    //     // uvs2[ i ] *= 0.5;
    //     // uvs2[ i ] += 0.5;
    // }
    // const material2 = new THREE.MeshBasicMaterial( { map: texture } );
    // const mesh2 = new THREE.Mesh( geometry2, material2 );
    // mesh2.rotation.y = - Math.PI / 2;
    // mesh2.layers.set( 2 ); // display in right eye only
    // scene.add( mesh2 );

    // device orientation controls
    controls = new DeviceOrientationControls( camera );
    controls.screenOrientation = 90;

    setupEventListeners();
}

function animate() {
    renderer.setAnimationLoop( render );
}

function render() {
    controls.update();

    // renderer.render( scene, camera ); // only render one single screen

    // render to left & right half of the screen
    renderer.setViewport(0, 0, window.innerWidth / 2, window.innerHeight);
    renderer.setScissor(0, 0, window.innerWidth / 2, window.innerHeight);
    renderer.render(scene, camera);
    renderer.setViewport(window.innerWidth / 2, 0, window.innerWidth / 2, window.innerHeight);
    renderer.setScissor(window.innerWidth / 2, 0, window.innerWidth / 2, window.innerHeight);
    renderer.render(scene, camera);
}

// function to request access to device orientation events
let blurBg = document.getElementById('blur-bg');
let startVideoButton = document.getElementById('start-video-button');
function setup() {
    startVideoButton.addEventListener('click', () => {
        blurBg.style.display = 'none';
        startVideoButton.style.display = 'none';
        init();
        animate();
    })
}
setup();