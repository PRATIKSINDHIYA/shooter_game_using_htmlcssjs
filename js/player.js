/**
 * Player class
 * Handles player mechanics, rendering, and state management
 */
class Player {
    constructor(id, name, isLocalPlayer, scene, camera) {
        this.id = id;
        this.name = name;
        this.isLocalPlayer = isLocalPlayer;
        this.scene = scene;
        this.camera = camera;
        
        // State
        this.position = new THREE.Vector3(0, 1, 0);
        this.rotation = new THREE.Euler(0, 0, 0);
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.health = GAME_SETTINGS.player.health;
        this.lives = GAME_SETTINGS.player.lives;
        this.isMoving = false;
        this.isSprinting = false;
        this.isJumping = false;
        this.isReloading = false;
        this.selectedWeapon = 'pistol';
        this.weapons = {};
        this.color = null;
        this.kills = 0;
        this.deaths = 0;
        
        // Physics
        this.height = GAME_SETTINGS.player.height;
        this.radius = GAME_SETTINGS.player.radius;
        this.moveSpeed = GAME_SETTINGS.player.moveSpeed;
        this.sprintSpeed = GAME_SETTINGS.player.sprintSpeed;
        this.jumpForce = GAME_SETTINGS.player.jumpForce;
        this.gravity = GAME_SETTINGS.world.gravity;
        this.grounded = false;
        
        // Mesh and helpers
        this.mesh = null;
        this.weaponMesh = null;
        this.nameLabel = null;
        this.hitbox = null;
        
        // Initialize
        this.init();
    }
    
    init() {
        // Create player mesh
        if (this.isLocalPlayer) {
            // Local player is invisible (first person view)
            this.mesh = new THREE.Group();
            this.mesh.position.copy(this.position);
            this.scene.add(this.mesh);
        } else {
            // Create visible mesh for other players
            this.createPlayerMesh();
        }
        
        // Initialize weapons
        this.initWeapons();
        
        // Create hitbox for collision detection
        this.createHitbox();
    }
    
    createPlayerMesh() {
        // Basic player model - can be replaced with loaded model later
        const geometry = new THREE.CapsuleGeometry(this.radius, this.height - 2 * this.radius, 4, 8);
        const material = new THREE.MeshLambertMaterial({ color: this.color || 0x44aa88 });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;
        this.mesh.position.copy(this.position);
        this.scene.add(this.mesh);
        
        // Add name label
        this.createNameLabel();
    }
    
    createNameLabel() {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 256;
        canvas.height = 64;
        
        context.fillStyle = '#00000080';
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        context.font = '24px Arial';
        context.fillStyle = '#ffffff';
        context.textAlign = 'center';
        context.fillText(this.name, canvas.width / 2, canvas.height / 2 + 8);
        
        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({ map: texture });
        this.nameLabel = new THREE.Sprite(material);
        this.nameLabel.scale.set(2, 0.5, 1);
        this.nameLabel.position.y = this.height + 0.5;
        
        this.mesh.add(this.nameLabel);
    }
    
    createHitbox() {
        this.hitbox = new THREE.Mesh(
            new THREE.CapsuleGeometry(this.radius, this.height - 2 * this.radius, 4, 8),
            new THREE.MeshBasicMaterial({ 
                color: 0xff0000, 
                wireframe: true, 
                visible: false 
            })
        );
        this.hitbox.position.copy(this.position);
        this.scene.add(this.hitbox);
    }
    
    initWeapons() {
        // Create weapons
        const weapons = Object.keys(GAME_SETTINGS.weapons);
        for (const weaponType of weapons) {
            this.weapons[weaponType] = new Weapon(
                weaponType, 
                GAME_SETTINGS.weapons[weaponType],
                this,
                this.scene
            );
        }
        
        // Initially select pistol
        this.selectWeapon('pistol');
    }
    
    update(deltaTime) {
        // Apply gravity
        if (!this.grounded) {
            this.velocity.y -= this.gravity * deltaTime;
        }
        
        // Apply movement
        const moveSpeed = this.isSprinting ? this.sprintSpeed : this.moveSpeed;
        this.position.add(this.velocity.clone().multiplyScalar(deltaTime * moveSpeed));
        
        // Update mesh position
        if (this.mesh) {
            this.mesh.position.copy(this.position);
            if (!this.isLocalPlayer) {
                this.mesh.rotation.copy(this.rotation);
            }
        }
        
        // Update hitbox position
        if (this.hitbox) {
            this.hitbox.position.copy(this.position);
        }
        
        // Update current weapon
        if (this.weapons[this.selectedWeapon]) {
            this.weapons[this.selectedWeapon].update(deltaTime);
        }
        
        // Check if player fell below the map
        if (this.position.y < -10) {
            this.respawn();
        }
    }
    
    move(direction) {
        // Set movement velocity based on direction vector
        this.velocity.x = direction.x;
        this.velocity.z = direction.z;
        this.isMoving = direction.x !== 0 || direction.z !== 0;
    }
    
    jump() {
        if (this.grounded) {
            this.velocity.y = this.jumpForce;
            this.grounded = false;
            this.isJumping = true;
        }
    }
    
    sprint(isSprinting) {
        this.isSprinting = isSprinting;
    }
    
    selectWeapon(weaponType) {
        if (this.weapons[weaponType]) {
            // Hide current weapon
            if (this.weapons[this.selectedWeapon]) {
                this.weapons[this.selectedWeapon].hide();
            }
            
            // Select and show new weapon
            this.selectedWeapon = weaponType;
            this.weapons[weaponType].show();
        }
    }
    
    shoot() {
        if (this.weapons[this.selectedWeapon] && !this.isReloading) {
            return this.weapons[this.selectedWeapon].shoot();
        }
        return false;
    }
    
    reload() {
        if (this.weapons[this.selectedWeapon] && !this.isReloading) {
            this.isReloading = true;
            this.weapons[this.selectedWeapon].reload(() => {
                this.isReloading = false;
            });
        }
    }
    
    takeDamage(damage, attackerId) {
        this.health -= damage;
        
        if (this.health <= 0) {
            this.die(attackerId);
        }
        
        return this.health;
    }
    
    die(killerId) {
        this.deaths++;
        this.lives--;
        
        if (this.lives > 0) {
            this.respawn();
        }
        
        return this.lives;
    }
    
    respawn() {
        // Reset health and position
        this.health = GAME_SETTINGS.player.health;
        
        // Random position on the map
        const mapSize = GAME_SETTINGS.world.mapSize;
        this.position.set(
            (Math.random() - 0.5) * mapSize,
            2,
            (Math.random() - 0.5) * mapSize
        );
        
        // Reset velocity
        this.velocity.set(0, 0, 0);
        
        // Reload all weapons
        Object.values(this.weapons).forEach(weapon => weapon.fullReload());
    }
    
    // Check collision with another player or object
    checkCollision(object) {
        if (!this.hitbox || !object.hitbox) return false;
        
        const distance = this.position.distanceTo(object.position);
        return distance < (this.radius + object.radius);
    }
    
    // Check if a ray intersects this player (for hit detection)
    checkRayIntersection(ray) {
        if (!this.hitbox) return null;
        
        const raycaster = new THREE.Raycaster(ray.origin, ray.direction);
        const intersects = raycaster.intersectObject(this.hitbox);
        
        if (intersects.length > 0) {
            return intersects[0];
        }
        
        return null;
    }
    
    setColor(color) {
        this.color = color;
        if (this.mesh && this.mesh.material) {
            this.mesh.material.color.set(color);
        }
    }
    
    setFromState(state) {
        // Update player from state received from Firebase
        if (state.position) {
            this.position.set(state.position.x, state.position.y, state.position.z);
        }
        
        if (state.rotation) {
            this.rotation.set(state.rotation.x, state.rotation.y, state.rotation.z);
        }
        
        if (state.health !== undefined) {
            this.health = state.health;
        }
        
        if (state.lives !== undefined) {
            this.lives = state.lives;
        }
        
        if (state.selectedWeapon) {
            this.selectWeapon(state.selectedWeapon);
        }
        
        if (state.color) {
            this.setColor(state.color);
        }
        
        if (state.kills !== undefined) {
            this.kills = state.kills;
        }
        
        if (state.deaths !== undefined) {
            this.deaths = state.deaths;
        }
    }
    
    getState() {
        // Return current state to send to Firebase
        return {
            position: {
                x: this.position.x,
                y: this.position.y,
                z: this.position.z
            },
            rotation: {
                x: this.rotation.x,
                y: this.rotation.y,
                z: this.rotation.z
            },
            health: this.health,
            lives: this.lives,
            selectedWeapon: this.selectedWeapon,
            kills: this.kills,
            deaths: this.deaths
        };
    }
    
    dispose() {
        // Clean up resources
        if (this.mesh) {
            this.scene.remove(this.mesh);
            if (this.mesh.geometry) this.mesh.geometry.dispose();
            if (this.mesh.material) this.mesh.material.dispose();
        }
        
        if (this.hitbox) {
            this.scene.remove(this.hitbox);
            if (this.hitbox.geometry) this.hitbox.geometry.dispose();
            if (this.hitbox.material) this.hitbox.material.dispose();
        }
        
        // Dispose weapons
        Object.values(this.weapons).forEach(weapon => weapon.dispose());
    }
} 