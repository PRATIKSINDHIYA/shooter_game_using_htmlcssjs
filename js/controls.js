/**
 * Controls class
 * Handles player input and camera controls
 */
class Controls {
    constructor(player, camera, domElement = document) {
        this.player = player;
        this.camera = camera;
        this.domElement = domElement;
        
        // Movement keys
        this.keys = {
            forward: false,    // W
            backward: false,   // S
            left: false,       // A
            right: false,      // D
            jump: false,       // Space
            sprint: false,     // Shift
            reload: false      // R
        };
        
        // Mouse state
        this.mouse = {
            locked: false,
            sensitivity: 0.002
        };
        
        // Pointer lock controls
        this.pointerLockControls = new THREE.PointerLockControls(this.camera, this.domElement);
        
        // Setup event listeners
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Keyboard events
        document.addEventListener('keydown', this.onKeyDown.bind(this));
        document.addEventListener('keyup', this.onKeyUp.bind(this));
        
        // Mouse events
        document.addEventListener('click', this.onMouseClick.bind(this));
        document.addEventListener('mousemove', this.onMouseMove.bind(this));
        
        // Pointer lock events
        document.addEventListener('pointerlockchange', this.onPointerLockChange.bind(this));
        document.addEventListener('pointerlockerror', this.onPointerLockError.bind(this));
    }
    
    onKeyDown(event) {
        if (!this.mouse.locked) return;
        
        switch (event.code) {
            case 'KeyW':
                this.keys.forward = true;
                break;
            case 'KeyS':
                this.keys.backward = true;
                break;
            case 'KeyA':
                this.keys.left = true;
                break;
            case 'KeyD':
                this.keys.right = true;
                break;
            case 'Space':
                this.keys.jump = true;
                this.player.jump();
                break;
            case 'ShiftLeft':
            case 'ShiftRight':
                this.keys.sprint = true;
                this.player.sprint(true);
                break;
            case 'KeyR':
                this.keys.reload = true;
                this.player.reload();
                break;
            case 'Digit1':
                this.player.selectWeapon('pistol');
                break;
            case 'Digit2':
                this.player.selectWeapon('shotgun');
                break;
            case 'Digit3':
                this.player.selectWeapon('sniper');
                break;
            case 'Digit4':
                this.player.selectWeapon('smg');
                break;
        }
    }
    
    onKeyUp(event) {
        switch (event.code) {
            case 'KeyW':
                this.keys.forward = false;
                break;
            case 'KeyS':
                this.keys.backward = false;
                break;
            case 'KeyA':
                this.keys.left = false;
                break;
            case 'KeyD':
                this.keys.right = false;
                break;
            case 'Space':
                this.keys.jump = false;
                break;
            case 'ShiftLeft':
            case 'ShiftRight':
                this.keys.sprint = false;
                this.player.sprint(false);
                break;
            case 'KeyR':
                this.keys.reload = false;
                break;
        }
    }
    
    onMouseClick(event) {
        // Lock pointer if not already locked
        if (!this.mouse.locked) {
            this.pointerLockControls.lock();
            return;
        }
        
        // Shoot if left click
        if (event.button === 0) {
            this.player.shoot();
        }
    }
    
    onMouseMove(event) {
        if (!this.mouse.locked) return;
        
        // Update player rotation based on camera rotation
        if (this.player && this.camera) {
            this.player.rotation.y = this.camera.rotation.y;
        }
    }
    
    onPointerLockChange() {
        this.mouse.locked = document.pointerLockElement === this.domElement;
        
        // Show/hide UI elements based on lock state
        if (this.mouse.locked) {
            showElement('#game-ui');
            hideElement('#menu-screen');
        } else {
            hideElement('#game-ui');
            // Don't show menu here, the game state manager should handle this
        }
    }
    
    onPointerLockError() {
        console.error('Pointer lock error');
    }
    
    update() {
        if (!this.mouse.locked || !this.player) return;
        
        // Calculate movement direction
        const direction = new THREE.Vector3(0, 0, 0);
        
        // Forward/backward
        if (this.keys.forward) direction.z = -1;
        else if (this.keys.backward) direction.z = 1;
        
        // Left/right
        if (this.keys.left) direction.x = -1;
        else if (this.keys.right) direction.x = 1;
        
        // Normalize vector to ensure consistent speed in all directions
        if (direction.length() > 0) {
            direction.normalize();
        }
        
        // Adjust for camera direction (so forward is always where camera is looking)
        if (this.camera) {
            const cameraDirXZ = new THREE.Vector3(0, 0, -1);
            cameraDirXZ.applyQuaternion(this.camera.quaternion);
            cameraDirXZ.y = 0;
            cameraDirXZ.normalize();
            
            const cameraDirRight = new THREE.Vector3(1, 0, 0);
            cameraDirRight.applyQuaternion(this.camera.quaternion);
            cameraDirRight.y = 0;
            cameraDirRight.normalize();
            
            const forwardComponent = cameraDirXZ.multiplyScalar(direction.z);
            const rightComponent = cameraDirRight.multiplyScalar(direction.x);
            
            direction.copy(forwardComponent.add(rightComponent));
        }
        
        // Update player movement
        this.player.move(direction);
    }
    
    // Enable/disable controls
    enable() {
        this.pointerLockControls.enable();
    }
    
    disable() {
        this.pointerLockControls.unlock();
        this.pointerLockControls.disable();
        
        // Reset keys
        Object.keys(this.keys).forEach(key => this.keys[key] = false);
    }
    
    // Clean up resources
    dispose() {
        document.removeEventListener('keydown', this.onKeyDown.bind(this));
        document.removeEventListener('keyup', this.onKeyUp.bind(this));
        document.removeEventListener('click', this.onMouseClick.bind(this));
        document.removeEventListener('mousemove', this.onMouseMove.bind(this));
        document.removeEventListener('pointerlockchange', this.onPointerLockChange.bind(this));
        document.removeEventListener('pointerlockerror', this.onPointerLockError.bind(this));
        
        this.pointerLockControls.dispose();
    }
} 