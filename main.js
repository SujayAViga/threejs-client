import * as THREE from 'three';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'

const ws = new WebSocket('ws://localhost:8080/');

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
const controls = new OrbitControls(camera, renderer.domElement);

// Create a GUI for interactive controls
const gui = new GUI();
const objectFolder = gui.addFolder('Object');
let selectedObject = createObject(); // Create an initial object
addObjectToScene(selectedObject);

objectFolder.add(selectedObject.position, 'x', -10, 10);
objectFolder.add(selectedObject.position, 'y', -10, 10);
objectFolder.add(selectedObject.position, 'z', -10, 10);
objectFolder.add(selectedObject.rotation, 'x', 0, 360);
objectFolder.add(selectedObject.rotation, 'y', 0, 360);
objectFolder.add(selectedObject.rotation, 'z', 0, 360);
objectFolder.open();

camera.position.z = 5;
const position = new THREE.Vector3(); // Store the last position
const rotation = new THREE.Euler(); // Store the last rotation


// camera movements
// Define a movement speed for the camera
const movementSpeed = 0.1;

// Create a boolean object to track key states
const keys = {
    KeyW: false,
    KeyA: false,
    KeyS: false,
    KeyD: false
};

// Add event listeners for keydown and keyup events
document.addEventListener('keydown', onKeyDown);
document.addEventListener('keyup', onKeyUp);

function onKeyDown(event) {
    keys[event.code] = true;
}

function onKeyUp(event) {
    keys[event.code] = false;
}

// Update the camera's position based on pressed keys
function updateCameraPosition() {
    if (keys.KeyW) {
        camera.position.z -= movementSpeed;
    }
    if (keys.KeyA) {
        camera.position.x -= movementSpeed;
    }
    if (keys.KeyS) {
        camera.position.z += movementSpeed;
    }
    if (keys.KeyD) {
        camera.position.x += movementSpeed;
    }
}


// Animate the scene
function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
    updateCameraPosition();
    // Send position and rotation to Unity if the object's properties change
    if (!camera.position.equals(position) && !camera.rotation.equals(rotation)) {
        position.copy(camera.position);
        rotation.copy(camera.rotation);
        // console.log(rotation);
        sendPositionAndRotationToUnity(camera);
    }
}

// Function to send position and rotation data to Unity
function sendPositionAndRotationToUnity(object) {
    const objectData = {
        position: object.position,
        rotation: {
            x: THREE.MathUtils.radToDeg(object.rotation.x),
            y: THREE.MathUtils.radToDeg(object.rotation.y),
            z: THREE.MathUtils.radToDeg(object.rotation.z)
        }
    };
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
        ws.send("close");
        ws.close();
    }
}

// Add an event listener for the "beforeunload" event
window.addEventListener("beforeunload", () => {
    closeWebSocketConnection();
});

const isWebGLClient = true;

// When the WebSocket connection is opened
ws.addEventListener('open', () => {
    const clientTypeMessage = {
        type: 'webgl',
        isWebGLClient: isWebGLClient
    };
    ws.send(JSON.stringify(clientTypeMessage));
});


animate();
