// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDSSWbJO-OM7dNWrgYTo7KgnN5MwgNmguM",
    authDomain: "multiplayer-711ee.firebaseapp.com",
    databaseURL: "https://multiplayer-711ee-default-rtdb.firebaseio.com",
    projectId: "multiplayer-711ee",
    storageBucket: "multiplayer-711ee.firebasestorage.app",
    messagingSenderId: "509424254150",
    appId: "1:509424254150:web:efe740cecc4e8758d5ebc7"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Game settings
const GAME_SETTINGS = {
    // Player settings
    player: {
        health: 100,
        lives: 5,
        moveSpeed: 7,
        sprintSpeed: 14,
        jumpForce: 10,
        height: 1.8,
        radius: 0.5
    },
    
    // Weapon settings
    weapons: {
        pistol: {
            name: "Pistol",
            damage: 25,
            range: 50,
            fireRate: 300, // milliseconds between shots
            reloadTime: 1000, // milliseconds
            magazineSize: 15,
            ammoType: "9mm",
            maxAmmo: 75,
            spread: 0.03,
            recoil: 0.2,
            model: "pistol",
            sound: "pistol_shot"
        },
        shotgun: {
            name: "Shotgun",
            damage: 15, // per pellet (fires multiple pellets)
            pellets: 8,
            range: 20,
            fireRate: 900,
            reloadTime: 2500,
            magazineSize: 6,
            ammoType: "12gauge",
            maxAmmo: 30,
            spread: 0.15,
            recoil: 0.8,
            model: "shotgun",
            sound: "shotgun_shot"
        },
        sniper: {
            name: "Sniper",
            damage: 100,
            range: 150,
            fireRate: 1500,
            reloadTime: 3000,
            magazineSize: 5,
            ammoType: "308",
            maxAmmo: 25,
            spread: 0.01,
            recoil: 1,
            model: "sniper",
            sound: "sniper_shot"
        },
        smg: {
            name: "SMG",
            damage: 15,
            range: 40,
            fireRate: 100,
            reloadTime: 1800,
            magazineSize: 30,
            ammoType: "9mm",
            maxAmmo: 120,
            spread: 0.05,
            recoil: 0.3,
            model: "smg",
            sound: "smg_shot"
        }
    },
    
    // World settings
    world: {
        gravity: 9.8,
        groundFriction: 0.8,
        airFriction: 0.2,
        mapSize: 100, // size of the map in meters
        skyboxTexture: "skybox",
        groundTexture: "ground"
    }
}; 