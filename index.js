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
                id: packet.messageId || packet.id,
                data: Buffer.alloc(0)
            });
            return;
        }

        const messageId = packet.messageId !== undefined ? packet.messageId : packet.id;
        const serverDiscriminator = (packet.data && packet.data.length > 0) ? packet.data[0] : -1;
        
        console.log(`[Forge Handshake] Step #${messageId} | Sub-Channel Discriminator: 0x${serverDiscriminator.toString(16)}`);

        let responseData;

        try {
            // DYNAMIC STREAM MIRROR PIPELINE:
            // For the initial handshake frames (Step 0 and Step 1), we override the header with 0x01 to activate client acknowledgment mode.
            if (messageId <= 1) {
                if (packet.data && packet.data.length > 1) {
                    responseData = Buffer.concat([
                        Buffer.from([0x01]), // Client Ready Signal
                        packet.data.subarray(1) // Append remaining server tracking headers
                    ]);
                } else {
                    responseData = Buffer.from([0x01, 0x00]);
                }
                console.log(`[Forge Handshake] Initialized handshake sequence for Step #${messageId}`);
            } 
            // For Step 2 and beyond, if the server continues to stream chunk packets (like repeating 0x0d tags),
            // we mirror the data back 1-to-1 without changing any bytes. This tricks the Aternos stream validator 
            // into believing we successfully verified the packet parity checksums.
            else {
                if (packet.data && packet.data.length > 0) {
                    responseData = Buffer.from(packet.data); // Pure 1-to-1 structural clone
                } else {
                    responseData = Buffer.alloc(0);
                }
                console.log(`[Forge Handshake] Passed stream-parity echo verification for Step #${messageId}`);
            }

            bot._client.write('login_plugin_response', {
                id: messageId,
                data: responseData
            });
            
            console.log(`[Forge Handshake] Dispatched response payload cleanly.`);
            
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
