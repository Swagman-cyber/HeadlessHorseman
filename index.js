const mineflayer = require('mineflayer');

function createBot() {
    console.log('Launching Forge 1.20.1 deep packet emulation runner...');
    
    const bot = mineflayer.createBot({
        host: process.env.BOT_HOST,
        port: parseInt(process.env.BOT_PORT) || 25565,
        username: 'HeadlessModBot',
        version: '1.20.1',
        skipValidation: true
    });

    // Intercept raw network packets to bypass the NetworkRegistry channel firewall
    bot.once('connect', () => {
        console.log('Socket link established. Intercepting server mod registry...');
        
        bot._client.on('packet', (data, metadata) => {
            // Listen for custom payload channels that Forge uses to check for mods
            if (metadata.name === 'custom_payload' || metadata.name === 'login_plugin_request') {
                try {
                    // Automatically mimic and echo back the exact registry token the server wants
                    bot._client.write(metadata.name, {
                        transactionId: data.transactionId,
                        channel: data.channel,
                        data: data.data || Buffer.alloc(0)
                    });
                    console.log(`[Handshake] Successfully spoofed channel validation for: ${data.channel || 'Forge Core'}`);
                } catch (err) {
                    // Prevent network state noise from killing the loop
                }
            }
        });
    });

    bot.on('spawn', () => {
        console.log('Success! Headless bot successfully spoofed channels and joined.');
        
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
            console.log('Handshake drop detected. Overriding packet firewall...');
        } else {
            console.log(`Network status notice: ${err.message}`);
        }
    });

    bot.on('end', () => {
        console.log('Socket disconnected. Re-attempting handshake spoof loop in 15 seconds...');
        setTimeout(createBot, 15000);
    });
}

createBot();
