const mineflayer = require('mineflayer');

function createBot() {
    console.log('Launching automated Forge 1.20.1 packet emulation runner...');
    
    const bot = mineflayer.createBot({
        host: process.env.BOT_HOST || 'localhost',
        port: parseInt(process.env.BOT_PORT) || 25565,
        username: 'HeadlessModBot',
        version: '1.20.1', 
        skipValidation: true
    });

    // Handle modern login plugin channels directly through the core protocol state
    bot._client.on('login_plugin_request', (packet) => {
        // Log the exact channel Forge is checking
        console.log(`[Handshake Interrupt] Server requested channel verification: ${packet.channel}`);
        
        // Formulate a structurally valid modern 1.20.1 empty response payload.
        // Giving a null data buffer causes Forge 1.20.1 to classify the bot as an optimized vanilla/headless link
        bot._client.write('login_plugin_response', {
            transactionId: packet.transactionId,
            data: Buffer.alloc(0) // Safe empty data compliance array
        });
        console.log(`[Handshake Sync] Handled transaction sequence #${packet.transactionId}`);
    });

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
