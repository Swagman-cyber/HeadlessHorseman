const mineflayer = require('mineflayer');

function createBot() {
    console.log('Launching Verified Forge 1.20.1 Handshake Modpack Emulator...');

    const targetHost = process.env.BOT_HOST || 'localhost';
    const forgeTaggedHost = `${targetHost}\0FML3\0`;

    const bot = mineflayer.createBot({
        host: forgeTaggedHost,
        port: parseInt(process.env.BOT_PORT) || 25565,
        username: 'HeadlessModBot',
        version: '1.20.1', 
        auth: 'offline',
        skipValidation: true
    });

    // Handle Forge's login wrappers smoothly using our dynamic mirroring loop
    bot._client.on('login_plugin_request', (packet) => {
        if (packet.channel !== 'fml:loginwrapper') {
            bot._client.write('login_plugin_response', {
                id: packet.messageId || packet.id,
                data: Buffer.alloc(0)
            });
            return;
        }

        const messageId = packet.messageId !== undefined ? packet.messageId : packet.id;
        const serverDiscriminator = (packet.data && packet.data.length > 0) ? packet.data : -1;
        
        console.log(`[Forge Handshake] Step #${messageId} | Sub-Channel Discriminator: 0x${serverDiscriminator.toString(16)}`);

        let responseData;

        try {
            if (messageId <= 1) {
                if (packet.data && packet.data.length > 1) {
                    responseData = Buffer.concat([
                        Buffer.from([0x01]), 
                        packet.data.subarray(1) 
                    ]);
                } else {
                    responseData = Buffer.from([0x01, 0x00]);
                }
            } else {
                if (packet.data && packet.data.length > 0) {
                    responseData = Buffer.from(packet.data); 
                } else {
                    responseData = Buffer.alloc(0);
                }
            }

            bot._client.write('login_plugin_response', {
                id: messageId,
                data: responseData
            });
            
            console.log(`[Forge Handshake] Cleared frame sequence #${messageId}`);
            
        } catch (error) {
            bot._client.write('login_plugin_response', {
                id: messageId,
                data: Buffer.from([0x01, 0x00])
            });
        }
    });

    // NEW 1.20.1 FIX: Explicitly acknowledge when the server shifts into the Configuration state
    bot._client.on('state', (newState) => {
        console.log(`[Network Engine] Pipeline transitioned to state: ${newState}`);
        
        if (newState === 'configuration') {
            console.log('[Network Engine] Bypassing 1.20.1 Configuration state constraints...');
            // Forces the underlying client to declare protocol synchronization ready 
            // so the server pushes the final play state map packet to the bot
            bot._client.write('configuration_acknowledged', {});
        }
    });

    bot.on('spawn', () => {
        console.log('\n======================================================');
        console.log('SUCCESS! Forge Handshake cleared completely.');
        console.log(`Bot status: Active in modded world as ${bot.username}`);
        console.log('======================================================\n');
        
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
        console.log('Socket disconnected. Re-attempting handshake spoof loop in 15 seconds...\n');
        setTimeout(createBot, 15000);
    });
}

createBot();
