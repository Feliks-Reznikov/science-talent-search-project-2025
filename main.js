import * as THREE from 'three';

// 1. Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xaaaaaa); // Light gray background

// 2. Camera
const camera = new THREE.PerspectiveCamera( 
    75, // Field of View (degrees)
    window.innerWidth / window.innerHeight, // Aspect Ratio
    0.1, // Near clipping plane
    1000 // Far clipping plane
);
camera.position.z = 5; // Move camera back

// 3. Renderer
const renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement ); // Add canvas to page

// 4. Geometry & Material (e.g., a cube)
const geometry = new THREE.BoxGeometry( 1, 1, 1 ); // width, height, depth
const material = new THREE.MeshBasicMaterial( { color: 0x00ff00 } ); // Green

// 5. Mesh (Object)
const cube = new THREE.Mesh( geometry, material );
scene.add( cube ); // Add cube to the scene

// Handle window resizing
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}, false);

// 6. Animation Loop
function animate() {
	requestAnimationFrame( animate ); // Request next frame

	// Animate the cube (optional)
	cube.rotation.x += 0.01;
	cube.rotation.y += 0.01;

	renderer.render( scene, camera ); // Render the scene
}

animate(); // Start the loop