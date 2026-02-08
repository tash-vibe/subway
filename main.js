import * as THREE from 'three';
import { InputManager } from './InputManager.js';
import { Player } from './Player.js';
import { WorldManager, createTrainMesh } from './World.js';
import { AudioManager } from './AudioManager.js';

// Game Configuration
const CONFIG = {
    laneWidth: 4,
    speed: 20, // Faster
    colors: {
        sky: 0x87CEEB,
        ground: 0x333333,
        fog: 0x87CEEB // Match sky for seamless horizon
    }
};

class Game {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.player = null;
        this.inputManager = null;
        this.audioManager = new AudioManager();
        this.clock = new THREE.Clock();
        this.isGameOver = false;
        this.isGameActive = false;
        this.isPaused = false;
        this.isBoosting = false;
        this.coinScore = 0;
        
        this.init();
        this.animate();
    }

    init() {
        // Scene setup
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(CONFIG.colors.sky);
        this.scene.fog = new THREE.Fog(CONFIG.colors.fog, 40, 150);

        // Camera setup
        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
        // Camera will be controlled in animate to follow player

        // Renderer setup
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        document.body.appendChild(this.renderer.domElement);

        // Lighting
        const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
        this.scene.add(hemiLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight.position.set(20, 30, 10);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 1024;
        dirLight.shadow.mapSize.height = 1024;
        dirLight.shadow.camera.near = 0.5;
        dirLight.shadow.camera.far = 50;
        dirLight.shadow.camera.left = -20;
        dirLight.shadow.camera.right = 20;
        dirLight.shadow.camera.top = 20;
        dirLight.shadow.camera.bottom = -20;
        this.scene.add(dirLight);

        // Ground (Infinite scrolling illusion or standard big plane for now)
        // For an endless runner, we usually move the floor or move the player.
        // Moving the player is easier for physics, moving the world is easier for floating point precision.
        // Let's move the player and recycle world chunks.
        const gridHelper = new THREE.GridHelper(200, 50, 0x000000, 0x000000);
        gridHelper.position.y = 0.01;
        this.scene.add(gridHelper);

        // Ground is handled by WorldManager chunks

        // Entities
        this.player = new Player(this.scene);
        this.inputManager = new InputManager();
        this.worldManager = new WorldManager(this.scene);

        // Remove loading screen
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
             // Just hide it, start screen is on top
            loadingScreen.style.display = 'none';
        }

        // Event Listeners
        // Event Listeners
        // Event Listeners
        window.addEventListener('resize', () => this.onWindowResize(), false);
        window.addEventListener('keydown', (e) => {
            if (e.code === 'Escape' || e.code === 'KeyP') {
                this.togglePause();
            }

            if (!this.isGameActive && !this.isGameOver && !this.isCutsceneActive) {
                // Initialize Audio Context on user interaction
                this.audioManager.init();
                this.startGame();
            }
        });

        // Pause Button Logic
        const pauseBtn = document.getElementById('pause-btn');
        if (pauseBtn) pauseBtn.addEventListener('click', (e) => {
            console.log("Pause button clicked!");
            this.togglePause();
            e.target.blur(); 
        });

        const resumeBtn = document.getElementById('resume-btn');
        if (resumeBtn) resumeBtn.addEventListener('click', () => {
             console.log("Resume button clicked!");
            this.togglePause();
        });

        // Volume Sliders
        const bgmSlider = document.getElementById('bgm-slider');
        if (bgmSlider) {
            bgmSlider.addEventListener('input', (e) => {
                this.audioManager.setBGMVolume(parseFloat(e.target.value));
            });
        }
        
        const sfxSlider = document.getElementById('sfx-slider');
        if (sfxSlider) {
             sfxSlider.addEventListener('input', (e) => {
                this.audioManager.setSFXVolume(parseFloat(e.target.value));
            });
        }

        // Init stats display
        const gamesPlayed = localStorage.getItem('gamesPlayed') || '0';
        const countDisplay = document.getElementById('games-played-count');
        if (countDisplay) countDisplay.innerText = gamesPlayed;
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    togglePause() {
        console.log("Toggle Pause called. Active:", this.isGameActive, "GameOver:", this.isGameOver, "CurrentlyPaused:", this.isPaused);
        if (!this.isGameActive || this.isGameOver) {
             console.log("Ignored pause toggle.");
             return;
        }
        
        this.isPaused = !this.isPaused;
        const overlay = document.getElementById('pause-overlay');
        const pauseBtn = document.getElementById('pause-btn');
        
        if (this.isPaused) {
            this.clock.stop();
            if (overlay) overlay.style.display = 'flex';
            if (pauseBtn) pauseBtn.style.display = 'none';
        } else {
            this.clock.start();
            if (overlay) overlay.style.display = 'none';
            if (pauseBtn) pauseBtn.style.display = 'block';
        }
    }

    startGame() {
        const startScreen = document.getElementById('start-screen');
        if (startScreen) startScreen.style.display = 'none';
        
        const loading = document.getElementById('loading-screen');
        if (loading) loading.style.display = 'none';

        // Games Played Counter
        let gamesPlayed = parseInt(localStorage.getItem('gamesPlayed') || '0');
        gamesPlayed++;
        localStorage.setItem('gamesPlayed', gamesPlayed);
        
        const countDisplay = document.getElementById('games-played-count');
        if (countDisplay) countDisplay.innerText = gamesPlayed;

        this.audioManager.init(); // Ensure init
        this.audioManager.playCutsceneBGM(); // Start Drone Music
        this.startCutscene();
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        
        if (this.isPaused) return;

        const delta = this.clock.getDelta();
        const input = this.inputManager.getAction(); // Get Input

        // Game Over Restart Logic
        if (this.isGameOver) {
            if (input.boost || input.up) { // Space or Up to restart
                location.reload();
            }
            return;
        }

        if (this.isCutsceneActive) {
            this.updateCutscene(delta);
            this.renderer.render(this.scene, this.camera);
            return;
        }
        
        if (!this.isGameActive) return;
        
        // Sound Triggers for Jump
        if (input.up && !this.player.isJumping && !this.player.isFlying && this.player.mesh.position.y <= this.player.groundY + 0.1) {
            this.audioManager.playSFX('jump');
        }

        // Player Logic
        this.player.update(delta, input);

        // Speed Control
        // Base speed increases with distance
        const distance = Math.abs(this.player.mesh.position.z);
        let baseSpeed = CONFIG.speed + (distance * 0.05); // Increase by 5 every 100m
        
        // Cap speed to avoid broken physics (e.g., max 50 base)
        if (baseSpeed > 60) baseSpeed = 60;

        let currentSpeed = baseSpeed;
        
        // Boost Logic (Multiplies the ALREADY scaled speed)
        if (input.boost) {
            if (!this.isBoosting) {
                this.audioManager.playSFX('boost');
                this.isBoosting = true;
            }
            currentSpeed *= 1.5; // Faster, but controllable
        } else {
            this.isBoosting = false;
        }

        // Move Player Forward
        this.player.mesh.position.z -= currentSpeed * delta;
        
        // Move Departing Train
        this.updateDepartingTrain(delta, currentSpeed);
        
        // Update World
        this.worldManager.update(this.player.mesh.position.z);

        // Check Collisions
        this.checkCollisions(delta);

        // Powerup Updates
        if (this.isMagnetActive) {
            this.updateMagnet(delta);
        }
        if (this.isJetpackActive) {
            this.jetpackTimer -= delta;
            if (this.jetpackTimer <= 0) {
                this.deactivateJetpack();
            }
        }
        if (this.isMultiplierActive) {
            this.multiplierTimer -= delta;
            if (this.multiplierTimer <= 0) {
                this.isMultiplierActive = false;
                this.scoreMultiplier = 1;
                this.updatePowerupUI();
            }
        }

        // Camera Follow
        let camTargetY = this.player.mesh.position.y + 4;
        let camTargetZ = this.player.mesh.position.z + 8;
        
        if (this.isJetpackActive) {
            camTargetY = this.player.mesh.position.y + 6; // Higher camera
            camTargetZ = this.player.mesh.position.z + 12; // Further back
        }

        this.camera.position.x = this.player.mesh.position.x * 0.3; 
        this.camera.position.y += (camTargetY - this.camera.position.y) * 0.1;
        this.camera.position.z = camTargetZ;
        this.camera.lookAt(this.player.mesh.position.x, this.player.mesh.position.y + 1, this.player.mesh.position.z - 5);

        this.renderer.render(this.scene, this.camera);
        
        // Update Score (Distance based)
        this.updateUI();
    }

    checkCollisions(delta) {
        if (this.isGameOver) return;

        const playerBox = this.player.getBoundingBox();

        // Obstacles (Skip if flying)
        if (!this.player.isFlying) {
            const obstacles = this.worldManager.getObstacles();
            this.player.groundY = 1; 

            for (const obs of obstacles) {
                const obsBox = obs.box;
                
                // 1. Check Horizontal Intersection (X and Z)
                const overlapX = playerBox.max.x > obsBox.min.x && playerBox.min.x < obsBox.max.x;
                const overlapZ = playerBox.max.z > obsBox.min.z && playerBox.min.z < obsBox.max.z;
                
                if (overlapX && overlapZ) {
                    const playerBottom = playerBox.min.y;
                    const obsTop = obsBox.max.y;
                    
                    if (playerBottom >= obsTop - 1.0 && this.player.verticalVelocity <= 0.1) {
                        if (obsTop > this.player.groundY) {
                            this.player.groundY = obsTop;
                        }
                    } 
                    else {
                        const overlapY = playerBox.max.y > obsBox.min.y && playerBox.min.y < obsBox.max.y;
                        if (overlapY) {
                             console.log("Crash!");
                             this.audioManager.playSFX('crash'); // Play Crash
                             this.gameOver();
                             return;
                        }
                    }
                }
            }
            
            // Special Collision Check for Departing Train
            if (this.departingTrain) {
                const trainBox = new THREE.Box3().setFromObject(this.departingTrain);
                const overlapX = playerBox.max.x > trainBox.min.x && playerBox.min.x < trainBox.max.x;
                const overlapZ = playerBox.max.z > trainBox.min.z && playerBox.min.z < trainBox.max.z;
                
                if (overlapX && overlapZ) {
                    const playerBottom = playerBox.min.y;
                    const trainTop = trainBox.max.y;
                    
                    if (playerBottom >= trainTop - 1.5 && this.player.verticalVelocity <= 0.1) { // Wider tolerance for catch
                         if (trainTop > this.player.groundY) {
                             this.player.groundY = trainTop;
                             
                             // Trigger Boost if not already boosting!
                             if (!this.isTrainBoosting) {
                                 this.isTrainBoosting = true;
                                 this.trainBoostTimer = 4.0; 
                                 this.showDialogue("Hold on!! 4s Boost!");
                                 this.audioManager.playSFX('boost');
                             }
                         }
                    }
                }
            }
        }

        // Check Coins & Powerups
        for (const chunk of this.worldManager.chunks) {
            for (const coin of chunk.coins) {
                if (coin.active) {
                    // Spin the coin
                    coin.mesh.rotation.z += 3 * delta;

                    // Magnet Collision Check (Circle/Range check)
                    if (this.isMagnetActive) {
                        const dist = coin.mesh.position.distanceTo(this.player.mesh.position);
                        if (dist < 10) { // Magnet Range
                             // Move coin explicitly in updateMagnet, but strictly we can mark it "magnetized"
                             coin.mesh.position.lerp(this.player.mesh.position, 10 * delta);
                        }
                    }

                    if (playerBox.intersectsBox(coin.box) || (this.isMagnetActive && coin.mesh.position.distanceTo(this.player.mesh.position) < 1.0)) {
                        // Collect
                        coin.active = false;
                        chunk.mesh.remove(coin.mesh);
                        
                        const type = coin.mesh.userData.type;
                        if (type === 'coin') {
                            this.coinScore += (1 * (this.scoreMultiplier || 1));
                            this.audioManager.playSFX('coin'); // Coin SFX
                        } else {
                            // Powerup SFX
                            this.audioManager.playSFX('powerup');
                            if (type === 'powerup_sneakers') {
                                this.activateSneakers();
                            } else if (type === 'powerup_magnet') {
                                this.activateMagnet();
                            } else if (type === 'powerup_jetpack') {
                                this.activateJetpack();
                            } else if (type === 'powerup_multiplier') {
                                this.activateMultiplier();
                            }
                        }
                        
                        this.updateUI();
                    }
                }
            }
        }
    }

    activateMagnet() {
        this.isMagnetActive = true;
        this.magnetTimer = 10.0;
        this.updatePowerupUI();
        
        // Auto deactivate logic or timer in update
        setTimeout(() => { this.isMagnetActive = false; this.updatePowerupUI(); }, 10000);
    }

    updateMagnet(delta) {
        // Just UI or advanced physics here?
        // Physics is in checkCollisions loop for efficiency
    }

    activateJetpack() {
        this.isJetpackActive = true;
        this.jetpackTimer = 5.0; // Short burst
        this.player.setFlying(true);
        this.updatePowerupUI();
    }

    deactivateJetpack() {
        this.isJetpackActive = false;
        this.player.setFlying(false);
        this.updatePowerupUI();
    }

    activateMultiplier() {
        this.isMultiplierActive = true;
        this.scoreMultiplier = 2;
        this.multiplierTimer = 10.0;
        this.updatePowerupUI();
    }

    updatePowerupUI() {
        const indicator = document.getElementById('powerup-indicator');
        if (!indicator) return;
        
        let text = "";
        if (this.isJetpackActive) text += "🚀 JETPACK! ";
        if (this.isMagnetActive) text += "🧲 MAGNET! ";
        if (this.isMultiplierActive) text += "✖️ 2X SCORE! ";
        
        // Sneakers handled separately but should merge?
        // Let's keep sneakers simple for now or merge later.
        
        indicator.innerText = text;
    }

    activateSneakers() {
        console.log("Super Sneakers Active!");
        this.player.setJumpMultiplier(1.8); 
        this.updatePowerupUI(); // Update UI
        
        setTimeout(() => {
            this.player.setJumpMultiplier(1.0);
             this.updatePowerupUI();
        }, 10000);
    }
    
    updateUI() {
        // Update score display to include coins if needed, or separate counter
        const distScore = Math.floor(Math.abs(this.player.mesh.position.z));
        document.getElementById('score').innerText = `Run: ${distScore} | Coins: ${this.coinScore}`;
        
        // Debug Update
        const dbg = document.getElementById('debug-overlay');
        if (dbg) {
            // Find if we are currently over an obstacle (helper for debug) (Recalculating technically, but cheap)
            // Actually we can just track it in checkCollisions if we wanted, let's just show Z
             dbg.innerHTML = `
                Y: ${this.player.mesh.position.y.toFixed(2)}<br>
                GroundY: ${this.player.groundY.toFixed(2)}<br>
                VelY: ${this.player.verticalVelocity.toFixed(2)}<br>
                Jumping: ${this.player.isJumping}<br>
                Z: ${this.player.mesh.position.z.toFixed(0)}
            `;
        }
    }

    gameOver() {
        this.isGameOver = true;
        console.log("Game Over");
        // Show Game Over Screen
        // Show Game Over Screen
        const ui = document.getElementById('ui-layer');
        const gameOverScreen = document.createElement('div');
        gameOverScreen.id = 'game-over';
        gameOverScreen.innerHTML = `
            <h1>GAME OVER</h1>
            <p>Score: ${document.getElementById('score').innerText}</p>
            <button onclick="location.reload()">Try Again</button>
        `;
        document.body.appendChild(gameOverScreen);
    }

    startCutscene() {
        this.isCutsceneActive = true;
        this.cutsceneTimer = 0;
        
        // Hide UI
        const score = document.getElementById('score');
        if(score) score.style.display = 'none';
        
        // Setup Train
        if (!this.cutsceneTrain) {
            this.cutsceneTrain = createTrainMesh();
            this.cutsceneTrain.position.set(0, 2, -15); // Start on track
            this.scene.add(this.cutsceneTrain);
        }

        // Setup Platform (Station)
        if (!this.cutscenePlatform) {
            const geo = new THREE.BoxGeometry(4, 1, 40);
            const mat = new THREE.MeshLambertMaterial({ color: 0x555555 });
            this.cutscenePlatform = new THREE.Mesh(geo, mat);
            this.cutscenePlatform.position.set(6, 0.5, -10); // Right side
            this.cutscenePlatform.receiveShadow = true;
            this.scene.add(this.cutscenePlatform);
        }
        
        // Setup Player
        this.player.mesh.position.set(0, 1, -5); // Behind train, on track
        this.player.isJumping = false;
        this.player.isRolling = false;
        
        // Camera setup for cutscene
        // Cinematic angle: From platform side
        this.camera.position.set(8, 3, 5); 
        this.camera.lookAt(0, 2, -10);
    }

    updateCutscene(delta) {
        this.cutsceneTimer += delta;
        
        // Dialogue Triggers
        if (!this.cutsceneState) this.cutsceneState = {}; // Init state if needed
        
        if (this.cutsceneTimer > 0.5 && this.cutsceneTimer < 0.6 && !this.cutsceneState.d1) {
            this.showDialogue("Finally, here it is...");
            this.cutsceneState.d1 = true;
        }
        if (this.cutsceneTimer > 1.2 && this.cutsceneTimer < 1.3 && !this.cutsceneState.d2) {
            this.showDialogue("Wait! It's leaving?!"); // Surprise
            this.cutsceneState.d2 = true;
        }
        if (this.cutsceneTimer > 2.5 && this.cutsceneTimer < 2.6 && !this.cutsceneState.d3) {
            this.showDialogue("I have to catch it!"); // Determination
            this.cutsceneState.d3 = true;
        }

        // Train Logic
        if (this.cutsceneTimer > 1.0) {
            // Train starts moving
            const trainSpeed = 15 + (this.cutsceneTimer - 1.0) * 8; // Accelerate faster
            this.cutsceneTrain.position.z -= trainSpeed * delta;
        }
        
        // Player Logic
        if (this.cutsceneTimer > 2.0) {
            // Player starts chasing
            this.player.mesh.position.z -= 12 * delta; 
            
            // Camera follow (Pan to behind)
             this.camera.position.x += (0 - this.camera.position.x) * delta; // Center X
             this.camera.position.y = 4;
             this.camera.position.z = this.player.mesh.position.z + 8;
             this.camera.lookAt(this.cutsceneTrain.position.x, 2, this.cutsceneTrain.position.z);
        }
        
        // Transition Query
        if (this.cutsceneTimer > 4.5 || (this.inputManager.getAction().up)) { // End after 4.5s or jump skip
            this.endCutscene();
        }
    }
    
    showDialogue(text) {
        const box = document.getElementById('dialogue-box');
        if (box) {
            box.innerText = text;
            box.style.display = 'block';
            
            // Auto hide after 2s? Or let next dialogue replace it?
            if (this.dialogueTimeout) clearTimeout(this.dialogueTimeout);
            this.dialogueTimeout = setTimeout(() => {
                box.style.display = 'none';
            }, 3000);
        }
    }

    endCutscene() {
        this.isCutsceneActive = false;
        this.isGameActive = true; 
        
        // Remove Cutscene Objects
        // Keep the train! We want it to move away.
        this.departingTrain = this.cutsceneTrain;
        this.trainTargetX = 0; 
        this.trainBoostCount = 0;
        this.isTrainBoosting = false;
        this.trainBoostTimer = 0;
        
        this.cutsceneTrain = null;
        
        if (this.cutscenePlatform) {
            this.scene.remove(this.cutscenePlatform);
            this.cutscenePlatform = null;
        }
        
        // Show UI
        const score = document.getElementById('score');
        if(score) score.style.display = 'block';

        // Switch to Gameplay Music
        this.audioManager.playGameplayBGM();
    }

    updateDepartingTrain(delta, currentSpeed) {
        if (!this.departingTrain) return;

        const playerZ = this.player.mesh.position.z;
        const trainZ = this.departingTrain.position.z;
        const dist = Math.abs(playerZ - trainZ);

        // Boost Logic
        if (this.isTrainBoosting) {
            this.trainBoostTimer -= delta;
            if (this.trainBoostTimer <= 0) {
                this.isTrainBoosting = false;
            }
        } 
        
        // Removed distance-based trigger (boost only on collision)

        let trainSpeed;
        if (this.isTrainBoosting) {
             trainSpeed = currentSpeed + 5.0; // Fast ride!
        } else {
             // Normal: Slower than player (was -0.001, user wants faster -> -2.0)
             trainSpeed = currentSpeed - 2.0; 
        }

        // Apply Movement
        this.departingTrain.position.z -= trainSpeed * delta;

        // 2. Lane Switching Logic (AI)
        if (this.trainTargetX === undefined) this.trainTargetX = 0;

        const lookAheadDist = 40; // Look ahead
        // const trainZ = this.departingTrain.position.z; // update var
        const currentLaneX = this.trainTargetX;
        
        // Find obstacles
        // Optimization: checks all, which is fine for small world
        const obstacles = this.worldManager.getObstacles(); 

        let blocked = false;
        for (const obs of obstacles) {
             // Check if object is ahead of train roughly
             if (obs.mesh.position.z < this.departingTrain.position.z && obs.mesh.position.z > this.departingTrain.position.z - lookAheadDist) {
                 // Check X: collision width approx 2
                 if (Math.abs(obs.mesh.position.x - currentLaneX) < 2) {
                     blocked = true;
                     break;
                 }
             }
        }

        if (blocked) {
            // Need to switch!
            // Potential lanes: -4, 0, 4
            const candidates = [-4, 0, 4].filter(x => x !== currentLaneX);
            
            let bestLane = currentLaneX; // Default to stay (crash) if trapped
            
            for (const lane of candidates) {
                let laneBlocked = false;
                 for (const obs of obstacles) {
                     if (obs.mesh.position.z < this.departingTrain.position.z && obs.mesh.position.z > this.departingTrain.position.z - lookAheadDist) {
                         if (Math.abs(obs.mesh.position.x - lane) < 2) {
                             laneBlocked = true;
                             break;
                         }
                     }
                 }
                 
                 if (!laneBlocked) {
                     bestLane = lane;
                     break; 
                 }
            }
            
            if (bestLane !== currentLaneX) {
                this.trainTargetX = bestLane;
            }
        }

        // 3. Smooth Lerp X
        if (this.trainTargetX !== undefined) {
             // Lerp speed
             this.departingTrain.position.x += (this.trainTargetX - this.departingTrain.position.x) * 5 * delta;
             
             // Tilt train for effect (banking)
             const tilt = (this.departingTrain.position.x - this.trainTargetX) * 0.1;
             this.departingTrain.rotation.z = tilt;
        }

        // Cleanup if too far (increased range so we can enjoy the show)
        // If player passes train (playerZ < trainZ), we still keep it until it's far behind?
        // Or if train is far ahead? 
        // Logic: |player - train| > 300
        if (Math.abs(this.player.mesh.position.z - this.departingTrain.position.z) > 300) {
             this.scene.remove(this.departingTrain);
             this.departingTrain = null;
        }
    }
}

// Start Game
new Game();
