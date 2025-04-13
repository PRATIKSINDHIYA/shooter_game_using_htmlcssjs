/**
 * World class
 * Handles the 3D environment, obstacles, and collision detection
 */
class World {
    constructor(scene) {
        this.scene = scene;
        this.objects = [];
        this.obstacles = [];
        this.mapSize = GAME_SETTINGS.world.mapSize;
        
        // Initialize
        this.init();
    }
    
    init() {
        // Create ground
        this.createGround();
        
        // Create skybox
        this.createSkybox();
        
        // Create obstacles and structures
        this.createObstacles();
        
        // Create lighting
        this.createLighting();
    }
    
    createGround() {
        // Create a large plane for the ground
        const groundGeometry = new THREE.PlaneGeometry(this.mapSize, this.mapSize, 32, 32);
        
        // Rotate to be horizontal
        groundGeometry.rotateX(-Math.PI / 2);
        
        // Create material with grass texture
        const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x336633 });
        
        // Apply texture if available
        // const textureLoader = new THREE.TextureLoader();
        // const groundTexture = textureLoader.load('assets/textures/ground.jpg');
        // groundTexture.wrapS = THREE.RepeatWrapping;
        // groundTexture.wrapT = THREE.RepeatWrapping;
        // groundTexture.repeat.set(10, 10);
        // groundMaterial.map = groundTexture;
        
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.receiveShadow = true;
        ground.name = 'ground';
        
        this.scene.add(ground);
        this.objects.push(ground);
    }
    
    createSkybox() {
        // Create a simple skybox
        const skyGeometry = new THREE.BoxGeometry(1000, 1000, 1000);
        const skyMaterial = new THREE.MeshBasicMaterial({
            color: 0x87CEEB,
            side: THREE.BackSide
        });
        
        const skybox = new THREE.Mesh(skyGeometry, skyMaterial);
        this.scene.add(skybox);
    }
    
    createObstacles() {
        // Create various obstacles around the map
        this.createWalls();
        this.createBoxes();
        this.createTrees();
    }
    
    createWalls() {
        // Create walls around the perimeter
        const wallHeight = 5;
        const wallThickness = 1;
        const halfMap = this.mapSize / 2;
        
        // Materials
        const wallMaterial = new THREE.MeshLambertMaterial({ color: 0x888888 });
        
        // North wall
        const northWall = new THREE.Mesh(
            new THREE.BoxGeometry(this.mapSize + wallThickness*2, wallHeight, wallThickness),
            wallMaterial
        );
        northWall.position.set(0, wallHeight/2, -halfMap - wallThickness/2);
        northWall.castShadow = true;
        northWall.receiveShadow = true;
        northWall.name = 'wall';
        this.scene.add(northWall);
        this.obstacles.push(northWall);
        
        // South wall
        const southWall = new THREE.Mesh(
            new THREE.BoxGeometry(this.mapSize + wallThickness*2, wallHeight, wallThickness),
            wallMaterial
        );
        southWall.position.set(0, wallHeight/2, halfMap + wallThickness/2);
        southWall.castShadow = true;
        southWall.receiveShadow = true;
        southWall.name = 'wall';
        this.scene.add(southWall);
        this.obstacles.push(southWall);
        
        // East wall
        const eastWall = new THREE.Mesh(
            new THREE.BoxGeometry(wallThickness, wallHeight, this.mapSize),
            wallMaterial
        );
        eastWall.position.set(halfMap + wallThickness/2, wallHeight/2, 0);
        eastWall.castShadow = true;
        eastWall.receiveShadow = true;
        eastWall.name = 'wall';
        this.scene.add(eastWall);
        this.obstacles.push(eastWall);
        
        // West wall
        const westWall = new THREE.Mesh(
            new THREE.BoxGeometry(wallThickness, wallHeight, this.mapSize),
            wallMaterial
        );
        westWall.position.set(-halfMap - wallThickness/2, wallHeight/2, 0);
        westWall.castShadow = true;
        westWall.receiveShadow = true;
        westWall.name = 'wall';
        this.scene.add(westWall);
        this.obstacles.push(westWall);
    }
    
    createBoxes() {
        // Create several boxes of different sizes randomly placed on the map
        const boxMaterial = new THREE.MeshLambertMaterial({ color: 0xA0522D });
        const numBoxes = 20;
        const maxSize = 3;
        const minSize = 1;
        
        for (let i = 0; i < numBoxes; i++) {
            // Random size
            const width = minSize + Math.random() * (maxSize - minSize);
            const height = minSize + Math.random() * (maxSize - minSize);
            const depth = minSize + Math.random() * (maxSize - minSize);
            
            // Random position
            const x = (Math.random() - 0.5) * (this.mapSize - 10);
            const z = (Math.random() - 0.5) * (this.mapSize - 10);
            
            const box = new THREE.Mesh(
                new THREE.BoxGeometry(width, height, depth),
                boxMaterial
            );
            
            box.position.set(x, height/2, z);
            box.castShadow = true;
            box.receiveShadow = true;
            box.name = 'box';
            
            this.scene.add(box);
            this.obstacles.push(box);
        }
    }
    
    createTrees() {
        // Create some simple tree-like structures
        const numTrees = 15;
        const trunkMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
        const leafMaterial = new THREE.MeshLambertMaterial({ color: 0x228B22 });
        
        for (let i = 0; i < numTrees; i++) {
            // Random position
            const x = (Math.random() - 0.5) * (this.mapSize - 15);
            const z = (Math.random() - 0.5) * (this.mapSize - 15);
            
            // Tree group
            const tree = new THREE.Group();
            tree.position.set(x, 0, z);
            tree.name = 'tree';
            
            // Trunk
            const trunkHeight = 4 + Math.random() * 2;
            const trunk = new THREE.Mesh(
                new THREE.CylinderGeometry(0.5, 0.7, trunkHeight, 8),
                trunkMaterial
            );
            trunk.position.y = trunkHeight / 2;
            trunk.castShadow = true;
            trunk.receiveShadow = true;
            tree.add(trunk);
            
            // Leaves (a simple cone)
            const leavesHeight = 5 + Math.random() * 3;
            const leaves = new THREE.Mesh(
                new THREE.ConeGeometry(2, leavesHeight, 8),
                leafMaterial
            );
            leaves.position.y = trunkHeight + leavesHeight / 2 - 0.5;
            leaves.castShadow = true;
            leaves.receiveShadow = true;
            tree.add(leaves);
            
            this.scene.add(tree);
            this.obstacles.push(tree);
        }
    }
    
    createLighting() {
        // Create directional light (sun)
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(100, 100, 50);
        directionalLight.castShadow = true;
        
        // Configure shadow properties
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        const d = 50;
        directionalLight.shadow.camera.left = -d;
        directionalLight.shadow.camera.right = d;
        directionalLight.shadow.camera.top = d;
        directionalLight.shadow.camera.bottom = -d;
        directionalLight.shadow.camera.far = 500;
        
        this.scene.add(directionalLight);
        
        // Add ambient light for general illumination
        const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
        this.scene.add(ambientLight);
    }
    
    // Check if a player collides with any obstacles
    checkCollisions(player) {
        if (!player || !player.position || !player.radius) return [];
        
        const collisions = [];
        
        for (const obstacle of this.obstacles) {
            // Skip if obstacle has no valid bounds
            if (!obstacle.geometry || !obstacle.position) continue;
            
            // Get obstacle bounding box
            if (!obstacle.bbox) {
                obstacle.geometry.computeBoundingBox();
                obstacle.bbox = obstacle.geometry.boundingBox.clone();
                obstacle.bbox.applyMatrix4(obstacle.matrixWorld);
            }
            
            // Check if player is inside or too close to the obstacle
            const bbox = obstacle.bbox;
            const playerPosition = player.position.clone();
            
            // Simple cylinder collision check for player
            const playerMinY = playerPosition.y - player.height/2;
            const playerMaxY = playerPosition.y + player.height/2;
            
            // Check if player's cylinder intersects with obstacle's bounding box
            if (
                playerPosition.x + player.radius > bbox.min.x &&
                playerPosition.x - player.radius < bbox.max.x &&
                playerMaxY > bbox.min.y &&
                playerMinY < bbox.max.y &&
                playerPosition.z + player.radius > bbox.min.z &&
                playerPosition.z - player.radius < bbox.max.z
            ) {
                collisions.push(obstacle);
            }
        }
        
        return collisions;
    }
    
    // Handle player physics and collisions
    handlePlayerPhysics(player, deltaTime) {
        if (!player) return;
        
        // Store original position
        const originalPosition = player.position.clone();
        
        // Update player (applies gravity and movement)
        player.update(deltaTime);
        
        // Check ground collision
        if (player.position.y < player.height/2) {
            player.position.y = player.height/2;
            player.velocity.y = 0;
            player.grounded = true;
            player.isJumping = false;
        } else {
            player.grounded = false;
        }
        
        // Check obstacle collisions
        const collisions = this.checkCollisions(player);
        
        if (collisions.length > 0) {
            // Simplistic collision resolution - move back to original position
            // In a real game, you'd want more sophisticated collision response
            player.position.copy(originalPosition);
            player.velocity.set(0, player.velocity.y, 0);
        }
    }
    
    // Spawn random powerups on the map
    spawnPowerup() {
        const powerupTypes = ['health', 'ammo', 'armor'];
        const type = powerupTypes[Math.floor(Math.random() * powerupTypes.length)];
        
        // Random position that's not inside an obstacle
        let validPosition = false;
        let position = new THREE.Vector3();
        
        while (!validPosition) {
            const x = (Math.random() - 0.5) * (this.mapSize - 10);
            const z = (Math.random() - 0.5) * (this.mapSize - 10);
            position.set(x, 1, z);
            
            // Check if position collides with any obstacle
            let collides = false;
            for (const obstacle of this.obstacles) {
                if (!obstacle.bbox) continue;
                
                const bbox = obstacle.bbox;
                if (
                    position.x + 1 > bbox.min.x &&
                    position.x - 1 < bbox.max.x &&
                    position.y + 1 > bbox.min.y &&
                    position.y - 1 < bbox.max.y &&
                    position.z + 1 > bbox.min.z &&
                    position.z - 1 < bbox.max.z
                ) {
                    collides = true;
                    break;
                }
            }
            
            if (!collides) {
                validPosition = true;
            }
        }
        
        // Create powerup mesh
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        
        let color;
        switch (type) {
            case 'health':
                color = 0xff0000; // Red
                break;
            case 'ammo':
                color = 0x0000ff; // Blue
                break;
            case 'armor':
                color = 0x00ff00; // Green
                break;
        }
        
        const material = new THREE.MeshLambertMaterial({ color });
        const powerup = new THREE.Mesh(geometry, material);
        powerup.position.copy(position);
        powerup.userData.type = type;
        powerup.userData.rotationSpeed = 0.01;
        
        // Add floating animation
        powerup.userData.floatHeight = 0.5;
        powerup.userData.baseY = position.y;
        powerup.userData.floatSpeed = 0.5 + Math.random() * 0.5;
        powerup.userData.floatOffset = Math.random() * Math.PI * 2;
        
        this.scene.add(powerup);
        
        // Return the powerup
        return powerup;
    }
    
    // Update powerups (rotation, floating animation)
    updatePowerups(powerups, deltaTime) {
        for (const powerup of powerups) {
            // Rotate
            powerup.rotation.y += powerup.userData.rotationSpeed;
            
            // Float up and down
            const time = Date.now() * 0.001;
            powerup.position.y = powerup.userData.baseY + 
                Math.sin((time + powerup.userData.floatOffset) * powerup.userData.floatSpeed) * 
                powerup.userData.floatHeight;
        }
    }
    
    // Check if a player has collected a powerup
    checkPowerupCollision(player, powerups) {
        if (!player || !player.position || !player.radius) return null;
        
        for (let i = 0; i < powerups.length; i++) {
            const powerup = powerups[i];
            const distance = player.position.distanceTo(powerup.position);
            
            if (distance < player.radius + 1) {
                return {
                    index: i,
                    type: powerup.userData.type,
                    powerup
                };
            }
        }
        
        return null;
    }
    
    // Dispose of all resources
    dispose() {
        for (const object of [...this.objects, ...this.obstacles]) {
            this.scene.remove(object);
            if (object.geometry) object.geometry.dispose();
            if (object.material) {
                if (Array.isArray(object.material)) {
                    object.material.forEach(material => material.dispose());
                } else {
                    object.material.dispose();
                }
            }
        }
        
        this.objects = [];
        this.obstacles = [];
    }
} 