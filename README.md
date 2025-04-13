# 3D Multiplayer Shooter Game

A real-time 3D multiplayer shooting game using HTML, CSS, JavaScript, Three.js, and Firebase Realtime Database.

## Features

- **Multiplayer Room System**: Create or join rooms with unique codes
- **Gameplay Mechanics**: 5 lives per player, 4 different guns with unique properties
- **Realistic Shooting**: Bullet particles with hit detection
- **3D Environment**: Battle map with obstacles, lighting, and skybox
- **Powerups**: Health, ammo, and armor pickups that spawn randomly
- **UI**: Health bar, ammo counter, weapon selection, and kill feed

## How to Play

1. **Setup Firebase**:
   - Create a new Firebase project at [https://console.firebase.google.com/](https://console.firebase.google.com/)
   - Enable Realtime Database (start in test mode for simplicity)
   - Get your Firebase config (Project settings > General > Your apps > Firebase SDK snippet)
   - Replace the placeholder config in `js/config.js` with your Firebase config

2. **Launch the Game**:
   - Open `index.html` in a modern web browser
   - For best results, use a local or online web server
   - You can use tools like `http-server` (Node.js) or the Live Server extension in VS Code

3. **Create or Join a Room**:
   - Enter your player name
   - Click "Create Room" to start a new game
   - Share the room code with a friend
   - The friend enters the code and clicks "Join Room"
   - The host (room creator) can click "Start Game" when ready

4. **Controls**:
   - **WASD**: Movement
   - **Mouse**: Look around + Aim
   - **Left Click**: Shoot
   - **Number Keys (1–4)**: Switch Guns
   - **Shift**: Sprint
   - **R**: Reload
   - **Space**: Jump

5. **Weapons**:
   - **Pistol (1)**: Medium damage, fast reload
   - **Shotgun (2)**: High damage, short range
   - **Sniper (3)**: Long range, high damage, slow fire rate
   - **SMG (4)**: Low damage, high fire rate

## Game Objective

Eliminate your opponent by reducing their lives to zero. Each player starts with 5 lives and 100 health points. When health reaches 0, a life is lost and the player respawns. The player with remaining lives at the end wins!

## Technical Details

- **Three.js**: Used for 3D rendering
- **Firebase Realtime Database**: Used for multiplayer functionality
- **CSS**: Used for UI styling
- **JavaScript**: Used for game logic and networking

## Project Structure

```
/
├── index.html           # Main HTML file
├── css/
│   └── style.css        # CSS styles for UI
├── js/
│   ├── config.js        # Firebase configuration
│   ├── utils.js         # Utility functions
│   ├── firebase-manager.js  # Firebase integration
│   ├── game-manager.js  # Main game coordination
│   ├── player.js        # Player mechanics
│   ├── weapons.js       # Weapon mechanics
│   ├── controls.js      # Input handling
│   ├── world.js         # 3D environment
│   ├── ui.js            # UI management
│   └── main.js          # Entry point
└── assets/              # Game assets
    ├── models/          # 3D models
    ├── textures/        # Textures
    └── sounds/          # Sound effects
```

## Performance Tips

- The game uses real-time synchronization which can be bandwidth-intensive
- For better performance, consider:
  - Reducing the sync rate (currently 100ms)
  - Using lower resolution textures
  - Simplifying the 3D models
  - Adjusting the render distance

## Customization

You can customize various aspects of the game:
- Edit `js/config.js` to adjust weapon properties, player movement speed, etc.
- Modify `js/world.js` to change the map layout and obstacles
- Add custom models to the `assets/models/` directory and update references in the code

## Troubleshooting

- **Firebase connection issues**: Verify your Firebase config and ensure Realtime Database is enabled
- **Performance problems**: Try reducing the quality of the game in config.js
- **Controls not working**: Click on the game window to capture mouse input

## Credits

- **Three.js**: https://threejs.org/
- **Firebase**: https://firebase.google.com/ 

.player-status {
    padding: 3px 8px;
    border-radius: 4px;
    font-size: 0.8em;
}

.player-status.ready {
    background-color: #4CAF50;
    color: white;
}

.player-status.not-ready {
    background-color: #f44336;
    color: white;
} 