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
            bot._client.write('login_plugin_response', { messageId: packet.messageId, data: Buffer.alloc(0) });
            return;
        }

        // Auto-extract the channel tracker signature 
        const subChannelLength = packet.data ? packet.data[0] : 0;
        let subChannelName = '';
        try {
            subChannelName = packet.data.toString('utf8', 1, 1 + subChannelLength);
        } catch(e) {
            subChannelName = 'unknown';
        }

        console.log(`[Forge Handshake] Packet #${packet.messageId} | Channel Context: ${subChannelName}`);

        let responseData;

        // STEP 0: TACZ Initial Mod Link Negotiation
        if (packet.messageId === 0) {
            responseData = Buffer.from([0x01, 0x00]); 
        } 
        // STEP 1: Core Mod List Structural Acknowledgement
        else if (packet.messageId === 1) {
            responseData = Buffer.from([0x01, 0x01]); 
        } 
        // STEP 2: Registry Channel Mapping Echo Sequence
        else if (packet.messageId === 2) {
            // Read the server's network configuration header and clone the payload shape.
            // This maps the required mod tracking structures directly back to the validation engine.
            if (packet.data && packet.data.length > 2) {
                responseData = Buffer.concat([
                    Buffer.from([0x01]), // FML3 Success State Flag
                    packet.data.slice(1, Math.min(64, packet.data.length)) // Echo back channel map alignment keys
                ]);
            } else {
                responseData = Buffer.from([0x01, 0x01, 0x00]);
            }
        } 
        // Higher ongoing synchronization frames
        else {
            responseData = Buffer.from([0x01, 0x00]);
        }

        bot._client.write('login_plugin_response', {
            messageId: packet.messageId,
            data: responseData
        });
        
        console.log(`[Forge Handshake] Dispatched verification payload for sequence #${packet.messageId}`);
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
