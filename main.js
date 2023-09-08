import * as THREE from 'three';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
// import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import {PointerLockControls} from 'three/examples/jsm/controls/PointerLockControls';

const ws = new WebSocket('ws://localhost:8080/');
console.log(ws.readyState); 
const uid = generateRandomString()

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const light = new THREE.AmbientLight(0x404040);
scene.add(light);

// Create a function that takes an object as a parameter and adds it to the scene
function addObjectToScene(object) {
    scene.add(object);
}

// Describe the object
function createObject() {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    const object = new THREE.Mesh(geometry, material);
    return object;
}

// Create an OrbitControls instance for camera manipulation
// const controls = new OrbitControls(camera, renderer.domElement);

// Create a GUI for interactive controls
const gui = new GUI();
const objectFolder = gui.addFolder('Object');
let selectedObject = createObject(); // Create an initial object
addObjectToScene(selectedObject);

objectFolder.add(selectedObject.position, 'x', -10, 10);
objectFolder.add(selectedObject.position, 'y', -10, 10);
objectFolder.add(selectedObject.position, 'z', -10, 10);
objectFolder.add(selectedObject.rotation, 'x', 0, 2*Math.PI);
objectFolder.add(selectedObject.rotation, 'y', 0, 2*Math.PI);
objectFolder.add(selectedObject.rotation, 'z', 0, 2*Math.PI);
objectFolder.open();

camera.position.z = 5;
const position = new THREE.Vector3(); // Store the last position
const rotation = new THREE.Euler(); // Store the last rotation


//FPS controller
const FPScontrols = new PointerLockControls(camera,renderer.domElement);
document.addEventListener('click',function(){FPScontrols.lock();})
let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
let canJump = false;

let prevTime = performance.now();
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();

const onKeyDown = function ( event ) {

    switch ( event.code ) {

        case 'ArrowUp':
        case 'KeyW':
            moveForward = true;
            break;

        case 'ArrowLeft':
        case 'KeyA':
            moveLeft = true;
            break;

        case 'ArrowDown':
        case 'KeyS':
            moveBackward = true;
            break;

        case 'ArrowRight':
        case 'KeyD':
            moveRight = true;
            break;

        case 'Space':
            if ( canJump === true ) velocity.y += 350;
            canJump = false;
            break;

    }

};

const onKeyUp = function ( event ) {

    switch ( event.code ) {

        case 'ArrowUp':
        case 'KeyW':
            moveForward = false;
            break;

        case 'ArrowLeft':
        case 'KeyA':
            moveLeft = false;
            break;

        case 'ArrowDown':
        case 'KeyS':
            moveBackward = false;
            break;

        case 'ArrowRight':
        case 'KeyD':
            moveRight = false;
            break;

    }

};
document.addEventListener( 'keydown', onKeyDown );
document.addEventListener( 'keyup', onKeyUp );

function updateFPSControls(){
    const time = performance.now();
    const delta = ( time - prevTime ) / 1000;

	velocity.x -= velocity.x * 10.0 * delta;
	velocity.z -= velocity.z * 10.0 * delta;

	velocity.y -= 9.8 * 100.0 * delta; // 100.0 = mass

	direction.z = Number( moveForward ) - Number( moveBackward );
	direction.x = Number( moveRight ) - Number( moveLeft );
	direction.normalize(); // this ensures consistent movements in all directions

	if ( moveForward || moveBackward ) velocity.z -= direction.z * 1000.0 * delta;//intial value 300
	if ( moveLeft || moveRight ) velocity.x -= direction.x * 1000.0 * delta;//initial value 300

    FPScontrols.moveRight( - velocity.x * delta );
	FPScontrols.moveForward( - velocity.z * delta );
    
    prevTime = time;
}

// Animate the scene
function animate() {
    // requestAnimationFrame(animate);
    // updateFPSControls();
    // renderer.render(scene, camera);
    // // updateCameraPosition();

    // // Send position and rotation to Unity if the object's properties change
    // if (!camera.position.equals(position) && !camera.rotation.equals(rotation)) {
    //     position.copy(camera.position);
    //     rotation.copy(camera.rotation);
    //     console.log(position);
    //     sendPositionAndRotationToUnity(camera);
    //     // console.log(uid);
    // }

    requestAnimationFrame( animate );
    updateFPSControls();
  
	renderer.render( scene, camera );
  // updateCameraPosition();

    // Send position and rotation to Unity if the object's properties change
    // if (!camera.position.equals(position) && !camera.rotation.equals(rotation)) {
        position.copy(camera.position);
        rotation.copy(camera.rotation);
        sendPositionAndRotationToUnity(camera);
        // console.log(objectData.transformData.rotation.x);
    // }

    
//   console.log(renderer.info.render.calls);
  renderer.info.reset()
}

// Function to send position and rotation data to Unity
function sendPositionAndRotationToUnity(object) {
    const objectData = {
        header: {
            type:"transforms",
            id: uid
        },
        transformData:{
            position: object.position,
            rotation: {
                x: object.rotation.x,
                y: object.rotation.y,
                z: object.rotation.z
            }
        }
        
    };
    console.log(objectData.transformData.rotation.x);
    const jsonObjectData = JSON.stringify(objectData);
    if (ws.readyState === WebSocket.OPEN) {
        ws.send(jsonObjectData);
    }
}

ws.addEventListener('message', event => {
    const receivedMessage = event.data;
    console.log(receivedMessage);
});

ws.addEventListener("close", () => {
    ws.send("close");
});

// Function to close the WebSocket connection
function closeWebSocketConnection() {
    if (ws.readyState === WebSocket.OPEN) {
        // ws.send("close");
        ws.close();
    }
}

// Add an event listener for the "beforeunload" event
window.addEventListener("beforeunload", () => {
    const clientTypeMessage = {
        header: {
            type:"webgl disconnected",
            id: uid
        },
    };
    ws.send(JSON.stringify(clientTypeMessage));
    closeWebSocketConnection();
});

const isWebGLClient = true;

// When the WebSocket connection is opened
ws.addEventListener('open', () => {
    const clientTypeMessage = {
        header: {
            type:"webgl connected",
            id: uid
        },
    };
    ws.send(JSON.stringify(clientTypeMessage));
});

function generateRandomString() {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
  
    for (let i = 0; i < 6; i++) {
      const randomIndex = Math.floor(Math.random() * characters.length);
      result += characters.charAt(randomIndex);
    }
  
    return result;
  }


animate();
