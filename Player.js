import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export class Player {
    constructor(scene) {
        this.scene = scene;
        this.mesh = new THREE.Group(); // Container
        this.model = null; // The actual GLB model
        this.scene.add(this.mesh);
        
        this.currentLane = 0; // -1 (left), 0 (center), 1 (right)
        this.laneWidth = 4;
        
        // Movement state
        this.targetX = 0;
        this.isJumping = false;
        this.isRolling = false;
        this.verticalVelocity = 0;
        this.gravity = -0.05;
        this.jumpForce = 0.9; 
        this.groundY = 1; 
        this.runBob = 0;
        this.jumpCount = 0;
        this.maxJumps = 2; 
        
        // Input handling
        this.lastInput = { left: false, right: false, up: false, down: false };

        this.init();
    }

    init() {
        this.mesh.position.set(0, this.groundY, 0);
        
        // Load GLTF Model
        const loader = new GLTFLoader();
        loader.load('assets/model/etrian_odyssey_3_monk.glb', (gltf) => {
            this.model = gltf.scene;
            
            // Normalize scale and position
            this.model.scale.set(1.5, 1.5, 1.5); // Adjust based on model size
            this.model.position.y = 0; 
            this.model.rotation.y = Math.PI; // Face forward (usually models face +Z, we run -Z? Checks needed)
            
            // Shadows
            this.model.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });
            
            this.mesh.add(this.model);
            
            // Animation Mixer setup if model has animations
            this.mixer = new THREE.AnimationMixer(this.model);
            // console.log(gltf.animations); 
            
        }, undefined, (error) => {
            console.error('An error happened loading the model:', error);
            // Fallback to simple box if fail
            const geo = new THREE.BoxGeometry(1, 2, 1);
            const mat = new THREE.MeshPhongMaterial({ color: 0xff00ff });
            this.model = new THREE.Mesh(geo, mat);
            this.mesh.add(this.model);
        });
    }

    update(dt, input) {
        this.handleInput(input);
        this.applyPhysics();
        this.updatePosition();
    }

    handleInput(input) {
        // Lane Switching (Trigger only on new press)
        if (input.left && !this.lastInput.left) {
            this.changeLane(-1);
        }
        if (input.right && !this.lastInput.right) {
            this.changeLane(1);
        }

        // Jumping
        if (input.up && !this.lastInput.up && !this.isRolling) {
            if (this.jumpCount < this.maxJumps) {
                this.jump();
            }
        }

        // Rolling
        if (input.down && !this.lastInput.down && !this.isRolling) {
            if (this.isJumping) {
                // Fast fall
                this.verticalVelocity = -0.8;
            } else {
                this.roll();
            }
        }

        // Save input for "just pressed" check
        this.lastInput = { ...input };
    }

    changeLane(direction) {
        const newLane = this.currentLane + direction;
        if (newLane >= -1 && newLane <= 1) {
            this.currentLane = newLane;
            this.targetX = this.currentLane * this.laneWidth;
        }
    }

    jump() {
        this.isJumping = true;
        this.verticalVelocity = this.jumpForce;
        this.jumpCount++;
    }

    setJumpMultiplier(multiplier) {
        this.jumpForce = 0.8 * multiplier;
    }

    roll() {
        this.isRolling = true;
        
        // Model Roll Logic
        // For static model, maybe rotate x -90? or Scale down Y?
        if (this.model) {
            this.model.scale.y = 0.75; // Duck
            this.model.position.y = -0.5;
        }
        
        setTimeout(() => {
            this.isRolling = false;
            if (this.model) {
                this.model.scale.y = 1.5; // Reset (assuming 1.5 was original scale in init)
                this.model.position.y = 0;
            }
        }, 800);
    }

    applyPhysics() {
        if (this.isFlying) {
            // Flight Logic: Smoothly move to flight height
            this.mesh.position.y += (5 - this.mesh.position.y) * 0.1;
            this.verticalVelocity = 0;
            return;
        }

        // Apply gravity always if in air
        if (this.isJumping || this.mesh.position.y > this.groundY + 0.1) {
             this.mesh.position.y += this.verticalVelocity;
             this.verticalVelocity += this.gravity;

             // Ground Collision
             if (this.mesh.position.y <= this.groundY) {
                 this.mesh.position.y = this.groundY;
                 this.verticalVelocity = 0;
                 this.isJumping = false;
                 this.jumpCount = 0;
             }
        }
    }
    
    setFlying(active) {
        this.isFlying = active;
        if (active) {
            this.verticalVelocity = 0;
            this.isJumping = false;
            this.isRolling = false;
        } else {
            // Drop down logic will be handled by gravity resuming
        }
    }

    updatePosition() {
        // Smooth Lane Transition
        this.mesh.position.x += (this.targetX - this.mesh.position.x) * 0.2;

        // Run Bobbing and Limb Animation
        if (this.isJumping) {
            // Spin while jumping
            if (this.model) this.model.rotation.y += 0.2;
            
        } else if (!this.isRolling) {
            // Reset rotation on ground
            if (this.model) this.model.rotation.y = Math.PI; // Face forward
            
            this.runBob += 0.3;
        } else {
            // Rolling
             if (this.model) this.model.rotation.y = Math.PI;
        }
    }

    getBoundingBox() {
        this.mesh.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(this.mesh);
        
        // Shrink width and depth for forgiving movement, but KEEP HEIGHT for accurate ground detection
        const widthShrink = 0.4;
        const depthShrink = 0.4;
        
        box.min.x += widthShrink / 2;
        box.max.x -= widthShrink / 2;
        box.min.z += depthShrink / 2;
        box.max.z -= depthShrink / 2;
        
        // Do NOT shrink Y, or we float above obstacles
        
        return box;
    }
}
