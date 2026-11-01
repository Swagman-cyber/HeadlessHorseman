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
        const firstByteNum = (packet.data && packet.data.length > 0) ? packet.data[0] : -1;
        console.log(`[Forge Handshake] Step #${messageId} | Sub-Channel Discriminator: 0x${firstByteNum.toString(16)}`);

        let responseData;

        try {
            // SCENARIO 1: TACZ Custom Initial Handshake (0x0e)
            if (firstByteNum === 0x0e || messageId === 0) {
                responseData = Buffer.from([0x01, 0x00]);
                console.log(`[Forge Handshake] Verified initial mod hook context for Step #${messageId}`);
            } 
            // SCENARIO 2: Forge Chunk Stream Finalizer (FML3 Protocol Step #2 closing bracket)
            else if (firstByteNum === 0x0d && messageId === 2) {
                // REFINED PROTOCOL FIX: Send a strict, standard 2-byte FML3 mod registry compilation closing token
                // This tells the Aternos server that our mod-registry parsing state machine has cleanly concluded
                responseData = Buffer.from([0x02, 0x00]);
                console.log(`[Forge Handshake] Sent FML3 Final Configuration Acknowledgment for Step #${messageId}`);
            }
            // SCENARIO 3: Standard FML3 Multi-part Chunk Receipt (Step 1 or intermediate 0x0d packets)
            else if (firstByteNum === 0x0d) {
                if (packet.data && packet.data.length > 1) {
                    responseData = Buffer.concat([
                        Buffer.from([0x01]), // 0x01 chunk received acknowledgment
                        packet.data.subarray(1) 
                    ]);
                } else {
                    responseData = Buffer.from([0x01, 0x00]);
                }
                console.log(`[Forge Handshake] Acknowledged stream chunk verification markers for Step #${messageId}`);
            } 
            // SCENARIO 4: Post-Stream Registry Finalization (Step 3 and beyond)
            else {
                if (packet.data && packet.data.length > 1) {
                    responseData = Buffer.concat([
                        Buffer.from([0x01]), 
                        packet.data.subarray(1)
                    ]);
                } else {
                    responseData = Buffer.from([0x01, 0x00]);
                }
                console.log(`[Forge Handshake] Fulfilling post-stream registry verification for Step #${messageId}`);
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
        
        // Anti-AFK Jump Loop
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
