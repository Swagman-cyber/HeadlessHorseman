const mineflayer = require('mineflayer');

function createBot() {
    console.log('Launching Explicit Forge + TACZ 1.20.1 Protocol Engine...');

    const targetHost = process.env.BOT_HOST || 'localhost';
    const forgeTaggedHost = `${targetHost}\0FML3\0`;

    const bot = mineflayer.createBot({
        host: forgeTaggedHost,
        port: parseInt(process.env.BOT_PORT, 10) || 25565,
        username: 'HeadlessModBot',
        version: '1.20.1', 
        auth: 'offline',
        skipValidation: true
    });

    // Intercept packets at the absolute earliest stage on the raw socket client
    bot.on('client', (client) => {
        console.log('[Network Engine] Pipeline established. Injecting manual FML3 + TACZ handler...');

        client.on('login_plugin_request', (packet) => {
            const messageId = packet.messageId !== undefined ? packet.messageId : packet.id;

            // HANDLE TACZ WEAPON MOD SYSTEM
            if (packet.channel === 'tacz:handshake') {
                console.log(`[TACZ Intercept] Caught tacz:handshake (Packet ID: ${messageId})`);
                client.write('login_plugin_response', {
                    id: messageId,
                    data: Buffer.from([0x01, 0x00]) // TACZ acknowledgment signature
                });
                console.log('[TACZ Intercept] Injected gun asset verification payload.');
                return;
            }

            // HANDLE FORGE FML3 REGISTRY CHANNELS
            if (packet.channel === 'fml:loginwrapper') {
                const firstByteNum = (packet.data && packet.data.length > 0) ? packet.data[0] : -1;
                console.log(`[Forge Intercept] Caught fml:loginwrapper (Packet ID: ${messageId}) | Discriminator: 0x${firstByteNum.toString(16)}`);

                let responseData;

                // FML3 State Machine Logic
                if (firstByteNum === 0x0e || messageId === 0) {
                    responseData = Buffer.from([0x01, 0x00]);
                } else if (firstByteNum === 0x0d && messageId === 2) {
                    responseData = Buffer.from([0x02, 0x00]); // Final configuration acknowledgment closing bracket
                } else {
                    if (packet.data && packet.data.length > 1) {
                        responseData = Buffer.concat([
                            Buffer.from([0x01]), 
                            packet.data.subarray(1)
                        ]);
                    } else {
                        responseData = Buffer.from([0x01, 0x00]);
                    }
                }

                client.write('login_plugin_response', {
                    id: messageId,
                    data: responseData
                });
                console.log(`[Forge Intercept] Cleared handshake sequence segment #${messageId}`);
                return;
            }

            // PASS-THROUGH FOR GENERAL MINECRAFT CHANNELS
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

    // Anti-AFK Routine
    const afkInterval = setInterval(() => {
        if (bot.entity) {
            bot.setControlState('jump', true);
            setTimeout(() => { if (bot.entity) bot.setControlState('jump', false); }, 500);
        }
    }, 50000);

    bot.on('kick', (reason) => {
        const cleanReason = typeof reason === 'object' ? JSON.stringify(reason) : reason;
        console.log(`Kicked from server: ${cleanReason}`);
    });
    
    bot.on('error', (err) => console.log(`Network status notice: ${err.message}`));

    bot.on('end', () => {
        clearInterval(afkInterval);
        console.log('Socket disconnected. Re-attempting handshake spoof loop in 15 seconds...\n');
        setTimeout(createBot, 15000);
    });
}

createBot();
