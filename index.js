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
        auth: 'offline', // Cracked mode flag
        skipValidation: true
    });

    bot._client.on('login_plugin_request', (packet) => {
        if (packet.channel !== 'fml:loginwrapper') {
            bot._client.write('login_plugin_response', {
                id: packet.messageId || packet.id,
                data: Buffer.alloc(0)
            });
            return;
        }

        const messageId = packet.messageId !== undefined ? packet.messageId : packet.id;
        
        // Read the internal discriminator flag from the server payload safely
        const serverDiscriminator = (packet.data && packet.data.length > 0) ? packet.data[0] : -1;
        console.log(`[Forge Handshake] Step #${messageId} | Sub-Channel Discriminator: 0x${serverDiscriminator.toString(16)}`);

        let responseData;

        try {
            // THE TROJAN HORSE MIRROR: 
            // If the server sends a split frame (0x0d) or registry data, we ingest its internal tracking markers, 
            // override the response state header to a universal client completion token (0x01), and echo it back.
            if (packet.data && packet.data.length > 1) {
                responseData = Buffer.concat([
                    Buffer.from([0x01]), // 0x01 forces FML3 into a safe "Client State Ready" sequence
                    packet.data.subarray(1) // Mirror the server's tracking signatures identically
                ]);
            } else {
                // Baseline protocol fallback signature
                responseData = Buffer.from([0x01, 0x00]);
            }

            bot._client.write('login_plugin_response', {
                id: messageId,
                data: responseData
            });
            
            console.log(`[Forge Handshake] Successfully mirrored validation token back for Step #${messageId}`);
            
        } catch (error) {
            console.log(`[Handshake Error Intercept] Payload processing breakdown: ${error.message}`);
            bot._client.write('login_plugin_response', {
                id: messageId,
                data: Buffer.from([0x01, 0x00])
            });
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
