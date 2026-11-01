const mineflayer = require('mineflayer');
// Loads the core Forge autoVersion plugin straight from the source dependency
const { autoVersionForge } = require('minecraft-protocol-forge');

function createBot() {
    console.log('Launching automated Forge 1.20.1 packet emulation runner...');
    
    const bot = mineflayer.createBot({
        host: process.env.BOT_HOST || 'localhost',
        port: parseInt(process.env.BOT_PORT) || 25565,
        username: 'HeadlessModBot',
        version: '1.20.1', 
        skipValidation: true
    });

    // Automatically hooks and mimics the server's demanded FML/Forge mod registry tokens
    autoVersionForge(bot._client);

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
    bot.on('error', (err) => console.log(`Network status notice: ${err.message}`));

    bot.on('end', () => {
        console.log('Socket disconnected. Re-attempting handshake spoof loop in 15 seconds...');
        setTimeout(createBot, 15000);
    });
}

createBot();
