const mineflayer = require('mineflayer');
const forge = require('mineflayer-modded-anvil'); 

function createBot() {
    console.log('Connecting headless bot to Minecraft 1.20.1 Forge network...');
    
    const bot = mineflayer.createBot({
        host: process.env.BOT_HOST,
        port: parseInt(process.env.BOT_PORT) || 25565,
        username: 'HeadlessModBot',
        version: '1.20.1' // Forces the bot to use the exact 1.20.1 network protocol
    });

    // Injects modern Forge handshake channels into the connection
    forge.forgeHandshake(bot);

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
