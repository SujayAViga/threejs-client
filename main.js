import * as THREE from 'three';
import {PointerLockControls} from 'three/examples/jsm/controls/PointerLockControls';

// socket code
const ws = new WebSocket('ws://localhost:8080/');
console.log(ws.readyState); 
const uid = generateRandomString()
// socket code

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
// const helper = new THREE.CameraHelper( camera );
// scene.add( helper );

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);


const light1 = new THREE.PointLight({ color: "white" }, 1);
light1.position.set(0, 3, 2);
light1.castShadow = true;
light1.shadow.mapSize.width = 1024;
light1.shadow.mapSize.height = 1024;
light1.shadow.radius = 5;
scene.add(light1);

const cube = new THREE.BoxGeometry(1, 1, 1);
const cubeMat = new THREE.MeshStandardMaterial({ color: 0xff0000 });
cubeMat.roughness = 0.4;
const cubeMesh = new THREE.Mesh(cube, cubeMat);
// cubeMesh.position.y = -0.5
cubeMesh.castShadow = true;
scene.add(cubeMesh);

const base = new THREE.PlaneGeometry(5, 5);
const baseMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
baseMat.roughness = 0.4;
const baseMesh = new THREE.Mesh(base, baseMat);
baseMesh.receiveShadow = true;
baseMesh.translateY(-1.0);
baseMesh.rotateX(-Math.PI / 2);

scene.add(baseMesh);

const pointLight1 = new THREE.PointLight('white',4,5,3);
pointLight1.position.y = 0
pointLight1.position.z = -2
scene.add(pointLight1);

const pointLight2 = new THREE.PointLight('white',4,5,3);
pointLight1.position.y = 0
pointLight1.position.z = 2
scene.add(pointLight2);

const pointLight3 = new THREE.PointLight('white',4,5,3);
pointLight1.position.y = 0
pointLight1.position.x = -2
scene.add(pointLight3);






// camera.position.z = 5;

// socket code
const position = new THREE.Vector3(); // Store the last position
const rotation = new THREE.Euler(); // Store the last rotation
// socket code

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

	velocity.x -= velocity.x * 100.0 * delta;
	velocity.z -= velocity.z * 100.0 * delta;

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
    requestAnimationFrame( animate );
    updateFPSControls();
  
	renderer.render( scene, camera );
    // Send position and rotation to Unity if the object's properties change
    
    // socket code in animate
    // if (!camera.position.equals(position) && !camera.rotation.equals(rotation)) {
        position.copy(camera.position);
        rotation.copy(camera.rotation);
        sendPositionAndRotationToUnity(camera);
        // console.log(objectData.transformData.rotation.x);
    // }
    // socket code in animate

  renderer.info.reset()

    
}

// socket code
// Function to send position and rotation data to Unity
function sendPositionAndRotationToUnity(object) {
    // Convert Euler rotation to Quaternion
    const quaternion = new THREE.Quaternion();
    quaternion.setFromEuler(object.rotation);

    const objectData = {
        header: {
            type: "transforms",
            id: uid
        },
        transformData: {
            position: object.position,
            rotation: {
                x: quaternion.x,
                y: quaternion.y,
                z: -quaternion.z,
                w: -quaternion.w
            }
        }
    };
    console.log(camera.rotation.x);
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

//   socket code

animate();
