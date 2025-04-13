/**
 * Game Manager
 * Central manager to coordinate game systems, states, and multiplayer
 */
class GameManager {
    constructor() {
        // State
        this.gameState = 'loading'; // loading, menu, room, playing, gameover
        this.isPaused = false;
        
        // Components
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.clock = null;
        this.firebaseManager = null;
        this.uiManager = null;
        this.world = null;
        this.localPlayer = null;
        this.remotePlayers = {};
        this.controls = null;
        
        // Game objects
        this.powerups = [];
        this.powerupSpawnInterval = null;
        
        // Animation frame ID for cancellation
        this.animationFrameId = null;
        
        // Sync state update interval
        this.syncInterval = null;
        
        // Initialize
        this.init();
    }
    
    async init() {
        // Initialize Firebase manager
        this.firebaseManager = new FirebaseManager();
        window.firebaseManager = this.firebaseManager; // For global access
        
        // Initialize UI manager
        this.uiManager = new UIManager();
        
        // Set up Firebase callbacks
        this.setupFirebaseCallbacks();
        
        // Initialize Three.js scene
        this.initScene();
        
        // Show menu when loaded
        this.setGameState('menu');
    }
    
    setupFirebaseCallbacks() {
        // Player joined
        this.firebaseManager.onPlayerJoined(playerData => {
            console.log('Player joined:', playerData.name);
            this.addRemotePlayer(playerData);
            
            // Update UI
            if (this.gameState === 'room') {
                this.uiManager.updatePlayersList(
                    this.firebaseManager.getPlayers(),
                    this.firebaseManager.playerId
                );
            }
        });
        
        // Player left
        this.firebaseManager.onPlayerLeft(playerData => {
            console.log('Player left:', playerData.name);
            this.removeRemotePlayer(playerData.id);
            
            // Update UI
            if (this.gameState === 'room') {
                this.uiManager.updatePlayersList(
                    this.firebaseManager.getPlayers(),
                    this.firebaseManager.playerId
                );
            }
        });
        
        // Game started
        this.firebaseManager.onGameStart(() => {
            console.log('Game started callback triggered');
            if (this.gameState === 'playing') {
                console.log('Already in playing state, ignoring game start callback');
                return;
            }
            
            console.log('Transitioning to playing state and setting up game world');
            // Start the game for this client
            this.setGameState('playing');
            this.setupGameWorld();
        });
        
        // Player update
        this.firebaseManager.onPlayerUpdate(playerData => {
            console.log('Player updated:', playerData.name, 'Ready status:', playerData.isReady);
            
            // Update remote player state
            if (this.remotePlayers[playerData.id]) {
                this.remotePlayers[playerData.id].setFromState(playerData);
            }
            
            // Update UI if in room state
            if (this.gameState === 'room') {
                this.uiManager.updatePlayersList(
                    this.firebaseManager.getPlayers(),
                    this.firebaseManager.playerId
                );
            }
        });
        
        // Player shot
        this.firebaseManager.onPlayerShoot(shotData => {
            // Create visual effect for remote player shooting
            if (this.remotePlayers[shotData.playerId]) {
                const origin = new THREE.Vector3(
                    shotData.origin.x,
                    shotData.origin.y,
                    shotData.origin.z
                );
                
                const direction = new THREE.Vector3(
                    shotData.direction.x,
                    shotData.direction.y,
                    shotData.direction.z
                );
                
                // Simulate shot from remote player
                const remotePlayer = this.remotePlayers[shotData.playerId];
                const weapon = remotePlayer.weapons[remotePlayer.selectedWeapon];
                
                if (weapon) {
                    weapon.shoot();
                    
                    // Check if this shot hits our player
                    this.checkBulletHit(origin, direction, shotData.weaponType, shotData.playerId);
                }
            }
        });
        
        // Player hit
        this.firebaseManager.onPlayerHit((hitData, wasHit) => {
            if (wasHit) {
                // We were hit
                console.log('We were hit for', hitData.damage);
                
                // Apply damage to local player
                if (this.localPlayer) {
                    const remainingHealth = this.localPlayer.takeDamage(hitData.damage, hitData.shooterId);
                    
                    // Update UI
                    this.uiManager.updateHealth(remainingHealth);
                    
                    if (remainingHealth <= 0) {
                        // We died
                        this.playerDied(hitData.shooterId);
                    }
                }
            } else {
                // We hit someone
                console.log('We hit player', hitData.targetId, 'for', hitData.damage);
                
                // Add to kill feed
                const shooter = this.firebaseManager.getPlayer(hitData.shooterId);
                const target = this.firebaseManager.getPlayer(hitData.targetId);
                
                if (shooter && target) {
                    this.uiManager.addKillFeedMessage(shooter.name, target.name, hitData.weaponType);
                }
            }
        });
        
        // Game ended
        this.firebaseManager.onGameEnd((winnerId, winnerData) => {
            console.log('Game ended, winner:', winnerData.name);
            this.endGame(winnerId);
        });
    }
    
    initScene() {
        console.log('Initializing Three.js scene...');
        
        try {
            // Create scene with sky blue background
            this.scene = new THREE.Scene();
            this.scene.background = new THREE.Color(0x87ceeb);
            
            // Create camera - 75 degree FOV, aspect ratio matching window, near clip 0.1, far clip 1000
            this.camera = new THREE.PerspectiveCamera(
                75, window.innerWidth / window.innerHeight, 0.1, 1000
            );
            this.camera.position.set(0, 1.8, 0);
            this.camera.rotation.order = 'YXZ'; // Important for first-person controls
            
            console.log('Creating renderer...');
            // Create renderer with higher quality settings
            this.renderer = new THREE.WebGLRenderer({ 
                antialias: true,
                alpha: false, // Don't use transparency
                powerPreference: 'high-performance'
            });
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            this.renderer.setPixelRatio(window.devicePixelRatio);
            this.renderer.shadowMap.enabled = true;
            this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
            
            // Add renderer to DOM
            document.body.appendChild(this.renderer.domElement);
            console.log('Renderer added to DOM');
            
            // Create clock for animation timing
            this.clock = new THREE.Clock();
            
            // Add basic lighting to the scene
            const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
            this.scene.add(ambientLight);
            
            const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
            directionalLight.position.set(10, 20, 10);
            directionalLight.castShadow = true;
            this.scene.add(directionalLight);
            
            // Add a simple ground plane to verify rendering
            const groundGeometry = new THREE.PlaneGeometry(100, 100);
            const groundMaterial = new THREE.MeshStandardMaterial({ 
                color: 0x555555,
                roughness: 0.8,
                metalness: 0.2
            });
            const ground = new THREE.Mesh(groundGeometry, groundMaterial);
            ground.rotation.x = -Math.PI / 2;
            ground.receiveShadow = true;
            this.scene.add(ground);
            
            // Handle window resize
            window.addEventListener('resize', this.onWindowResize.bind(this));
            console.log('Scene initialization complete');
        } catch (error) {
            console.error('Error initializing scene:', error);
            alert('Error setting up 3D scene: ' + error.message);
        }
    }
    
    onWindowResize() {
        if (this.camera && this.renderer) {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        }
    }
    
    createRoom(playerName) {
        this.uiManager.showLoading();
        
        this.firebaseManager.createRoom(playerName)
            .then(roomCode => {
                console.log('Room created:', roomCode);
                this.setGameState('room');
                this.uiManager.showRoom(roomCode);
                this.uiManager.updatePlayersList(
                    this.firebaseManager.getPlayers(),
                    this.firebaseManager.playerId
                );
            })
            .catch(error => {
                console.error('Error creating room:', error);
                alert('Error creating room: ' + error.message);
                this.uiManager.showMenu();
            });
    }
    
    joinRoom(roomCode, playerName) {
        this.uiManager.showLoading();
        
        this.firebaseManager.joinRoom(roomCode, playerName)
            .then(roomData => {
                console.log('Joined room:', roomData);
                this.setGameState('room');
                this.uiManager.showRoom(roomCode);
                this.uiManager.updatePlayersList(
                    this.firebaseManager.getPlayers(),
                    this.firebaseManager.playerId
                );
            })
            .catch(error => {
                console.error('Error joining room:', error);
                let errorMessage = 'Error joining room';
                
                if (error.message) {
                    errorMessage += ': ' + error.message;
                }
                
                if (error.code) {
                    // Firebase error codes
                    switch(error.code) {
                        case 'PERMISSION_DENIED':
                            errorMessage = 'Permission denied. Check Firebase rules.';
                            break;
                        case 'NETWORK_ERROR':
                            errorMessage = 'Network error. Check your internet connection.';
                            break;
                        default:
                            errorMessage += ' (Code: ' + error.code + ')';
                    }
                }
                
                alert(errorMessage);
                this.uiManager.showMenu();
            });
    }
    
    leaveRoom() {
        this.firebaseManager.leaveRoom()
            .then(() => {
                console.log('Left room');
                this.setGameState('menu');
                this.uiManager.showMenu();
            })
            .catch(error => {
                console.error('Error leaving room:', error);
                alert('Error leaving room: ' + error.message);
            });
    }
    
    startGame() {
        if (this.gameState === 'room') {
            if (this.firebaseManager.isHost()) {
                // Check if all players are ready
                const players = this.firebaseManager.getPlayers();
                const allReady = Object.values(players).every(player => player.isReady);
                const hasMultiplePlayers = Object.keys(players).length > 1;
                
                console.log('Starting game - All players ready:', allReady, 'Has multiple players:', hasMultiplePlayers);
                console.log('Player states:', Object.values(players).map(p => `${p.name}: ${p.isReady ? 'Ready' : 'Not Ready'}`));
                
                if (!allReady) {
                    alert('All players must be ready to start the game');
                    return;
                }
                
                if (!hasMultiplePlayers) {
                    alert('You need at least one other player to start the game');
                    return;
                }
                
                console.log('Host initiating game start...');
                this.firebaseManager.startGame()
                    .then(() => {
                        console.log('Game start command sent successfully');
                        // Don't change state here - wait for Firebase event
                    })
                    .catch(error => {
                        console.error('Error starting game:', error);
                        alert('Error starting game: ' + error.message);
                    });
            }
        } else if (this.gameState === 'playing') {
            console.log('Already in playing state, ignoring startGame call');
            return; // Already playing
        } else {
            // We received a game start notification from Firebase
            console.log('Received game start notification, setting up game world...');
            
            // Switch to playing state and setup the game world
            this.setGameState('playing');
            this.setupGameWorld();
        }
    }
    
    setupGameWorld() {
        console.log('Setting up game world...');
        
        try {
            // Show game UI
            this.uiManager.showGameUI();
            
            // Add debug display
            this.setupDebugDisplay();
            
            // Reset any existing scene elements
            this.cleanupGameWorld();
            
            // Create world
            console.log('Creating world...');
            this.world = new World(this.scene);
            
            // Force a single render to check if scene is working
            console.log('Testing renderer...');
            this.renderer.render(this.scene, this.camera);
            
            // Get current player data from Firebase
            const playerData = this.firebaseManager.getCurrentPlayer();
            if (!playerData) {
                console.error('Could not get current player data from Firebase');
                alert('Error: Could not get player data');
                return;
            }
            
            console.log('Creating local player:', playerData.name);
            // Create local player
            this.localPlayer = new Player(
                playerData.id,
                playerData.name,
                true,
                this.scene,
                this.camera
            );
            
            // Set initial position
            this.localPlayer.position.copy(new THREE.Vector3(
                playerData.position.x,
                playerData.position.y,
                playerData.position.z
            ));
            
            // Set initial rotation
            this.localPlayer.rotation.copy(new THREE.Euler(
                playerData.rotation.x,
                playerData.rotation.y,
                playerData.rotation.z
            ));
            
            // Set player color
            this.localPlayer.setColor(playerData.color);
            
            // Create controls
            console.log('Setting up player controls...');
            try {
                this.controls = new Controls(this.localPlayer, this.camera, document.body);
                console.log('Controls created successfully');
            } catch (controlsError) {
                console.error('Error creating controls:', controlsError);
                alert('Controls error: ' + controlsError.message + '\nGame will continue but controls may be limited.');
                
                // Create a minimal control object to prevent game crashes
                this.controls = {
                    update: () => {},
                    dispose: () => {}
                };
            }
            
            // Create remote players
            console.log('Creating remote players...');
            const players = this.firebaseManager.getPlayers();
            for (const id in players) {
                if (id !== this.firebaseManager.playerId) {
                    this.addRemotePlayer(players[id]);
                }
            }
            
            // Start powerup spawning
            this.startPowerupSpawning();
            
            // Start player state syncing
            this.startPlayerSync();
            
            // Start game loop with a short delay to ensure everything is initialized
            console.log('Starting game loop...');
            setTimeout(() => {
                this.animate();
                console.log('Game world setup complete!');
            }, 100);
        } catch (error) {
            console.error('Error setting up game world:', error);
            alert('Error setting up game: ' + error.message);
        }
    }
    
    setupDebugDisplay() {
        // Create debug container
        const debugContainer = document.createElement('div');
        debugContainer.id = 'debug-info';
        debugContainer.style.position = 'absolute';
        debugContainer.style.top = '10px';
        debugContainer.style.left = '10px';
        debugContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        debugContainer.style.color = 'white';
        debugContainer.style.padding = '10px';
        debugContainer.style.borderRadius = '5px';
        debugContainer.style.fontFamily = 'monospace';
        debugContainer.style.fontSize = '12px';
        debugContainer.style.zIndex = '1000';
        debugContainer.innerHTML = 'Debug Info:<br>Loading...';
        document.body.appendChild(debugContainer);
        
        // Update debug info periodically
        setInterval(() => {
            if (this.gameState === 'playing' && this.localPlayer) {
                debugContainer.innerHTML = `
                    Debug Info:<br>
                    FPS: ${Math.round(1 / this.clock.getDelta())}<br>
                    Position: ${this.localPlayer.position.x.toFixed(2)}, ${this.localPlayer.position.y.toFixed(2)}, ${this.localPlayer.position.z.toFixed(2)}<br>
                    Camera: ${this.camera.position.x.toFixed(2)}, ${this.camera.position.y.toFixed(2)}, ${this.camera.position.z.toFixed(2)}<br>
                    Rotation: ${this.camera.rotation.x.toFixed(2)}, ${this.camera.rotation.y.toFixed(2)}, ${this.camera.rotation.z.toFixed(2)}<br>
                    Velocity: ${this.localPlayer.velocity.x.toFixed(2)}, ${this.localPlayer.velocity.y.toFixed(2)}, ${this.localPlayer.velocity.z.toFixed(2)}<br>
                    <br>
                    Controls:<br>
                    - WASD: Move<br>
                    - Space: Jump<br>
                    - Shift: Sprint<br>
                    - Mouse: Look<br>
                    - Click: Shoot<br>
                    - 1-4: Change weapon<br>
                `;
            }
        }, 500);
    }
    
    addRemotePlayer(playerData) {
        if (this.remotePlayers[playerData.id] || playerData.id === this.firebaseManager.playerId) {
            return; // Already exists or is local player
        }
        
        console.log('Adding remote player:', playerData.name);
        
        const remotePlayer = new Player(
            playerData.id,
            playerData.name,
            false,
            this.scene,
            null
        );
        
        // Set initial state
        remotePlayer.setFromState(playerData);
        
        // Add to collection
        this.remotePlayers[playerData.id] = remotePlayer;
    }
    
    removeRemotePlayer(playerId) {
        if (!this.remotePlayers[playerId]) {
            return; // Doesn't exist
        }
        
        console.log('Removing remote player:', playerId);
        
        // Clean up resources
        this.remotePlayers[playerId].dispose();
        
        // Remove from collection
        delete this.remotePlayers[playerId];
    }
    
    startPowerupSpawning() {
        // Clear any existing interval
        if (this.powerupSpawnInterval) {
            clearInterval(this.powerupSpawnInterval);
        }
        
        // Spawn a powerup every 10-20 seconds
        this.powerupSpawnInterval = setInterval(() => {
            if (this.gameState === 'playing' && !this.isPaused && this.world) {
                const powerup = this.world.spawnPowerup();
                if (powerup) {
                    this.powerups.push(powerup);
                    
                    // Limit number of powerups
                    if (this.powerups.length > 10) {
                        const oldPowerup = this.powerups.shift();
                        this.scene.remove(oldPowerup);
                    }
                }
            }
        }, 10000 + Math.random() * 10000);
    }
    
    startPlayerSync() {
        // Clear any existing interval
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
        }
        
        // Sync player state every 100ms
        this.syncInterval = setInterval(() => {
            if (this.gameState === 'playing' && !this.isPaused && this.localPlayer) {
                // Get current player state
                const state = this.localPlayer.getState();
                
                // Send to Firebase
                this.firebaseManager.updatePlayerState(state);
                
                // Update UI
                const ammoStatus = this.localPlayer.weapons[this.localPlayer.selectedWeapon].getAmmoStatus();
                this.uiManager.updateHealth(this.localPlayer.health);
                this.uiManager.updateAmmo(ammoStatus.current, ammoStatus.magazineSize);
                this.uiManager.updateWeaponSelection(this.localPlayer.selectedWeapon);
            }
        }, 100);
    }
    
    checkBulletHit(origin, direction, weaponType, shooterId) {
        // Create raycaster
        const raycaster = new THREE.Raycaster(
            new THREE.Vector3(origin.x, origin.y, origin.z),
            new THREE.Vector3(direction.x, direction.y, direction.z).normalize()
        );
        
        // Check if ray hits local player
        if (this.localPlayer && this.localPlayer.hitbox) {
            const intersects = raycaster.intersectObject(this.localPlayer.hitbox);
            
            if (intersects.length > 0) {
                // Local player was hit
                const weaponConfig = GAME_SETTINGS.weapons[weaponType];
                const distance = intersects[0].distance;
                
                // Check if within weapon range
                if (distance <= weaponConfig.range) {
                    // Calculate damage based on distance (further = less damage)
                    let damage = weaponConfig.damage;
                    if (distance > weaponConfig.range * 0.5) {
                        const falloff = (distance - weaponConfig.range * 0.5) / (weaponConfig.range * 0.5);
                        damage *= (1 - falloff * 0.5); // Reduce damage by up to 50% based on distance
                    }
                    
                    // Record hit
                    this.firebaseManager.recordHit(
                        this.localPlayer.id,
                        Math.round(damage),
                        weaponType,
                        {
                            x: intersects[0].point.x,
                            y: intersects[0].point.y,
                            z: intersects[0].point.z
                        }
                    );
                }
            }
        }
    }
    
    playerDied(killerId) {
        console.log('Player died, killer:', killerId);
        
        // Record death
        this.firebaseManager.recordDeath(killerId);
        
        // Check if game over
        if (this.localPlayer.lives <= 0) {
            console.log('Game over - out of lives');
            
            // If host, end the game
            if (this.firebaseManager.isHost()) {
                // Find player with most kills
                let maxKills = -1;
                let winnerId = null;
                
                const players = this.firebaseManager.getPlayers();
                for (const id in players) {
                    if (players[id].kills > maxKills) {
                        maxKills = players[id].kills;
                        winnerId = id;
                    }
                }
                
                if (winnerId) {
                    this.firebaseManager.endGame(winnerId);
                }
            }
        }
    }
    
    endGame(winnerId) {
        console.log('Game ended, winner:', winnerId);
        
        // Show game over screen
        const winner = this.firebaseManager.getPlayer(winnerId);
        if (winner) {
            this.uiManager.showGameOver(winner.name);
        }
        
        // Stop game loop
        this.setGameState('gameover');
        this.stopGameLoop();
        
        // Clean up
        this.cleanupGame();
    }
    
    returnToMenu() {
        // Leave room
        this.firebaseManager.leaveRoom()
            .then(() => {
                console.log('Returned to menu');
                this.setGameState('menu');
                this.uiManager.showMenu();
            })
            .catch(error => {
                console.error('Error returning to menu:', error);
                alert('Error returning to menu: ' + error.message);
            });
    }
    
    animate() {
        if (this.gameState !== 'playing') return;
        
        // Get delta time
        const deltaTime = this.clock.getDelta();
        
        // Update controls
        if (this.controls && typeof this.controls.update === 'function') {
            try {
                this.controls.update();
            } catch (error) {
                console.error('Error updating controls:', error);
            }
        }
        
        // Update local player physics
        if (this.world && this.localPlayer) {
            try {
                this.world.handlePlayerPhysics(this.localPlayer, deltaTime);
            } catch (error) {
                console.error('Error in player physics:', error);
            }
        }
        
        // Update remote players
        for (const id in this.remotePlayers) {
            if (this.remotePlayers[id]) {
                try {
                    this.remotePlayers[id].update(deltaTime);
                } catch (error) {
                    console.error(`Error updating remote player ${id}:`, error);
                }
            }
        }
        
        // Update powerups
        if (this.world) {
            try {
                this.world.updatePowerups(this.powerups, deltaTime);
                
                // Check for powerup collection
                if (this.localPlayer) {
                    const collision = this.world.checkPowerupCollision(this.localPlayer, this.powerups);
                    if (collision) {
                        this.collectPowerup(collision);
                    }
                }
            } catch (error) {
                console.error('Error updating powerups:', error);
            }
        }
        
        // Render scene
        if (this.renderer && this.scene && this.camera) {
            try {
                this.renderer.render(this.scene, this.camera);
            } catch (error) {
                console.error('Error rendering scene:', error);
            }
        }
        
        // Request next frame
        this.animationFrameId = requestAnimationFrame(this.animate.bind(this));
    }
    
    collectPowerup(collision) {
        const { index, type, powerup } = collision;
        
        // Handle different powerup types
        switch (type) {
            case 'health':
                this.localPlayer.health = Math.min(100, this.localPlayer.health + 50);
                break;
            case 'ammo':
                // Add ammo to current weapon
                const weapon = this.localPlayer.weapons[this.localPlayer.selectedWeapon];
                if (weapon) {
                    weapon.reserveAmmo += weapon.config.magazineSize;
                }
                break;
            case 'armor':
                // Not implemented in this simple version
                break;
        }
        
        // Remove powerup
        this.scene.remove(powerup);
        this.powerups.splice(index, 1);
    }
    
    setGameState(state) {
        this.gameState = state;
        console.log('Game state changed to:', state);

        // Add explicit UI update based on state
        if (this.uiManager) {
            console.log('Explicitly updating UI for state:', state);
            switch (state) {
                case 'menu':
                    this.uiManager.showMenu();
                    break;
                case 'room':
                    if (this.firebaseManager && this.firebaseManager.currentRoom) {
                        this.uiManager.showRoom(this.firebaseManager.currentRoom);
                    }
                    break;
                case 'playing':
                    this.uiManager.showGameUI();
                    break;
                case 'gameover':
                    // Game over UI is handled separately
                    break;
                case 'loading':
                default:
                    this.uiManager.showLoading();
                    break;
            }
        }
    }
    
    stopGameLoop() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
        
        if (this.powerupSpawnInterval) {
            clearInterval(this.powerupSpawnInterval);
            this.powerupSpawnInterval = null;
        }
    }
    
    cleanupGame() {
        // Clean up resources
        
        // Dispose of controls
        if (this.controls) {
            this.controls.dispose();
            this.controls = null;
        }
        
        // Dispose of local player
        if (this.localPlayer) {
            this.localPlayer.dispose();
            this.localPlayer = null;
        }
        
        // Dispose of remote players
        for (const id in this.remotePlayers) {
            if (this.remotePlayers[id]) {
                this.remotePlayers[id].dispose();
            }
        }
        this.remotePlayers = {};
        
        // Dispose of world
        if (this.world) {
            this.world.dispose();
            this.world = null;
        }
        
        // Dispose of powerups
        for (const powerup of this.powerups) {
            this.scene.remove(powerup);
        }
        this.powerups = [];
        
        // Clear scene
        while(this.scene.children.length > 0){ 
            const object = this.scene.children[0];
            if (object.geometry) object.geometry.dispose();
            if (object.material) {
                if (Array.isArray(object.material)) {
                    object.material.forEach(material => material.dispose());
                } else {
                    object.material.dispose();
                }
            }
            this.scene.remove(object); 
        }
    }
    
    // Clean up resources
    dispose() {
        this.stopGameLoop();
        this.cleanupGame();
        
        // Dispose of UI manager
        if (this.uiManager) {
            this.uiManager.dispose();
        }
        
        // Clean up firebase listeners
        if (this.firebaseManager) {
            this.firebaseManager.cleanup();
        }
        
        // Remove renderer
        if (this.renderer) {
            document.body.removeChild(this.renderer.domElement);
            this.renderer.dispose();
        }
        
        // Remove window event listeners
        window.removeEventListener('resize', this.onWindowResize);
    }

    onRoomJoined(roomData) {
        console.log('Room joined from session restoration:', roomData);
        
        // Update game state
        this.setGameState('room');
        
        // Update UI
        this.uiManager.showRoomScreen(roomData.code);
        this.uiManager.updatePlayersList(roomData.players, this.firebaseManager.playerId);
        
        // Register callbacks for player updates
        this.setupFirebaseCallbacks();
    }

    // Clean up existing game world elements without destroying the scene
    cleanupGameWorld() {
        console.log('Cleaning up existing game world...');
        
        // Remove all objects except camera and lights
        const objectsToRemove = [];
        this.scene.traverse(object => {
            // Keep camera and lights
            if (object !== this.camera && 
                !(object instanceof THREE.AmbientLight) && 
                !(object instanceof THREE.DirectionalLight)) {
                objectsToRemove.push(object);
            }
        });
        
        // Remove objects from scene
        objectsToRemove.forEach(object => {
            this.scene.remove(object);
            if (object.geometry) object.geometry.dispose();
            if (object.material) {
                if (Array.isArray(object.material)) {
                    object.material.forEach(material => material.dispose());
                } else {
                    object.material.dispose();
                }
            }
        });
        
        // Reset player objects
        if (this.localPlayer) {
            this.localPlayer.dispose();
            this.localPlayer = null;
        }
        
        for (const id in this.remotePlayers) {
            if (this.remotePlayers[id]) {
                this.remotePlayers[id].dispose();
            }
        }
        this.remotePlayers = {};
        
        // Dispose of world
        if (this.world) {
            this.world.dispose();
            this.world = null;
        }
        
        // Dispose of powerups
        for (const powerup of this.powerups) {
            this.scene.remove(powerup);
        }
        this.powerups = [];
        
        // Dispose of controls
        if (this.controls) {
            this.controls.dispose();
            this.controls = null;
        }
        
        console.log('Game world cleanup complete');
    }
} 