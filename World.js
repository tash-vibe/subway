import * as THREE from 'three';
import { TextureGenerator } from './TextureGenerator.js';

const CONFIG = {
    chunkLength: 50, // Length of one world chunk
    renderDistance: 5, // Number of chunks to keep ahead
    laneWidth: 4
};

// Asset Loading
const loader = new THREE.TextureLoader();
const loadTex = (path) => {
    const tex = loader.load(path);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
};

const MATS = {
    ground: new THREE.MeshLambertMaterial({ map: loadTex('assets/images/ground_texture_1770511174608.png') }),
    wall: new THREE.MeshLambertMaterial({ map: loadTex('assets/images/wall_texture_1770511230242.png') }),
    crate: new THREE.MeshLambertMaterial({ map: loadTex('assets/images/crate_texture_1770510315845.png') }),
    train: new THREE.MeshLambertMaterial({ map: loadTex('assets/images/train_texture_1770510304067.png') }),
    coin: new THREE.MeshPhongMaterial({ map: loadTex('assets/images/gold_coin_1770510426541.png'), color: 0xffffff }),
    // Powerups
    magnet: new THREE.MeshPhongMaterial({ map: loadTex('assets/images/icon_magnet_1770569683023.png'), transparent: true, color: 0xffffff }),
    jetpack: new THREE.MeshPhongMaterial({ map: loadTex('assets/images/icon_jetpack_1770569695378.png'), transparent: true, color: 0xffffff }),
    multiplier: new THREE.MeshPhongMaterial({ map: loadTex('assets/images/icon_multiplier_1770569707982.png'), transparent: true, color: 0xffffff }),
    // Track Materials
    rail: new THREE.MeshPhongMaterial({ color: 0x888888, shininess: 100 }), // Silver/Grey
    sleeper: new THREE.MeshLambertMaterial({ color: 0x553311 }), // Dark Wood
    trackBed: new THREE.MeshLambertMaterial({ map: (()=>{ const t = new TextureGenerator().createTrackBedTexture(); t.wrapS=THREE.RepeatWrapping; t.wrapT=THREE.RepeatWrapping; t.repeat.set(1, 10); return t; })() }),
    label1: new THREE.MeshBasicMaterial({ map: new TextureGenerator().createNumberTexture(1), transparent: true }),
    label2: new THREE.MeshBasicMaterial({ map: new TextureGenerator().createNumberTexture(2), transparent: true }),
    label3: new THREE.MeshBasicMaterial({ map: new TextureGenerator().createNumberTexture(3), transparent: true })
};

export const createTrainMesh = () => {
    const geo = new THREE.BoxGeometry(3.5, 4, 10);
    const mesh = new THREE.Mesh(geo, MATS.train);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
};

class Chunk {
    constructor(zPos) {
        this.zPos = zPos;
        this.mesh = new THREE.Group();
        this.obstacles = [];
        this.coins = []; // Exposed
        
        this.init();
    }

    init() {
        // Remove Single Floor
        // Create 3 Separate Track Beds
        const laneWidth = 3.8; // Slightly less than 4 to leave gaps
        const bedGeo = new THREE.PlaneGeometry(laneWidth, CONFIG.chunkLength);
        
        const lanes = [-4, 0, 4];
        const labels = [MATS.label1, MATS.label2, MATS.label3];
        
        lanes.forEach((x, index) => {
            // Track Bed
            const bed = new THREE.Mesh(bedGeo, MATS.trackBed);
            bed.rotation.x = -Math.PI / 2;
            bed.position.set(x, 0, this.zPos - CONFIG.chunkLength / 2);
            bed.receiveShadow = true;
            this.mesh.add(bed);
            
            // Track Label (At the start of the chunk)
            // Only spawn labels occasionally or on every chunk? 
            // Every chunk is fine, acts as a "lane marker" on the ground
            const labelGeo = new THREE.PlaneGeometry(2, 2);
            const label = new THREE.Mesh(labelGeo, labels[index]);
            label.rotation.x = -Math.PI / 2;
            label.position.set(x, 0.02, this.zPos - 2); // Start of chunk
            // Ensure visualization above track bed
            this.mesh.add(label);
        });

        // Spawn 3 Lanes of Tracks
        this.spawnTracks();

        // Walls
        const wallGeo = new THREE.BoxGeometry(1, 4, CONFIG.chunkLength);
        
        const leftWall = new THREE.Mesh(wallGeo, MATS.wall);
        leftWall.position.set(-8, 2, this.zPos - CONFIG.chunkLength / 2);
        this.mesh.add(leftWall);

        const rightWall = new THREE.Mesh(wallGeo, MATS.wall);
        rightWall.position.set(8, 2, this.zPos - CONFIG.chunkLength / 2);
        this.mesh.add(rightWall);
        
        // Background Buildings (Simple Boxes on sides)
        const buildingGeo = new THREE.BoxGeometry(10, 30, 20);
        const buildingMat = new THREE.MeshPhongMaterial({ color: 0x111122 }); 
        
        // Left Building
        const leftB = new THREE.Mesh(buildingGeo, buildingMat);
        leftB.position.set(-25, 10, this.zPos - CONFIG.chunkLength / 2);
        this.mesh.add(leftB);
        
        // Right Building
        const rightB = new THREE.Mesh(buildingGeo, buildingMat);
        rightB.position.set(25, 10, this.zPos - CONFIG.chunkLength / 2);
        this.mesh.add(rightB);
        
        // Random Obstacles
        this.spawnObstacles();
    }

    spawnTracks() {
        // Render train tracks for each lane (-4, 0, 4)
        const lanes = [-4, 0, 4];
        
        // Define Geometries for this chunk's tracks
        // Rail: Long thin beam
        const railGeo = new THREE.BoxGeometry(0.2, 0.2, CONFIG.chunkLength);
        // Sleeper: Perpendicular tie
        const sleeperGeo = new THREE.BoxGeometry(2.5, 0.1, 0.5);
        
        lanes.forEach(x => {
            // Rail 1 (Left of lane center)
            const r1 = new THREE.Mesh(railGeo, MATS.rail);
            // Position: x offset, slightly above ground (0.1), center of chunk Z
            r1.position.set(x - 1.2, 0.1, this.zPos - CONFIG.chunkLength / 2);
            r1.castShadow = true;
            this.mesh.add(r1);

            // Rail 2 (Right of lane center)
            const r2 = new THREE.Mesh(railGeo, MATS.rail);
            r2.position.set(x + 1.2, 0.1, this.zPos - CONFIG.chunkLength / 2);
            r2.castShadow = true;
            this.mesh.add(r2);

            // Sleepers
            // Spacing: Every 3 units
            // Start from zPos (front) to zPos - Length (back)
            for (let zOffset = 0; zOffset < CONFIG.chunkLength; zOffset += 2) {
                 const s = new THREE.Mesh(sleeperGeo, MATS.sleeper);
                 s.position.set(x, 0.05, this.zPos - zOffset);
                 s.receiveShadow = true;
                 this.mesh.add(s);
            }
        });
    }

    spawnObstacles() {
        // Safe Zone for startup (first -300 units approximately)
        // Since zPos starts at 0 and goes negative
        if (this.zPos > -300) {
            // No obstacles
            return;
        }

        // Simple random spawner
        // 3 lanes: -4, 0, 4
        // Logic: Iterate through slots in the chunk
        
        const slots = Math.floor(CONFIG.chunkLength / 10); // Every 10 units check for obstacle
        
        for (let i = 0; i < slots; i++) {
            if (i < 2) continue; // Give some space at start of chunk if needed, or overlap logic
            
            const z = this.zPos - (i * 10);
            
            // Randomly pick a lane or multiple
            const lanes = [-4, 0, 4];
            let occupiedLanes = 0;
            
            // Shuffle
            lanes.sort(() => Math.random() - 0.5);

            for (let lane of lanes) {
                // Determine if we should force a powerup
                // User wants "powerup at 3 seconds mark". 
                // Speed is ~0.5 per frame? zPos -300 is roughly 600 frames aka 10s?
                // Let's just spawn powerups regularly for test
                
                if (Math.abs(this.zPos) % 200 < 50 && occupiedLanes < 2) { // Every 200 units, force powerups
                    this.createPowerup(lane, z);
                    occupiedLanes++;
                }
                else if (Math.random() > 0.6 && occupiedLanes < 2) { // 40% chance of obstacle
                    this.createObstacle(lane, z);
                    occupiedLanes++;
                } else if (Math.random() > 0.5) {
                    // Start a line of coins if no obstacle
                    this.createCoin(lane, z);
                } else if (Math.random() > 0.95) {
                    // Rare Powerup
                    this.createPowerup(lane, z);
                }
            }
        }
    }

    createPowerup(x, z) {
        // Random Type
        const types = ['magnet', 'jetpack', 'multiplier', 'sneakers'];
        const type = types[Math.floor(Math.random() * types.length)];
        
        const geo = new THREE.BoxGeometry(1, 1, 1);
        let mat;
        
        switch(type) {
            case 'magnet': mat = MATS.magnet; break;
            case 'jetpack': mat = MATS.jetpack; break;
            case 'multiplier': mat = MATS.multiplier; break;
            default: mat = new THREE.MeshPhongMaterial({ color: 0x00ff00 }); break; // Sneakers (Green)
        }
        
        // Ensure white color for textured materials if they weren't set above? 
        // No, we set them in MATS.

        const pu = new THREE.Mesh(geo, mat);
        pu.position.set(x, 1, z);
        pu.rotation.y = Math.PI / 4;
        
        pu.userData = { type: 'powerup_' + type };
        
        this.mesh.add(pu);
        
        this.coins.push({
            mesh: pu,
            box: new THREE.Box3().setFromObject(pu),
            active: true
        });
    }

    createCoin(x, z) {
        const coinGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.1, 16);
        const coin = new THREE.Mesh(coinGeo, MATS.coin);
        coin.rotation.x = Math.PI / 2; // Face Player (Z axis)
        coin.rotation.z = 0;
        
        coin.position.set(x, 1, z);
        coin.userData = { type: 'coin', id: Math.random() };
        
        this.mesh.add(coin);
        
        this.coins.push({
            mesh: coin,
            box: new THREE.Box3().setFromObject(coin),
            active: true
        });
    }

    createObstacle(x, z) {
        const type = Math.random();
        let obs;
        
        if (type < 0.3) {
            // Low Barrier (Jumpable)
            const geo = new THREE.BoxGeometry(3, 1, 1);
            const mat = new THREE.MeshPhongMaterial({ color: 0xff0000 });
            obs = new THREE.Mesh(geo, mat);
            obs.position.set(x, 0.5, z);
            obs.userData = { type: 'barrier_low' };
        } else if (type < 0.6) {
            // Crate (Rollable)
            const geo = new THREE.BoxGeometry(3, 3, 3);
            obs = new THREE.Mesh(geo, MATS.crate);
            obs.position.set(x, 1.5, z);
            obs.userData = { type: 'crate' };
        } else {
             // Train / Big Block (Avoid)
            const geo = new THREE.BoxGeometry(3.5, 4, 10);
            obs = new THREE.Mesh(geo, MATS.train);
            obs.position.set(x, 2, z);
            obs.userData = { type: 'train' };
        }

        obs.castShadow = true;
        obs.receiveShadow = true;
        
        obs.updateMatrixWorld(true);
        this.mesh.add(obs);
        
        // Add minimal bounding box info for collision
        this.obstacles.push({
            mesh: obs,
            box: new THREE.Box3().setFromObject(obs)
        });
        
        // Hide Debug Meshes (Red Boxes) if needed, but 'obs' IS the visible mesh too!
        // Wait, for 'barrier_low' it creates a RED box.
        // We should texture it or make it invisible if it was just a collider.
        // The user said "red boxes appearing... which i can go through".
        // Ah, "barrier_low" (jumpable) and "barrier_high" (rollable) are currently red/green boxes.
        // We should apply textures to them or hide them if they are phantom.
        // Actually, let's keep them visible but texture them propery.
        // Or if they are "going through" them, maybe collision is broken for them?
        // But user wants them gone/explained. 
        // Let's replace the Red/Green materials with crate/wood textures so they look real.
        
        if (obs.material.color.getHex() === 0xff0000) { // Barrier Low (Red)
             obs.material = MATS.crate; // Use crate texture for now
        }
    }
}

   /* getObstacles() {
        // Flatten all chunks' obstacles
        return this.chunks.flatMap(c => c.obstacles);
    }
}*/

class ForkChunk extends Chunk {
    constructor(zPos) {
        super(zPos);
        // Additional logic for fork
    }
    
    init() {
        // Call super init to get standard tracks? No, ForkChunk overrides init completely.
        // We need to implement separate tracks here too.
        
        const laneWidth = 3.8;
        const bedGeo = new THREE.PlaneGeometry(laneWidth, CONFIG.chunkLength);
        const lanes = [-4, 0, 4];
         // Fork widens? The original code had a 40 width floor. 
         // "Left Path Wall... -15" "Right Path Wall... 15"
         // It seems ForkChunk is wider.
         // For now let's keep the center tracks standard and maybe add wider outer areas?
         // User asked to "label tracks 1,2,3". The fork chunk logic seems to imply a split.
         // Let's replicate the 3-lane logic for consistency in the "playable" area.
         
        lanes.forEach(x => {
             const bed = new THREE.Mesh(bedGeo, MATS.trackBed);
             bed.rotation.x = -Math.PI / 2;
             bed.position.set(x, 0, this.zPos - CONFIG.chunkLength/2);
             bed.receiveShadow = true;
             this.mesh.add(bed);
        });
        
        // Add extra ground for the "Fork" visuals on sides if needed, or just let it be empty void?
        // Original: PlaneGeometry(40, ...)
        // Let's add side planes for visual completeness but NOT track bed texture
        
        const sideGeo = new THREE.PlaneGeometry(15, CONFIG.chunkLength);
        const leftSide = new THREE.Mesh(sideGeo, MATS.ground);
        leftSide.rotation.x = -Math.PI / 2;
        leftSide.position.set(-15, -0.1, this.zPos - CONFIG.chunkLength/2); // Lower slightly
        this.mesh.add(leftSide);
        
        const rightSide = new THREE.Mesh(sideGeo, MATS.ground);
        rightSide.rotation.x = -Math.PI / 2;
        rightSide.position.set(15, -0.1, this.zPos - CONFIG.chunkLength/2);
        this.mesh.add(rightSide);

        // Spawn Tracks
        this.spawnTracks();
        
        // Wall in the middle (Divider)
        const divGeo = new THREE.BoxGeometry(1, 4, CONFIG.chunkLength);
        
        const dividerGeo = new THREE.BoxGeometry(3.5, 4, CONFIG.chunkLength); // Block center lane width 4
        const divider = new THREE.Mesh(dividerGeo, MATS.wall);
        divider.position.set(0, 2, this.zPos - CONFIG.chunkLength / 2); // Center Lane Blocked!
        this.mesh.add(divider);
        // Add to obstacles
        this.obstacles.push({
             mesh: divider,
             box: new THREE.Box3().setFromObject(divider)
        });
        
        // Left Path Wall
        const leftWall = new THREE.Mesh(divGeo, MATS.wall);
        leftWall.position.set(-15, 2, this.zPos - CONFIG.chunkLength / 2);
        this.mesh.add(leftWall);
        
        // Right Path Wall
        const rightWall = new THREE.Mesh(divGeo, MATS.wall);
        rightWall.position.set(15, 2, this.zPos - CONFIG.chunkLength / 2);
        this.mesh.add(rightWall);
        
        // Visual Indicators (Arrows?)
    }
    
    spawnObstacles() {
        // No random obstacles in fork for now, just the split
    }
}

export class WorldManager {
    constructor(scene) {
        this.scene = scene;
        this.chunks = [];
        this.lastChunkZ = 0;
        
        // Initial spawn
        for (let i = 0; i < CONFIG.renderDistance; i++) {
            this.spawnChunk();
        }
    }

    spawnChunk() {
        let chunk;
        // High chance of fork for testing (40%), after z -100
        if (Math.abs(this.lastChunkZ) > 100 && Math.random() < 0.4) {
             chunk = new ForkChunk(this.lastChunkZ);
             chunk.mesh.userData = { isFork: true };
        } else {
             chunk = new Chunk(this.lastChunkZ);
        }
        
        this.scene.add(chunk.mesh);
        this.chunks.push(chunk);
        this.lastChunkZ -= CONFIG.chunkLength;
    }

    update(playerZ) {
        // Check if we need to spawn new chunks
        // If player is past the first chunk's end, remove it and add new one
        // Chunk extends from zPos to zPos - Length
        
        const oldestChunk = this.chunks[0];
        // If player is past this chunk (z is negative decreasing)
        // oldestChunk.zPos is the START (approx 0, -50, -100...)
        // Player moves 0 -> -infinity
        // When playerZ < oldestChunk.zPos - CONFIG.chunkLength - buffer
        
        if (playerZ < oldestChunk.zPos - CONFIG.chunkLength - 20) {
            this.scene.remove(oldestChunk.mesh);
            this.chunks.shift();
            this.spawnChunk();
        }
    }
    
    getObstacles() {
        // Flatten all chunks' obstacles
        return this.chunks.flatMap(c => c.obstacles);
    }
}
