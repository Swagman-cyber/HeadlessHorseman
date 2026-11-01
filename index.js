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
        console.log(`[Forge Handshake] Intercepted channel validation request: ${packet.channel}`);
        
        let responseData = Buffer.alloc(0);

        // Safely declare compliance back to the fml login wrapper sequence
        if (packet.channel === 'fml:loginwrapper') {
            // Write a standard 1-byte handshake response acknowledgement sequence
            responseData = Buffer.from([0x01]);
        } else if (packet.channel.includes('forge') || packet.channel.includes('fml')) {
            responseData = Buffer.from([0x00]); 
        }

        // CRITICAL PROTOCOL FIX: Write back using 'messageId' matching packet.messageId
        bot._client.write('login_plugin_response', {
            messageId: packet.messageId,
            data: responseData
        });
        
        console.log(`[Forge Handshake] Replied cleanly to transaction sequence #${packet.messageId}`);
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
