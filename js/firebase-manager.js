/**
 * Firebase Manager
 * Handles all database operations for multiplayer functionality
 */
class FirebaseManager {
    constructor() {
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
            this.roomsRef.child(roomCode).once('value')
                .then(snapshot => {
                    const roomData = snapshot.val();
                    if (!roomData) {
                        reject(new Error("Room not found"));
                        return;
                    }
                    
                    if (roomData.status !== 'waiting') {
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
                    
                    this.roomsRef.child(roomCode).child('players').child(this.playerId).set(playerData)
                        .then(() => {
                            this.players = roomData.players || {};
                            this.players[this.playerId] = playerData;
                            this.listenToRoomChanges(roomCode);
                            resolve(roomData);
                        })
                        .catch(error => {
                            console.error("Error joining room:", error);
                            reject(error);
                        });
                })
                .catch(error => {
                    console.error("Error checking room:", error);
                    reject(error);
                });
        });
    }

    // Leave the current room
    leaveRoom() {
        if (!this.currentRoom || !this.playerId) return Promise.resolve();
        
        return new Promise((resolve, reject) => {
            this.roomsRef.child(this.currentRoom).child('players').once('value')
                .then(snapshot => {
                    const players = snapshot.val() || {};
                    const remainingPlayers = Object.keys(players).filter(id => id !== this.playerId);
                    
                    // If this is the last player, remove the entire room
                    if (remainingPlayers.length === 0) {
                        this.roomsRef.child(this.currentRoom).remove()
                            .then(() => {
                                this.cleanup();
                                resolve();
                            })
                            .catch(reject);
                        return;
                    }
                    
                    // If this is the host, transfer host status to another player
                    if (players[this.playerId].isHost) {
                        const newHostId = remainingPlayers[0];
                        this.roomsRef.child(this.currentRoom).child('host').set(newHostId);
                        this.roomsRef.child(this.currentRoom).child('players').child(newHostId).child('isHost').set(true);
                    }
                    
                    // Remove this player
                    this.roomsRef.child(this.currentRoom).child('players').child(this.playerId).remove()
                        .then(() => {
                            this.cleanup();
                            resolve();
                        })
                        .catch(reject);
                })
                .catch(error => {
                    console.error("Error leaving room:", error);
                    reject(error);
                });
        });
    }

    // Start the game (host only)
    startGame() {
        if (!this.currentRoom || !this.isHost()) return Promise.reject(new Error("Only the host can start the game"));
        
        return this.roomsRef.child(this.currentRoom).child('status').set('playing');
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
        if (!this.currentRoom || !this.playerId) return;
        
        this.roomsRef.child(this.currentRoom).child('players').child(this.playerId).child('isReady').set(isReady);
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
            
            if (status === 'playing' && this.onGameStartCallback) {
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
} 