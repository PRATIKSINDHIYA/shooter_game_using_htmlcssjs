/**
 * UI Manager
 * Handles game UI updates and interactions
 */
class UIManager {
    constructor() {
        // UI elements
        this.loadingScreen = document.getElementById('loading-screen');
        this.menuScreen = document.getElementById('menu-screen');
        this.roomScreen = document.getElementById('room-screen');
        this.gameUI = document.getElementById('game-ui');
        this.gameOver = document.getElementById('game-over');
        
        // Menu elements
        this.playerNameInput = document.getElementById('player-name');
        this.createRoomBtn = document.getElementById('create-room-btn');
        this.roomCodeInput = document.getElementById('room-code-input');
        this.joinRoomBtn = document.getElementById('join-room-btn');
        
        // Room elements
        this.roomCodeDisplay = document.getElementById('room-code-display');
        this.playersList = document.getElementById('players-list');
        this.startGameBtn = document.getElementById('start-game-btn');
        this.leaveRoomBtn = document.getElementById('leave-room-btn');
        
        // Game UI elements
        this.healthFill = document.getElementById('health-fill');
        this.currentAmmo = document.getElementById('current-ammo');
        this.maxAmmo = document.getElementById('max-ammo');
        this.weaponSelector = document.getElementById('weapon-selector');
        this.killFeed = document.getElementById('kill-feed');
        this.winnerText = document.getElementById('winner-text');
        this.returnToMenuBtn = document.getElementById('return-to-menu-btn');
        
        // Initialize
        this.init();
    }
    
    init() {
        // Set up event listeners
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Menu buttons
        this.createRoomBtn.addEventListener('click', this.onCreateRoom.bind(this));
        this.joinRoomBtn.addEventListener('click', this.onJoinRoom.bind(this));
        
        // Find rooms button
        const listRoomsBtn = document.getElementById('list-rooms-btn');
        if (listRoomsBtn) {
            listRoomsBtn.addEventListener('click', this.onListRooms.bind(this));
        }
        
        // Room buttons
        this.startGameBtn.addEventListener('click', this.onStartGame.bind(this));
        this.leaveRoomBtn.addEventListener('click', this.onLeaveRoom.bind(this));
        
        // Game UI buttons
        this.returnToMenuBtn.addEventListener('click', this.onReturnToMenu.bind(this));
        
        // Weapon selector
        const weapons = this.weaponSelector.querySelectorAll('.weapon');
        weapons.forEach(weapon => {
            weapon.addEventListener('click', () => {
                const weaponType = weapon.dataset.weapon;
                if (window.gameManager && window.gameManager.localPlayer) {
                    window.gameManager.localPlayer.selectWeapon(weaponType);
                }
            });
        });
    }
    
    // Event handlers
    onCreateRoom() {
        const playerName = this.playerNameInput.value.trim();
        if (!playerName) {
            alert('Please enter your name');
            return;
        }
        
        if (window.gameManager) {
            window.gameManager.createRoom(playerName);
        }
    }
    
    onJoinRoom() {
        const playerName = this.playerNameInput.value.trim();
        if (!playerName) {
            alert('Please enter your name');
            return;
        }
        
        // Normalize room code: trim whitespace and convert to uppercase
        let roomCode = this.roomCodeInput.value.trim().toUpperCase();
        if (!roomCode) {
            alert('Please enter a room code');
            return;
        }
        
        console.log(`Attempting to join room with code: '${roomCode}'`);
        
        if (window.gameManager) {
            window.gameManager.joinRoom(roomCode, playerName);
        }
    }
    
    onStartGame() {
        if (window.gameManager) {
            window.gameManager.startGame();
        }
    }
    
    onLeaveRoom() {
        if (window.gameManager) {
            window.gameManager.leaveRoom();
        }
    }
    
    onReturnToMenu() {
        if (window.gameManager) {
            window.gameManager.returnToMenu();
        }
    }
    
    onListRooms() {
        if (!window.firebaseManager) {
            alert('Firebase not initialized');
            return;
        }
        
        // Show loading indicator
        alert('Checking for available rooms...');
        
        // Get a reference to the rooms in Firebase
        const roomsRef = firebase.database().ref('rooms');
        
        // Get the list of rooms
        roomsRef.once('value')
            .then(snapshot => {
                const rooms = snapshot.val();
                if (!rooms) {
                    alert('No rooms available. Create a new room to start playing.');
                    return;
                }
                
                // Create a message with available room codes
                const availableRooms = Object.keys(rooms)
                    .filter(code => rooms[code].status === 'waiting')
                    .map(code => `- ${code} (Created by: ${rooms[code].players[rooms[code].host]?.name || 'Unknown'})`)
                    .join('\n');
                
                if (availableRooms.length > 0) {
                    alert(`Available rooms:\n${availableRooms}`);
                } else {
                    alert('No rooms available in waiting status. Create a new room to start playing.');
                }
            })
            .catch(error => {
                console.error('Error listing rooms:', error);
                alert(`Error listing rooms: ${error.message}`);
            });
    }
    
    // Show/hide screens
    showLoading() {
        hideElement(this.menuScreen);
        hideElement(this.roomScreen);
        hideElement(this.gameUI);
        hideElement(this.gameOver);
        showElement(this.loadingScreen);
    }
    
    showMenu() {
        console.log("Showing menu - UI Manager");
        hideElement(this.loadingScreen);
        hideElement(this.roomScreen);
        hideElement(this.gameUI);
        hideElement(this.gameOver);
        showElement(this.menuScreen);
        console.log("Menu elements:", {
            menuScreen: this.menuScreen,
            loadingScreen: this.loadingScreen
        });
    }
    
    showRoom(roomCode) {
        hideElement(this.loadingScreen);
        hideElement(this.menuScreen);
        hideElement(this.gameUI);
        hideElement(this.gameOver);
        showElement(this.roomScreen);
        
        // Set room code display
        this.roomCodeDisplay.textContent = roomCode;
    }
    
    showGameUI() {
        hideElement(this.loadingScreen);
        hideElement(this.menuScreen);
        hideElement(this.roomScreen);
        hideElement(this.gameOver);
        showElement(this.gameUI);
    }
    
    showGameOver(winnerName) {
        this.winnerText.textContent = `${winnerName} Wins!`;
        showElement(this.gameOver);
    }
    
    // Update UI elements based on player state
    updatePlayersList(players, localPlayerId) {
        this.playersList.innerHTML = '';
        
        Object.values(players).forEach(player => {
            const playerItem = document.createElement('div');
            playerItem.classList.add('player-item');
            
            if (player.id === localPlayerId) {
                playerItem.classList.add('local-player');
            }
            
            if (player.isHost) {
                playerItem.classList.add('host');
            }
            
            playerItem.innerHTML = `
                <span class="player-name">${player.name}</span>
                <span class="player-status">${player.isReady ? 'Ready' : 'Not Ready'}</span>
            `;
            
            this.playersList.appendChild(playerItem);
        });
        
        // Show/hide start game button based on whether local player is host
        const localPlayer = players[localPlayerId];
        if (localPlayer && localPlayer.isHost) {
            this.startGameBtn.style.display = 'block';
        } else {
            this.startGameBtn.style.display = 'none';
        }
    }
    
    updateHealth(health) {
        const percentage = Math.max(0, health);
        this.healthFill.style.width = `${percentage}%`;
        
        // Change color based on health
        if (percentage > 60) {
            this.healthFill.style.backgroundColor = '#4CAF50'; // Green
        } else if (percentage > 30) {
            this.healthFill.style.backgroundColor = '#FFC107'; // Yellow
        } else {
            this.healthFill.style.backgroundColor = '#F44336'; // Red
        }
    }
    
    updateAmmo(current, max) {
        this.currentAmmo.textContent = current;
        this.maxAmmo.textContent = max;
    }
    
    updateWeaponSelection(weaponType) {
        // Remove active class from all weapons
        const weapons = this.weaponSelector.querySelectorAll('.weapon');
        weapons.forEach(weapon => weapon.classList.remove('active'));
        
        // Add active class to selected weapon
        const selectedWeapon = this.weaponSelector.querySelector(`.weapon[data-weapon="${weaponType}"]`);
        if (selectedWeapon) {
            selectedWeapon.classList.add('active');
        }
    }
    
    addKillFeedMessage(killerName, victimName, weaponType) {
        const killMessage = document.createElement('div');
        killMessage.classList.add('kill-message');
        killMessage.innerHTML = `${killerName} <span class="weapon">[${weaponType}]</span> ${victimName}`;
        
        this.killFeed.appendChild(killMessage);
        
        // Remove message after animation ends
        setTimeout(() => {
            if (killMessage.parentNode === this.killFeed) {
                this.killFeed.removeChild(killMessage);
            }
        }, 3000);
    }
    
    // Utility methods
    getPlayerName() {
        return this.playerNameInput.value.trim();
    }
    
    // Clean up resources
    dispose() {
        // Remove event listeners
        this.createRoomBtn.removeEventListener('click', this.onCreateRoom);
        this.joinRoomBtn.removeEventListener('click', this.onJoinRoom);
        
        // Remove list rooms button listener
        const listRoomsBtn = document.getElementById('list-rooms-btn');
        if (listRoomsBtn) {
            listRoomsBtn.removeEventListener('click', this.onListRooms);
        }
        
        this.startGameBtn.removeEventListener('click', this.onStartGame);
        this.leaveRoomBtn.removeEventListener('click', this.onLeaveRoom);
        this.returnToMenuBtn.removeEventListener('click', this.onReturnToMenu);
        
        const weapons = this.weaponSelector.querySelectorAll('.weapon');
        weapons.forEach(weapon => {
            const weaponType = weapon.dataset.weapon;
            weapon.removeEventListener('click', () => {
                if (window.gameManager && window.gameManager.localPlayer) {
                    window.gameManager.localPlayer.selectWeapon(weaponType);
                }
            });
        });
    }
} 