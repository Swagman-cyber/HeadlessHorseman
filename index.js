const mineflayer = require('mineflayer');
// Import the Prismarine ecosystem Forge helper module
const autoVersionForge = require("minecraft-protocol-forge/src/client/autoVersionForge");

function createBot() {
    console.log('Launching authenticated Forge 1.20.1 packet emulation runner...');
    
    const bot = mineflayer.createBot({
        host: process.env.BOT_HOST || 'localhost',
        port: parseInt(process.env.BOT_PORT) || 25565,
        username: 'HeadlessModBot',
        version: '1.20.1', // Enforces target protocol version
        skipValidation: true
    });

    // BEFORE the bot logs in, hook node-minecraft-protocol-forge into the client
    // Leaving the options block empty prompts the plugin to safely guess the required registry tokens
    const options = {
        forgeMods: undefined,
        channels: undefined
    };
    autoVersionForge(bot._client, options);

    bot.on('spawn', () => {
        console.log('Success! Handshake negotiated cleanly. Bot spawned into the world.');
        
        // Anti-AFK Jump Loop
        setInterval(() => {
            bot.setControlState('jump', true);
            setTimeout(() => bot.setControlState('jump', false), 500);
        }, 50000);
    });

    bot.on('chat', (username, message) => {
        if (username === bot.username) return;
        console.log(`${username}: ${message}`);
    });

    bot.on('kick', (reason) => console.log(`Kicked from server: ${reason}`));
    
    bot.on('error', (err) => {
        console.log(`Network status notice: ${err.message}`);
    });

    bot.on('end', () => {
        console.log('Socket disconnected. Re-attempting handshake spoof loop in 15 seconds...');
        setTimeout(createBot, 15000);
    });
}

createBot();
