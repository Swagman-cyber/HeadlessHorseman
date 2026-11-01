const mineflayer = require('mineflayer');

function createBot() {
    console.log('Launching Dedicated Aternos Forge 47.4.28 Handshake Engine...');

    const targetHost = process.env.BOT_HOST || 'localhost';
    // Use standard FML3 protocol registration token matching your server logs
    const forgeTaggedHost = `${targetHost}\0FML3\0`;

    const bot = mineflayer.createBot({
        host: forgeTaggedHost,
        port: parseInt(process.env.BOT_PORT, 10) || 25565,
        username: 'HeadlessModBot',
        version: '1.20.1', 
        auth: 'offline',
        skipValidation: true
    });

    // CRITICAL TIMING FIX: Bind directly on the raw client injection hook 
    // This executes before Mineflayer sends standard lifecycle pre-auth packets
    bot.on('client', (client) => {
        console.log('[Network Engine] Low-level socket pipeline established. Intercepting Forge states...');

        client.on('login_plugin_request', (packet) => {
            const messageId = packet.messageId !== undefined ? packet.messageId : packet.id;

            // 1. OVERRIDE TACZ WEAPON MOD HANDSHAKE
            if (packet.channel === 'tacz:handshake') {
                console.log(`[TACZ Intercept] Found gun channel request (ID: ${messageId})`);
                client.write('login_plugin_response', {
                    id: messageId,
                    data: Buffer.from([0x01, 0x00]) // Valid dynamic confirmation signature
                });
                console.log('[TACZ Intercept] Verification array sent successfully.');
                return;
            }

            // 2. OVERRIDE FORGE FML3 CORE MOD REGISTRY
            if (packet.channel === 'fml:loginwrapper') {
                const packetData = packet.data || Buffer.alloc(0);
                const firstByteNum = packetData.length > 0 ? packetData[0] : -1;
                console.log(`[Forge Intercept] Registry Frame #${messageId} | Discriminator: 0x${firstByteNum.toString(16)}`);

                let responseData;

                if (firstByteNum === 0x0e || messageId === 0) {
                    responseData = Buffer.from([0x01, 0x00]);
                } else if (firstByteNum === 0x0d && messageId === 2) {
                    // Refined token telling Aternos that our heavy mod compilation stream has safely concluded
                    responseData = Buffer.from([0x02, 0x00]); 
                } else {
                    if (packetData.length > 1) {
                        responseData = Buffer.concat([
                            Buffer.from([0x01]), 
                            packetData.subarray(1)
                        ]);
                    } else {
                        responseData = Buffer.from([0x01, 0x00]);
                    }
                }

                client.write('login_plugin_response', {
                    id: messageId,
                    data: responseData
                });
                console.log(`[Forge Intercept] Pushed stream confirmation frame #${messageId}`);
                return;
            }

            // 3. PASS-THROUGH FOR OTHER PROTOCOL CHANNELS
            client.write('login_plugin_response', {
                id: messageId,
                data: null
            });
        });
    });

    bot.on('spawn', () => {
        console.log('\n======================================================');
        console.log('SUCCESS! Forge & TACZ Handshakes completely cleared.');
        console.log(`Bot status: Active in modded world as ${bot.username}`);
        console.log('======================================================\n');
    });

    // Safe Anti-AFK Routine
    const afkInterval = setInterval(() => {
        if (bot.entity) {
            bot.setControlState('jump', true);
            setTimeout(() => { if (bot.entity) bot.setControlState('jump', false); }, 500);
        }
    }, 50000);

    bot.on('kick', (reason) => {
        console.log(`Kicked from server: ${JSON.stringify(reason)}`);
    });
    
    bot.on('error', (err) => console.log(`Network status notice: ${err.message}`));

    bot.on('end', () => {
        clearInterval(afkInterval);
        console.log('Socket disconnected. Re-attempting handshake spoof loop in 15 seconds...\n');
        setTimeout(createBot, 15000);
    });
}

createBot();
