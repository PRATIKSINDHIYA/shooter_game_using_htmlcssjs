/**
 * Firebase Manager
 * Handles all database operations for multiplayer functionality
 */
class FirebaseManager {
    constructor() {
        // Verify firebase config
        if (!firebase.apps.length) {
            console.error("Firebase not initialized!");
            alert("Firebase not initialized correctly. Check your config.");
            return;
        }
        
        // Verify database URL exists
        if (!firebaseConfig.databaseURL) {
            console.error("Firebase Database URL is missing in config!");
            alert("Firebase Database URL is missing. Check your config.js file.");
            return;
        }
        
        this.database = firebase.database();
        this.roomsRef = this.database.ref('rooms');
        this.currentRoom = null;
        this.playerId = null;
        this.playerName = null;
        this.players = {};
        this.onPlayerJoinedCallback = null;
        this.onPlayerLeftCallback = null;
        this.onGameStartCallback = null;
        this.onPlayerUpdateCallback = null;
        this.onPlayerShootCallback = null;
        this.onPlayerHitCallback = null;
        this.onGameEndCallback = null;
        
        // Try to restore session from localStorage
        this.tryRestoreSession();
        
        // Test connection
        this.testDatabaseConnection();
    }

    // Test connection to Firebase
    testDatabaseConnection() {
        const connectedRef = firebase.database().ref(".info/connected");
        connectedRef.on("value", (snap) => {
            if (snap.val() === true) {
                console.log("Connected to Firebase Database");
                
                // Test write permission by writing to a test location
                this.database.ref('connection_test').set({
                    timestamp: firebase.database.ServerValue.TIMESTAMP,
                    test: 'Connection test'
                })
                .then(() => {
                    console.log("Write permissions confirmed");
                    // Clean up test data
                    this.database.ref('connection_test').remove();
                })
                .catch(error => {
                    console.error("Error testing write permissions:", error);
                    alert("Firebase permission error: " + error.message + ". Check your database rules.");
                });
            } else {
                console.log("Disconnected from Firebase Database");
            }
        });
    }

    // Create a new game room
    createRoom(playerName) {
        return new Promise((resolve, reject) => {
            const roomCode = generateRoomCode();
            this.playerName = playerName;
            this.playerId = this.database.ref().push().key;
            
            const playerData = {
                id: this.playerId,
                name: playerName,
                isHost: true,
                isReady: false,
                position: { x: 0, y: 1, z: 0 },
                rotation: { x: 0, y: 0, z: 0 },
                health: GAME_SETTINGS.player.health,
                lives: GAME_SETTINGS.player.lives,
                selectedWeapon: 'pistol',
                color: generateRandomColor(),
                kills: 0,
                deaths: 0
            };
            
            const roomData = {
                code: roomCode,
                host: this.playerId,
                status: 'waiting',
                createdAt: firebase.database.ServerValue.TIMESTAMP,
                players: {
                    [this.playerId]: playerData
                }
            };
            
            this.roomsRef.child(roomCode).set(roomData)
                .then(() => {
                    this.currentRoom = roomCode;
                    this.players[this.playerId] = playerData;
                    this.listenToRoomChanges(roomCode);
                    // Save session data to localStorage
                    this.saveSessionToStorage();
                    resolve(roomCode);
                })
                .catch(error => {
                    console.error("Error creating room:", error);
                    reject(error);
                });
        });
    }

    // Join an existing room
    joinRoom(roomCode, playerName) {
        return new Promise((resolve, reject) => {
            console.log(`Attempting to join room: '${roomCode}' with name: '${playerName}'`);
            
            // List all available rooms for debugging
            this.roomsRef.once('value')
                .then(snapshot => {
                    const allRooms = snapshot.val();
                    console.log("Available rooms:", Object.keys(allRooms || {}));
                    
                    // Now try to join the specific room
                    this.roomsRef.child(roomCode).once('value')
                        .then(snapshot => {
                            const roomData = snapshot.val();
                            console.log(`Room data for '${roomCode}':`, roomData);
                            
                            if (!roomData) {
                                console.error(`Room not found: '${roomCode}'`);
                                reject(new Error("Room not found"));
                                return;
                            }
                            
                            if (roomData.status !== 'waiting') {
                                console.error(`Game already in progress for room: '${roomCode}'`);
                                reject(new Error("Game already in progress"));
                                return;
                            }
                            
                            this.playerName = playerName;
                            this.playerId = this.database.ref().push().key;
                            this.currentRoom = roomCode;
                            
                            const playerData = {
                                id: this.playerId,
                                name: playerName,
                                isHost: false,
                                isReady: false,
                                position: { x: 0, y: 1, z: 5 },
                                rotation: { x: 0, y: 0, z: 0 },
                                health: GAME_SETTINGS.player.health,
                                lives: GAME_SETTINGS.player.lives,
                                selectedWeapon: 'pistol',
                                color: generateRandomColor(),
                                kills: 0,
                                deaths: 0
                            };
                            
                            console.log(`Adding player to room: '${roomCode}'`, playerData);
                            
                            this.roomsRef.child(roomCode).child('players').child(this.playerId).set(playerData)
                                .then(() => {
                                    console.log(`Successfully joined room: '${roomCode}'`);
                                    this.players = roomData.players || {};
                                    this.players[this.playerId] = playerData;
                                    this.listenToRoomChanges(roomCode);
                                    // Save session data to localStorage
                                    this.saveSessionToStorage();
                                    resolve(roomData);
                                })
                                .catch(error => {
                                    console.error(`Error joining room: '${roomCode}'`, error);
                                    reject(error);
                                });
                        })
                        .catch(error => {
                            console.error(`Error checking room: '${roomCode}'`, error);
                            reject(error);
                        });
                })
                .catch(error => {
                    console.error("Error listing all rooms:", error);
                    reject(new Error("Could not access rooms list. Check your Firebase rules."));
                });
        });
    }

    // Leave the current room
    leaveRoom() {
        if (!this.currentRoom || !this.playerId) return Promise.resolve();
        
        return new Promise((resolve, reject) => {
            // Check if this player is the host
            this.roomsRef.child(this.currentRoom).child('host').once('value', snapshot => {
                const hostId = snapshot.val();
                
                // If this player is the host and there are other players, transfer host role
                if (hostId === this.playerId) {
                    const otherPlayers = Object.keys(this.players).filter(id => id !== this.playerId);
                    
                    if (otherPlayers.length > 0) {
                        // Transfer host role to another player
                        const newHostId = otherPlayers[0];
                        
                        this.roomsRef.child(this.currentRoom).child('host').set(newHostId)
                            .then(() => {
                                this.roomsRef.child(this.currentRoom).child('players').child(newHostId).child('isHost').set(true);
                            })
                            .catch(error => {
                                console.error("Error transferring host role:", error);
                            });
                    } else {
                        // This is the last player, delete the room
                        this.roomsRef.child(this.currentRoom).remove()
                            .catch(error => {
                                console.error("Error removing room:", error);
                            });
                    }
                }
                
                // Remove this player from the room
                this.roomsRef.child(this.currentRoom).child('players').child(this.playerId).remove()
                    .then(() => {
                        // Clean up resources
                        this.cleanup();
                        // Clear session storage
                        this.clearSessionStorage();
                        resolve();
                    })
                    .catch(error => {
                        console.error("Error leaving room:", error);
                        reject(error);
                    });
            });
        });
    }

    // Start the game (host only)
    startGame() {
        if (!this.currentRoom || !this.isHost()) {
            return Promise.reject(new Error("Only the host can start the game"));
        }
        
        console.log('Setting room status to playing...');
        return this.roomsRef.child(this.currentRoom).child('status').set('playing')
            .then(() => {
                console.log('Room status successfully set to playing');
                return true;
            });
    }

    // Update player position, rotation, etc.
    updatePlayerState(data) {
        if (!this.currentRoom || !this.playerId) return;
        
        this.roomsRef.child(this.currentRoom).child('players').child(this.playerId).update(data);
    }

    // Record a shot fired by the player
    recordShot(weaponType, origin, direction) {
        if (!this.currentRoom || !this.playerId) return;
        
        const shotData = {
            playerId: this.playerId,
            weaponType,
            origin,
            direction,
            timestamp: firebase.database.ServerValue.TIMESTAMP
        };
        
        this.roomsRef.child(this.currentRoom).child('shots').push(shotData);
    }

    // Record a hit on another player
    recordHit(targetPlayerId, damage, weaponType, hitLocation) {
        if (!this.currentRoom || !this.playerId) return;
        
        const hitData = {
            shooterId: this.playerId,
            targetId: targetPlayerId,
            damage,
            weaponType,
            hitLocation,
            timestamp: firebase.database.ServerValue.TIMESTAMP
        };
        
        this.roomsRef.child(this.currentRoom).child('hits').push(hitData);
    }

    // Record player death
    recordDeath(killerId) {
        if (!this.currentRoom || !this.playerId) return;
        
        this.roomsRef.child(this.currentRoom).child('players').child(this.playerId).transaction(player => {
            if (player) {
                player.deaths = (player.deaths || 0) + 1;
                player.lives = player.lives - 1;
                player.health = GAME_SETTINGS.player.health; // Reset health on death
            }
            return player;
        });
        
        if (killerId && killerId !== this.playerId) {
            this.roomsRef.child(this.currentRoom).child('players').child(killerId).transaction(player => {
                if (player) {
                    player.kills = (player.kills || 0) + 1;
                }
                return player;
            });
        }
    }

    // End the game
    endGame(winnerId) {
        if (!this.currentRoom || !this.isHost()) return;
        
        this.roomsRef.child(this.currentRoom).update({
            status: 'ended',
            winner: winnerId,
            endedAt: firebase.database.ServerValue.TIMESTAMP
        });
    }

    // Check if current player is the host
    isHost() {
        if (!this.currentRoom || !this.playerId || !this.players[this.playerId]) return false;
        return this.players[this.playerId].isHost;
    }

    // Get all players in the room
    getPlayers() {
        return this.players;
    }

    // Get player by ID
    getPlayer(playerId) {
        return this.players[playerId];
    }

    // Get current player
    getCurrentPlayer() {
        return this.players[this.playerId];
    }

    // Set player ready status
    setPlayerReady(isReady) {
        if (!this.currentRoom || !this.playerId) return Promise.reject(new Error('Not in a room'));
        
        console.log(`Setting player ready status to: ${isReady}`);
        
        return this.roomsRef.child(this.currentRoom)
            .child('players')
            .child(this.playerId)
            .child('isReady')
            .set(isReady)
            .then(() => {
                // Update local cache immediately so it's reflected in UI
                if (this.players[this.playerId]) {
                    this.players[this.playerId].isReady = isReady;
                }
                return isReady;
            });
    }

    // Listen to room changes
    listenToRoomChanges(roomCode) {
        // Listen to players joining/leaving
        this.roomsRef.child(roomCode).child('players').on('child_added', snapshot => {
            const playerData = snapshot.val();
            this.players[snapshot.key] = playerData;
            
            if (this.onPlayerJoinedCallback && snapshot.key !== this.playerId) {
                this.onPlayerJoinedCallback(playerData);
            }
        });
        
        this.roomsRef.child(roomCode).child('players').on('child_removed', snapshot => {
            const playerData = this.players[snapshot.key];
            delete this.players[snapshot.key];
            
            if (this.onPlayerLeftCallback && snapshot.key !== this.playerId) {
                this.onPlayerLeftCallback(playerData);
            }
        });
        
        // Listen to player updates
        this.roomsRef.child(roomCode).child('players').on('child_changed', snapshot => {
            const playerData = snapshot.val();
            this.players[snapshot.key] = playerData;
            
            if (this.onPlayerUpdateCallback && snapshot.key !== this.playerId) {
                this.onPlayerUpdateCallback(playerData);
            }
        });
        
        // Listen to game status changes
        this.roomsRef.child(roomCode).child('status').on('value', snapshot => {
            const status = snapshot.val();
            console.log('Room status changed to:', status);
            
            if (status === 'playing' && this.onGameStartCallback) {
                console.log('Received playing status, triggering game start callback...');
                this.onGameStartCallback();
            } else if (status === 'ended' && this.onGameEndCallback) {
                this.roomsRef.child(roomCode).child('winner').once('value', winnerSnapshot => {
                    const winnerId = winnerSnapshot.val();
                    this.onGameEndCallback(winnerId, this.players[winnerId]);
                });
            }
        });
        
        // Listen to shots fired
        this.roomsRef.child(roomCode).child('shots').on('child_added', snapshot => {
            const shotData = snapshot.val();
            
            if (this.onPlayerShootCallback && shotData.playerId !== this.playerId) {
                this.onPlayerShootCallback(shotData);
            }
        });
        
        // Listen to hits
        this.roomsRef.child(roomCode).child('hits').on('child_added', snapshot => {
            const hitData = snapshot.val();
            
            if (this.onPlayerHitCallback) {
                if (hitData.targetId === this.playerId) {
                    // We were hit
                    this.onPlayerHitCallback(hitData, true);
                } else if (hitData.shooterId === this.playerId) {
                    // We hit someone
                    this.onPlayerHitCallback(hitData, false);
                }
            }
        });
    }

    // Set callback functions
    onPlayerJoined(callback) {
        this.onPlayerJoinedCallback = callback;
    }
    
    onPlayerLeft(callback) {
        this.onPlayerLeftCallback = callback;
    }
    
    onGameStart(callback) {
        this.onGameStartCallback = callback;
    }
    
    onPlayerUpdate(callback) {
        this.onPlayerUpdateCallback = callback;
    }
    
    onPlayerShoot(callback) {
        this.onPlayerShootCallback = callback;
    }
    
    onPlayerHit(callback) {
        this.onPlayerHitCallback = callback;
    }
    
    onGameEnd(callback) {
        this.onGameEndCallback = callback;
    }

    // Clean up listeners and reset state
    cleanup() {
        if (this.currentRoom) {
            this.roomsRef.child(this.currentRoom).child('players').off();
            this.roomsRef.child(this.currentRoom).child('status').off();
            this.roomsRef.child(this.currentRoom).child('shots').off();
            this.roomsRef.child(this.currentRoom).child('hits').off();
        }
        
        this.currentRoom = null;
        this.playerId = null;
        this.playerName = null;
        this.players = {};
    }

    // Save session data to localStorage
    saveSessionToStorage() {
        if (this.currentRoom && this.playerId && this.playerName) {
            const sessionData = {
                currentRoom: this.currentRoom,
                playerId: this.playerId,
                playerName: this.playerName
            };
            localStorage.setItem('gameSession', JSON.stringify(sessionData));
        }
    }

    // Try to restore session from localStorage
    tryRestoreSession() {
        try {
            const sessionData = localStorage.getItem('gameSession');
            if (sessionData) {
                const { currentRoom, playerId, playerName } = JSON.parse(sessionData);
                
                if (currentRoom && playerId && playerName) {
                    console.log('Restoring session from localStorage:', { currentRoom, playerId });
                    
                    // Restore session data
                    this.currentRoom = currentRoom;
                    this.playerId = playerId;
                    this.playerName = playerName;
                    
                    // Check if room still exists and re-establish connection
                    this.roomsRef.child(currentRoom).once('value', snapshot => {
                        const roomData = snapshot.val();
                        if (roomData) {
                            // Room exists, check if player is still in the room
                            const playerExists = roomData.players && roomData.players[playerId];
                            if (playerExists) {
                                // Player is still in the room, reconnect
                                this.players = roomData.players || {};
                                this.listenToRoomChanges(currentRoom);
                                
                                // Notify the game manager to switch to room state
                                if (window.gameManager) {
                                    window.gameManager.onRoomJoined(roomData);
                                }
                            } else {
                                // Player is not in the room anymore, clear session
                                this.clearSessionStorage();
                            }
                        } else {
                            // Room doesn't exist anymore, clear session
                            this.clearSessionStorage();
                        }
                    });
                }
            }
        } catch (error) {
            console.error('Error restoring session:', error);
            this.clearSessionStorage();
        }
    }

    // Clear session storage
    clearSessionStorage() {
        localStorage.removeItem('gameSession');
        this.currentRoom = null;
        this.playerId = null;
        this.playerName = null;
        this.players = {};
    }
} 