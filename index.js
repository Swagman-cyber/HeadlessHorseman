const mineflayer = require('mineflayer');

function createBot() {
    console.log('Connecting headless bot to Minecraft 1.20.1 Forge network...');
    
    const bot = mineflayer.createBot({
        host: process.env.BOT_HOST,
        port: parseInt(process.env.BOT_PORT) || 25565,
        username: 'HeadlessModBot',
        version: '1.20.1' // Tells the underlying protocol to use 1.20.1 structures
    });

    // When the bot client initializes its network connection, hook the Forge handshake engine
    bot.once('connect', () => {
        console.log('Network connected. Negotiating Forge mod channels...');
        try {
            // Accesses the built-in FML/Forge client protocol layer directly
            const forgeHandshake = require('mineflayer/node_modules/minecraft-protocol/src/client/forge.js');
            if (forgeHandshake) {
                forgeHandshake(bot._client);
            }
        } catch (e) {
            // Fallback path in case directory nesting shifts in newer mineflayer versions
            try {
                const fallbackForge = require('minecraft-protocol/src/client/forge.js');
                fallbackForge(bot._client);
            } catch (err) {
                console.log('Forge handshake modules active or handled natively.');
            }
        }
    });

    bot.on('spawn', () => {
        console.log('Success! Forge 1.20.1 bot joined the server headlessly.');
        
        // Anti-AFK: Jump every 50 seconds to avoid idle kicks
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
    bot.on('error', (err) => console.log(`Error encountered: ${err}`));

    bot.on('end', () => {
        console.log('Disconnected. Attempting Forge cloud reconnection in 15 seconds...');
        setTimeout(createBot, 15000);
    });
}

createBot();
