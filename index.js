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

    bot._client.on('login_plugin_request', (packet) => {
        if (packet.channel !== 'fml:loginwrapper') {
            bot._client.write('login_plugin_response', {
                id: packet.messageId !== undefined ? packet.messageId : packet.id,
                data: Buffer.alloc(0)
            });
            return;
        }

        const messageId = packet.messageId !== undefined ? packet.messageId : packet.id;
        const firstByte = (packet.data && packet.data.length > 0) ? packet.data[0] : -1;
        console.log(`[Forge Handshake] Step #${messageId} | Sub-Channel Discriminator: 0x${firstByte.toString(16)}`);

        let responseData;

        try {
            // STEP 0: TACZ Initial Channel Verification Hook
            if (messageId === 0) {
                responseData = Buffer.from([0x01, 0x00]);
            } 
            // STEP 1: Process the Server ModList Sync acknowledgement phase safely
            else if (messageId === 1) {
                // If the server provides data, build a protocol-compliant FML3 acknowledgement sequence
                if (packet.data && packet.data.length > 1) {
                    responseData = Buffer.concat([
                        Buffer.from([0x01]), // 0x01 declares successful transaction acknowledgment block
                        packet.data.subarray(1, Math.min(8, packet.data.length)) // Securely bind the tracking frame index keys
                    ]);
                } else {
                    responseData = Buffer.from([0x01, 0x01]);
                }
            } 
            // STEP 2 & Beyond: Safe continuation sync tracking mirror
            else {
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

    bot._client.on('state', (newState) => {
        console.log(`[Network Engine] Pipeline transitioned to state: ${newState}`);
        if (newState === 'configuration') {
            console.log('[Network Engine] Bypassing 1.20.1 Configuration state constraints...');
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

    bot.on('kick', (reason) => console.log(`Kicked from server: ${reason}`));
    bot.on('error', (err) => console.log(`Network status notice: ${err.message}`));

    bot.on('end', () => {
        console.log('Socket disconnected. Re-attempting handshake spoof loop in 15 seconds...\n');
        setTimeout(createBot, 15000);
    });
}

createBot();
