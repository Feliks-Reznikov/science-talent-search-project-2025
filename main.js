import * as THREE from 'three';
        import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

        // DOM Elements for Gas A
        const particleCountASlider = document.getElementById('particleCountA');
        const temperatureASlider = document.getElementById('temperatureA');
        const particleMassASlider = document.getElementById('particleMassA');
        const particleCountAValueSpan = document.getElementById('particleCountAValue');
        const temperatureAValueSpan = document.getElementById('temperatureAValue');
        const particleMassAValueSpan = document.getElementById('particleMassAValue');

        // DOM Elements for Gas B
        const particleCountBSlider = document.getElementById('particleCountB');
        const temperatureBSlider = document.getElementById('temperatureB');
        const particleMassBSlider = document.getElementById('particleMassB');
        const particleCountBValueSpan = document.getElementById('particleCountBValue');
        const temperatureBValueSpan = document.getElementById('temperatureBValue');
        const particleMassBValueSpan = document.getElementById('particleMassBValue');
        
        const resetButton = document.getElementById('resetButton');
        const startButton = document.getElementById('startButton');
        const simulationContainer = document.getElementById('simulationContainer');

        let scene, camera, renderer, orbitControls, clock;
        let particles = []; 
        let dividingWall;
        let simulationRunning = false;

        const BOX_SIZE = 10;
        const BOX_HALF_SIZE = BOX_SIZE / 2;
        const FACTOR_A = 0.05 / Math.cbrt(10);
        const FACTOR_B = 0.05 / Math.cbrt(20);
        const PARTICLE_RADIUS_A = Math.cbrt(particleMassASlider.value) * FACTOR_A;
        const PARTICLE_RADIUS_B = Math.cbrt(particleMassBSlider.value) * FACTOR_B;
        const VELOCITY_SCALING_CONSTANT = 0.05;
        const SIMULATION_SPEED_MULTIPLIER = 5;

        let particleGeometryA, particleGeometryB; // Reusable geometry
        let particleMaterialA, particleMaterialB; // Materials for each gas type

        function init() {
            scene = new THREE.Scene();
            scene.background = new THREE.Color(0x1f2937); // Tailwind gray-800

            camera = new THREE.PerspectiveCamera(75, simulationContainer.clientWidth / simulationContainer.clientHeight, 0.1, 1000);
            camera.position.set(BOX_SIZE * 0.75, BOX_SIZE * 0.75, BOX_SIZE * 1.5);
            camera.lookAt(0, 0, 0);

            renderer = new THREE.WebGLRenderer({ antialias: true });
            renderer.setSize(simulationContainer.clientWidth, simulationContainer.clientHeight);
            renderer.setPixelRatio(window.devicePixelRatio);
            simulationContainer.appendChild(renderer.domElement);

            clock = new THREE.Clock();

            const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
            scene.add(ambientLight);
            const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
            directionalLight.position.set(5, 10, 7.5);
            scene.add(directionalLight);

            orbitControls = new OrbitControls(camera, renderer.domElement);
            orbitControls.enableDamping = true;
            orbitControls.dampingFactor = 0.05;
            orbitControls.target.set(0, 0, 0);

            const boxGeometry = new THREE.BoxGeometry(BOX_SIZE, BOX_SIZE, BOX_SIZE);
            const boxEdges = new THREE.EdgesGeometry(boxGeometry);
            const boxMaterial = new THREE.LineBasicMaterial({ color: 0x6b7280 });
            const wireframeBox = new THREE.LineSegments(boxEdges, boxMaterial);
            scene.add(wireframeBox);

            // Particle Geometries and Materials
            particleGeometryA = new THREE.SphereGeometry(PARTICLE_RADIUS_A, 10, 8);
            particleGeometryB = new THREE.SphereGeometry(PARTICLE_RADIUS_B);
            particleMaterialA = new THREE.MeshStandardMaterial({ color: 0xff0000, roughness: 0.4, metalness: 0.2 }); // Red
            particleMaterialB = new THREE.MeshStandardMaterial({ color: 0x0000ff, roughness: 0.4, metalness: 0.2 }); // Blue

            // Dividing Wall
            const wallGeometry = new THREE.PlaneGeometry(BOX_SIZE, BOX_SIZE);
            const wallMaterial = new THREE.MeshBasicMaterial({ 
                color: 0xaaaaaa, 
                side: THREE.DoubleSide, 
                transparent: true, 
                opacity: 0.3 
            });
            dividingWall = new THREE.Mesh(wallGeometry, wallMaterial);
            dividingWall.rotation.y = Math.PI / 2; // Rotate to stand vertically along YZ plane at X=0
            // scene.add(dividingWall); // Added in resetSimulation

            // Event Listeners
            setupEventListeners();
            
            resetSimulation(); // Initial setup
            animate();
        }

        function setupEventListeners() {
            // Gas A listeners
            particleCountASlider.addEventListener('input', () => particleCountAValueSpan.textContent = particleCountASlider.value);
            temperatureASlider.addEventListener('input', () => temperatureAValueSpan.textContent = temperatureASlider.value);
            particleMassASlider.addEventListener('input', () => particleMassAValueSpan.textContent = particleMassASlider.value);
            // Gas B listeners
            particleCountBSlider.addEventListener('input', () => particleCountBValueSpan.textContent = particleCountBSlider.value);
            temperatureBSlider.addEventListener('input', () => temperatureBValueSpan.textContent = temperatureBSlider.value);
            particleMassBSlider.addEventListener('input', () => particleMassBValueSpan.textContent = particleMassBSlider.value);

            resetButton.addEventListener('click', resetSimulation);
            startButton.addEventListener('click', startSimulation);
            window.addEventListener('resize', onWindowResize);
        }
        
        function resetSimulation() {
            simulationRunning = false;
            startButton.disabled = false;
            startButton.classList.remove('opacity-50', 'cursor-not-allowed');
            startButton.classList.add('hover:bg-green-600');

            // Clear existing particles
            particles.forEach(p => scene.remove(p.mesh));
            particles = [];

            // Recalculate radii and recreate geometries
            const massA = Math.max(0.1, parseFloat(particleMassASlider.value));
            const massB = Math.max(0.1, parseFloat(particleMassBSlider.value));
            window.PARTICLE_RADIUS_A = Math.cbrt(massA) * 0.1;
            window.PARTICLE_RADIUS_B = Math.cbrt(massB) * 0.1;
            particleGeometryA = new THREE.SphereGeometry(window.PARTICLE_RADIUS_A, 10, 8);
            particleGeometryB = new THREE.SphereGeometry(window.PARTICLE_RADIUS_B);

            // Add dividing wall if not already present (or make visible)
            if (!scene.children.includes(dividingWall)) {
                scene.add(dividingWall);
            }
            dividingWall.visible = true;

            // Create Gas A particles
            createParticlesForGas(
                parseInt(particleCountASlider.value),
                parseFloat(temperatureASlider.value),
                massA,
                particleMaterialA,
                'A'
            );
            // Create Gas B particles
            createParticlesForGas(
                parseInt(particleCountBSlider.value),
                parseFloat(temperatureBSlider.value),
                massB,
                particleMaterialB,
                'B'
            );
        }

        function createParticlesForGas(count, temperature, mass, material, type) {
            for (let i = 0; i < count; i++) {
                const geometry = type === 'A' ? particleGeometryA : particleGeometryB;
                const particleMesh = new THREE.Mesh(geometry, material);
                
                // Initial position based on type
                let xPos;
                if (type === 'A') { // Gas A in negative X half
                    xPos = (Math.random() * BOX_HALF_SIZE * 0.9) - (BOX_HALF_SIZE * 0.95) + PARTICLE_RADIUS_A; 
                } else { // Gas B in positive X half
                    xPos = (Math.random() * BOX_HALF_SIZE * 0.9) + (BOX_HALF_SIZE * 0.05) - PARTICLE_RADIUS_B;
                }
                // Ensure particles are not spawned exactly on the wall edge
                xPos = Math.max(-BOX_HALF_SIZE + Math.max(PARTICLE_RADIUS_A, PARTICLE_RADIUS_B) * 2, Math.min(BOX_HALF_SIZE - Math.min(PARTICLE_RADIUS_A, PARTICLE_RADIUS_B) * 2, xPos));


                particleMesh.position.set(
                    xPos,
                    (Math.random() - 0.5) * BOX_SIZE * 0.95,
                    (Math.random() - 0.5) * BOX_SIZE * 0.95
                );

                const velocity = new THREE.Vector3(
                    Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5
                ).normalize();
                const speedRandomnessFactor = (Math.random() * 0.4) + 0.8;
                const speedMagnitude = VELOCITY_SCALING_CONSTANT * Math.sqrt(temperature / mass) * speedRandomnessFactor;
                velocity.multiplyScalar(speedMagnitude);

                particles.push({ mesh: particleMesh, velocity: velocity, type: type });
                scene.add(particleMesh);
            }
        }

        function startSimulation() {
            simulationRunning = true;
            if (dividingWall) dividingWall.visible = false; // Hide wall
            startButton.disabled = true;
            startButton.classList.add('opacity-50', 'cursor-not-allowed');
            startButton.classList.remove('hover:bg-green-600');
        }

        function animate() {
            requestAnimationFrame(animate);
            const deltaTime = clock.getDelta();

            if (simulationRunning) {
                particles.forEach(p => {
                    p.mesh.position.add(p.velocity.clone().multiplyScalar(deltaTime * SIMULATION_SPEED_MULTIPLIER));

                     // Use correct radius for each particle type
                    const radius = p.type === 'A' ? PARTICLE_RADIUS_A : PARTICLE_RADIUS_B;

                    if (Math.abs(p.mesh.position.x) > BOX_HALF_SIZE - radius) {
                        p.mesh.position.x = Math.sign(p.mesh.position.x) * (BOX_HALF_SIZE - radius);
                        p.velocity.x *= -1;
                    }
                    if (Math.abs(p.mesh.position.y) > BOX_HALF_SIZE - radius) {
                        p.mesh.position.y = Math.sign(p.mesh.position.y) * (BOX_HALF_SIZE - radius);
                        p.velocity.y *= -1;
                    }
                    if (Math.abs(p.mesh.position.z) > BOX_HALF_SIZE - radius) {
                        p.mesh.position.z = Math.sign(p.mesh.position.z) * (BOX_HALF_SIZE - radius);
                        p.velocity.z *= -1;
                        }
                });
            }

            orbitControls.update();
            renderer.render(scene, camera);
        }

        function onWindowResize() {
            if (!camera || !renderer || !simulationContainer) return;
            const newWidth = simulationContainer.clientWidth;
            const newHeight = simulationContainer.clientHeight;

            camera.aspect = newWidth / newHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(newWidth, newHeight);
        }
        
        document.addEventListener('DOMContentLoaded', () => {
            // Initialize slider display values
            particleCountAValueSpan.textContent = particleCountASlider.value;
            temperatureAValueSpan.textContent = temperatureASlider.value;
            particleMassAValueSpan.textContent = particleMassASlider.value;
            particleCountBValueSpan.textContent = particleCountBSlider.value;
            temperatureBValueSpan.textContent = temperatureBSlider.value;
            particleMassBValueSpan.textContent = particleMassBSlider.value;
            
            init();
        });
