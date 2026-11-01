const mineflayer = require('mineflayer');

function createBot() {
    console.log('Launching Headless Forge 1.20.1 (47.4.28) Emulation Runner...');

    const targetHost = process.env.BOT_HOST || 'localhost';
    
    // Injects the FML3 token descriptor straight into the initial pipeline
    const forgeTaggedHost = `${targetHost}\0FML3\0`;

    const bot = mineflayer.createBot({
        host: forgeTaggedHost,
        port: parseInt(process.env.BOT_PORT) || 25565,
        username: 'HeadlessModBot',
        version: '1.20.1', 
        auth: 'offline', // Clears custom authentication checks for cracked mode
        skipValidation: true
    });

    // Intercept Forge's login registry payloads before state shifts to 'spawn'
    bot._client.on('login_plugin_request', (packet) => {
        console.log(`\n[Forge Handshake] Channel: ${packet.channel} | MessageID: ${packet.messageId}`);
        console.log(`[Raw Payload Bytes]:`, packet.data);

        let responseData = Buffer.alloc(0);

        if (packet.channel === 'fml:loginwrapper') {
            // Read the internal channel name embedded inside the login wrapper
            // FML3 protocol strings are typically prefixed by their length as a VarInt or UTF-8 bytes
            const internalString = packet.data.toString('utf8', 1).replace(/[^a-zA-Z0-9_:]/g, '');
            console.log(`[Nested Protocol Sub-Channel]: ${internalString}`);

            // Default acknowledgement byte
            responseData = Buffer.from([0x01]);
        } 

        bot._client.write('login_plugin_response', {
            messageId: packet.messageId,
            data: responseData
        });
        
        console.log(`[Forge Handshake] Replied to sequence #${packet.messageId}`);
    });

    bot.on('spawn', () => {
        console.log('Success! Forge handshake cleared. Bot is now active in the server.');
        
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
        if (err.code === 'ECONNRESET') {
            console.log('Connection dropped by host. Verifying packet sync strings...');
        } else {
            console.log(`Network status notice: ${err.message}`);
        }
    });

    bot.on('end', () => {
        console.log('Socket disconnected. Re-attempting handshake spoof loop in 15 seconds...\n');
        setTimeout(createBot, 15000);
    });
}

createBot();
