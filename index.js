const mineflayer = require('mineflayer');

function createBot() {
    console.log('Connecting headless bot via fallback channel...');
    
    const bot = mineflayer.createBot({
        host: process.env.BOT_HOST,
        port: parseInt(process.env.BOT_PORT) || 25565,
        username: 'HeadlessModBot',
        version: '1.20.1',
        skipValidation: true, // Tells the client to ignore checking block/item custom registries
        checkTimeoutInterval: 60000 // Prevents sudden network handshake drops
    });

    bot.on('spawn', () => {
        console.log('Success! Headless bot bypassed handshakes and joined the server.');
        
        // Keep-Alive Jump
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
        console.log('Socket closed. Retrying connection loop in 15 seconds...');
        setTimeout(createBot, 15000);
    });
}

createBot();
