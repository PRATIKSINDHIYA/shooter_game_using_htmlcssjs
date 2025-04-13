/**
 * Main entry point for the game
 */

// Initialize game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing 3D Multiplayer Shooter Game...');
    
    // Create and initialize game manager
    window.gameManager = new GameManager();
    
    // Add event listener for window close/reload to clean up resources
    window.addEventListener('beforeunload', () => {
        if (window.gameManager) {
            // Leave the room if in one
            if (window.gameManager.firebaseManager &&
                window.gameManager.firebaseManager.currentRoom) {
                // Don't actually leave the room, just clean up listeners
                window.gameManager.firebaseManager.cleanup();
            }
            
            // Clean up resources
            window.gameManager.dispose();
        }
    });
    
    // Show the loading screen initially
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
        loadingScreen.classList.remove('hidden');
    }
    
    // Wait a bit longer for Firebase to connect and restore session if any
    setTimeout(() => {
        console.log("Checking for saved sessions or showing menu");
        const menuScreen = document.getElementById('menu-screen');
        
        // Only show menu if not already in room state and no firebase session restored
        if (window.gameManager.gameState !== 'room' && menuScreen) {
            console.log("No active session found, showing menu");
            if (loadingScreen) {
                loadingScreen.classList.add('hidden');
            }
            menuScreen.classList.remove('hidden');
        } else {
            console.log("Active session found or game already in another state");
            if (loadingScreen) {
                loadingScreen.classList.add('hidden');
            }
        }
    }, 2500); // Increased timeout to ensure Firebase has time to connect
    
    console.log('Game initialized successfully!');
}); 