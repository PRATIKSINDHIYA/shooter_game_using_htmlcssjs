/**
 * Weapon class
 * Handles weapon mechanics, rendering, and shooting
 */
class Weapon {
    constructor(type, config, player, scene) {
        this.type = type;
        this.config = config;
        this.player = player;
        this.scene = scene;
        
        // State
        this.currentAmmo = config.magazineSize;
        this.reserveAmmo = config.maxAmmo;
        this.isReloading = false;
        this.lastShotTime = 0;
        
        // Mesh
        this.mesh = null;
        this.bulletMeshes = [];
        
        // Sound
        this.shootSound = null;
        this.reloadSound = null;
        
        // Initialize
        this.init();
    }
    
    init() {
        // Create weapon mesh (can be replaced with loaded model later)
        this.createWeaponMesh();
        
        // Load sounds
        this.loadSounds();
    }
    
    createWeaponMesh() {
        // Create a simple mesh for the weapon based on type
        let geometry;
        
        switch (this.type) {
            case 'pistol':
                geometry = new THREE.BoxGeometry(0.1, 0.1, 0.3);
                break;
            case 'shotgun':
                geometry = new THREE.BoxGeometry(0.12, 0.12, 0.5);
                break;
            case 'sniper':
                geometry = new THREE.BoxGeometry(0.08, 0.08, 0.7);
                break;
            case 'smg':
                geometry = new THREE.BoxGeometry(0.1, 0.1, 0.4);
                break;
            default:
                geometry = new THREE.BoxGeometry(0.1, 0.1, 0.3);
        }
        
        const material = new THREE.MeshLambertMaterial({ color: 0x333333 });
        this.mesh = new THREE.Mesh(geometry, material);
        
        // Position the weapon in front of the player
        // These values can be adjusted for better positioning
        this.mesh.position.set(0.3, -0.2, -0.5);
        
        // Hide initially
        this.mesh.visible = false;
        
        // Add to player mesh if local player, otherwise to scene
        if (this.player.isLocalPlayer && this.player.camera) {
            this.player.camera.add(this.mesh);
        } else {
            this.player.mesh.add(this.mesh);
        }
    }
    
    loadSounds() {
        // In a real application, you'd load actual sound files
        // For this example, we'll create placeholder Audio objects
        this.shootSound = new Audio();
        this.reloadSound = new Audio();
        
        // We would normally set their src here, but we'll skip that for now
        // this.shootSound.src = `assets/sounds/${this.config.sound}.mp3`;
        // this.reloadSound.src = 'assets/sounds/reload.mp3';
    }
    
    update(deltaTime) {
        // Update bullet meshes
        for (let i = this.bulletMeshes.length - 1; i >= 0; i--) {
            const bullet = this.bulletMeshes[i];
            
            // Move bullet
            bullet.position.add(bullet.velocity.clone().multiplyScalar(deltaTime * 50));
            
            // Check if bullet has traveled its maximum distance
            bullet.distanceTraveled += bullet.velocity.length() * deltaTime * 50;
            if (bullet.distanceTraveled > this.config.range) {
                this.scene.remove(bullet);
                this.bulletMeshes.splice(i, 1);
            }
        }
    }
    
    show() {
        if (this.mesh) {
            this.mesh.visible = true;
        }
    }
    
    hide() {
        if (this.mesh) {
            this.mesh.visible = false;
        }
    }
    
    shoot() {
        // Check if we can shoot
        const now = Date.now();
        if (
            this.isReloading || 
            this.currentAmmo <= 0 || 
            now - this.lastShotTime < this.config.fireRate
        ) {
            if (this.currentAmmo <= 0) {
                this.reload();
            }
            return false;
        }
        
        // Set last shot time
        this.lastShotTime = now;
        
        // Decrease ammo
        this.currentAmmo--;
        
        // Play sound
        if (this.shootSound) {
            this.shootSound.currentTime = 0;
            this.shootSound.play().catch(e => console.log("Error playing sound:", e));
        }
        
        // Handle different weapon types
        switch (this.type) {
            case 'shotgun':
                // Shotgun fires multiple pellets
                this.fireShotgun();
                break;
            default:
                // Other weapons fire a single bullet
                this.fireBullet();
        }
        
        // Apply recoil if it's the local player
        if (this.player.isLocalPlayer && this.player.camera) {
            this.applyRecoil();
        }
        
        return true;
    }
    
    fireBullet() {
        // Get bullet origin and direction
        const origin = new THREE.Vector3();
        const direction = new THREE.Vector3(0, 0, -1);
        
        if (this.player.isLocalPlayer && this.player.camera) {
            // For local player, shoot from camera
            this.player.camera.getWorldPosition(origin);
            
            // Set direction based on camera
            this.player.camera.getWorldDirection(direction);
            direction.negate(); // Negate because camera looks down -Z
        } else {
            // For other players, shoot from their position
            this.player.mesh.getWorldPosition(origin);
            
            // Set direction based on player rotation
            direction.applyEuler(this.player.rotation);
        }
        
        // Add random spread
        this.applySpread(direction, this.config.spread);
        
        // Create bullet mesh
        const bullet = this.createBulletMesh(origin, direction);
        
        // Record shot in Firebase
        if (this.player.isLocalPlayer) {
            window.firebaseManager.recordShot(
                this.type,
                { x: origin.x, y: origin.y, z: origin.z },
                { x: direction.x, y: direction.y, z: direction.z }
            );
        }
        
        return { origin, direction };
    }
    
    fireShotgun() {
        // Shotgun fires multiple pellets in a spread pattern
        const origin = new THREE.Vector3();
        const baseDirection = new THREE.Vector3(0, 0, -1);
        
        if (this.player.isLocalPlayer && this.player.camera) {
            this.player.camera.getWorldPosition(origin);
            this.player.camera.getWorldDirection(baseDirection);
            baseDirection.negate();
        } else {
            this.player.mesh.getWorldPosition(origin);
            baseDirection.applyEuler(this.player.rotation);
        }
        
        // Fire multiple pellets
        for (let i = 0; i < this.config.pellets; i++) {
            const direction = baseDirection.clone();
            this.applySpread(direction, this.config.spread);
            
            // Create bullet mesh
            const bullet = this.createBulletMesh(origin, direction);
            
            // Record shot in Firebase (only for first pellet to avoid spamming)
            if (this.player.isLocalPlayer && i === 0) {
                window.firebaseManager.recordShot(
                    this.type,
                    { x: origin.x, y: origin.y, z: origin.z },
                    { x: direction.x, y: direction.y, z: direction.z }
                );
            }
        }
    }
    
    createBulletMesh(origin, direction) {
        // Create bullet mesh
        const geometry = new THREE.SphereGeometry(0.05, 8, 8);
        const material = new THREE.MeshBasicMaterial({ color: 0xffff00 });
        const bullet = new THREE.Mesh(geometry, material);
        
        // Set position and velocity
        bullet.position.copy(origin);
        bullet.velocity = direction.clone().normalize().multiplyScalar(1);
        bullet.distanceTraveled = 0;
        bullet.weaponType = this.type;
        bullet.damage = this.config.damage;
        bullet.shooterId = this.player.id;
        
        // Add to scene and track
        this.scene.add(bullet);
        this.bulletMeshes.push(bullet);
        
        return bullet;
    }
    
    applySpread(direction, spread) {
        // Add random spread to direction
        direction.x += (Math.random() - 0.5) * spread;
        direction.y += (Math.random() - 0.5) * spread;
        direction.z += (Math.random() - 0.5) * spread;
        direction.normalize();
    }
    
    applyRecoil() {
        if (!this.player.camera) return;
        
        // Apply recoil to camera rotation
        const recoilAmount = this.config.recoil;
        this.player.camera.rotation.x -= recoilAmount * 0.03; // Pitch up
        
        // Random horizontal recoil
        this.player.camera.rotation.y += (Math.random() - 0.5) * recoilAmount * 0.01;
        
        // Animate recoil recovery
        setTimeout(() => {
            this.player.camera.rotation.x += recoilAmount * 0.02;
        }, 50);
        
        setTimeout(() => {
            this.player.camera.rotation.x += recoilAmount * 0.01;
        }, 100);
    }
    
    reload(callback) {
        if (this.isReloading || this.currentAmmo >= this.config.magazineSize || this.reserveAmmo <= 0) {
            if (callback) callback();
            return;
        }
        
        this.isReloading = true;
        
        // Play reload sound
        if (this.reloadSound) {
            this.reloadSound.currentTime = 0;
            this.reloadSound.play().catch(e => console.log("Error playing sound:", e));
        }
        
        // Reload animation
        if (this.mesh) {
            this.mesh.position.y -= 0.05;
            setTimeout(() => {
                this.mesh.position.y += 0.05;
            }, this.config.reloadTime / 2);
        }
        
        // Finish reloading after timeout
        setTimeout(() => {
            // Calculate ammo
            const ammoNeeded = this.config.magazineSize - this.currentAmmo;
            const ammoToAdd = Math.min(ammoNeeded, this.reserveAmmo);
            
            this.reserveAmmo -= ammoToAdd;
            this.currentAmmo += ammoToAdd;
            this.isReloading = false;
            
            if (callback) callback();
        }, this.config.reloadTime);
    }
    
    fullReload() {
        // Immediately reload without animation (used when respawning)
        const ammoNeeded = this.config.magazineSize - this.currentAmmo;
        const ammoToAdd = Math.min(ammoNeeded, this.reserveAmmo);
        
        this.reserveAmmo -= ammoToAdd;
        this.currentAmmo += ammoToAdd;
        this.isReloading = false;
    }
    
    getAmmoStatus() {
        return {
            current: this.currentAmmo,
            reserve: this.reserveAmmo,
            magazineSize: this.config.magazineSize
        };
    }
    
    dispose() {
        // Clean up meshes
        if (this.mesh) {
            if (this.player.isLocalPlayer && this.player.camera) {
                this.player.camera.remove(this.mesh);
            } else if (this.player.mesh) {
                this.player.mesh.remove(this.mesh);
            }
            
            if (this.mesh.geometry) this.mesh.geometry.dispose();
            if (this.mesh.material) this.mesh.material.dispose();
        }
        
        // Clean up bullets
        this.bulletMeshes.forEach(bullet => {
            this.scene.remove(bullet);
            if (bullet.geometry) bullet.geometry.dispose();
            if (bullet.material) bullet.material.dispose();
        });
        this.bulletMeshes = [];
    }
} 