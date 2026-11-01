const mineflayer = require('mineflayer');

function createBot() {
    console.log('Launching specialized Forge 1.20.1 emulation protocol...');
    
    const bot = mineflayer.createBot({
        host: process.env.BOT_HOST,
        port: parseInt(process.env.BOT_PORT) || 25565,
        username: 'HeadlessModBot',
        version: '1.20.1',
        skipValidation: true
    });

    // Manually register standard Forge channels to bypass immediate ECONNRESET
    bot.once('connect', () => {
        console.log('Network socket connected. Emulating custom Forge client channels...');
        bot._client.on('custom_payload', (packet) => {
            // Echo back or handle forge/fml channel registration queries safely
            if (packet.channel === 'minecraft:register' || packet.channel === 'fml:loginwrapper') {
                try {
                    bot._client.write('custom_payload', {
                        channel: packet.channel,
                        data: packet.data
                    });
                } catch (err) {
                    // Fail silently to prevent crashing the script execution
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
            console.log('Notice: Connection handshake dropped by modded firewall. Retrying...');
        } else {
            console.log(`Network notice: ${err.message}`);
        }
    });

    bot.on('end', () => {
        console.log('Socket disconnected. Re-attempting handshake in 15 seconds...');
        setTimeout(createBot, 15000);
    });
}

createBot();
