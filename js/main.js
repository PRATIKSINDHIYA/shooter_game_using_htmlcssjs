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
                window.gameManager.firebaseManager.leaveRoom();
            }
            
            // Clean up resources
            window.gameManager.dispose();
        }
    });
    
    // Force hide loading screen after a short delay
    setTimeout(() => {
        console.log("Force hiding loading screen");
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.classList.add('hidden');
        }
        
        const menuScreen = document.getElementById('menu-screen');
        if (menuScreen) {
            menuScreen.classList.remove('hidden');
        }
    }, 1500);
    
    console.log('Game initialized successfully!');
}); 