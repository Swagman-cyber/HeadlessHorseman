const mineflayer = require('mineflayer');

function createBot() {
    console.log('Launching Headless Forge 1.20.1 (47.4.28) Emulation Runner...');

    const targetHost = process.env.BOT_HOST || 'localhost';
    
    // Explicitly forces the underlying network socket to append the Forge 3 delimiter.
    const forgeTaggedHost = `${targetHost}\0FML3\0`;

    const bot = mineflayer.createBot({
        host: forgeTaggedHost,
        port: parseInt(process.env.BOT_PORT) || 25565,
        username: 'HeadlessModBot',
        version: '1.20.1', 
        auth: 'offline', // Enforces cracked mode authentication protocol
        skipValidation: true
    });

    // Intercept Forge's login registry payloads before state shifts to 'spawn'
    bot._client.on('login_plugin_request', (packet) => {
        console.log(`[Forge Handshake] Intercepted channel validation request: ${packet.channel}`);
        
        let responseData = Buffer.alloc(0);

        // Handle modern FML3 login wrapper sequences safely
        if (packet.channel === 'fml:loginwrapper') {
            // Write a standard 1-byte success response state (0x01 = ACK / Client Mod List Follows/Complete)
            responseData = Buffer.from([0x01]);
        } else if (packet.channel.includes('forge') || packet.channel.includes('fml')) {
            responseData = Buffer.from([0x00]); 
        }

        // CRITICAL FIX: Use packet.id instead of packet.transactionId
        bot._client.write('login_plugin_response', {
            id: packet.id,
            data: responseData
        });
        
        console.log(`[Forge Handshake] Replied cleanly to transaction sequence #${packet.id}`);
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
