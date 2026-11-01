const mineflayer = require('mineflayer');

// Helper function to write VarInt bytes required by the Minecraft protocol
function writeVarInt(value) {
    const buffer = [];
    while (true) {
        if ((value & ~0x7F) === 0) {
            buffer.push(value);
            return Buffer.from(buffer);
        }
        buffer.push((value & 0x7F) | 0x80);
        value >>>= 7;
    }
}

// Helper to format string segments into [VarInt Length + Data] strings
function encodeString(str) {
    const strBuffer = Buffer.from(str, 'utf8');
    const lenBuffer = writeVarInt(strBuffer.length);
    return Buffer.concat([lenBuffer, strBuffer]);
}

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

    // Explicit mod details collected from your server registry setup
    const activeModPack = [
        { id: 'minecraft', version: '1.20.1' },
        { id: 'forge', version: '47.4.28' },
        { id: 'architectury', version: '9.2.14' },
        { id: 'clockwork', version: '0.5.6' },
        { id: 'connectivity', version: '7.7' },
        { id: 'create', version: '6.0.8' },
        { id: 'createbigcannons', version: '5.11.4' },
        { id: 'cupboard', version: '4.2' },
        { id: 'curios', version: '5.14.1' },
        { id: 'fcp', version: '1.2.1' },
        { id: 'ferritecore', version: '6.0.1' },
        { id: 'framework', version: '0.8.0' },
        { id: 'geckolib', version: '4.8.4' },
        { id: 'hbm_m', version: '0.2.1-alpha' },
        { id: 'kotlinforforge', version: '4.12.0' },
        { id: 'pillagers_gun', version: '3.2.1' },
        { id: 'playeranimator', version: '1.0.2-rc1' },
        { id: 'omegarecon', version: '3.3.1' },
        { id: 'recruits', version: '1.15.2' },
        { id: 'ritchiesprojectilelib', version: '2.1.1' },
        { id: 'snassets_particles', version: '1.0.3' },
        { id: 'superbrecruits', version: '1.115' },
        { id: 'superbwarfare', version: '0.8.9' },
        { id: 'tacz', version: '1.1.8-hotfix2' },
        { id: 'trackwork', version: '1.2.4' },
        { id: 'valkyrienskies', version: '2.4.11' },
        { id: 'xaerominimap', version: '26.6.0' },
        { id: 'xaeroworldmap', version: '1.47.0' }
    ];

    bot._client.on('login_plugin_request', (packet) => {
        if (packet.channel !== 'fml:loginwrapper') {
            bot._client.write('login_plugin_response', { messageId: packet.messageId, data: Buffer.alloc(0) });
            return;
        }

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
        // STEP 1: Strict Client Mod List Declaration (Calculated using structural VarInt arrays)
        else if (packet.messageId === 1) {
            const bufferSegments = [
                Buffer.from([0x01]), // Handshake step discriminator
                writeVarInt(activeModPack.length) // Correctly encoded number of mods as a VarInt
            ];

            // Loop through each mod to inject [VarInt Len + ModID] + [VarInt Len + Version]
            activeModPack.forEach(mod => {
                bufferSegments.push(encodeString(mod.id));
                bufferSegments.push(encodeString(mod.version));
            });

            responseData = Buffer.concat(bufferSegments);
        } 
        // STEP 2: Channel List Verification Echo Loop
        else if (packet.messageId === 2) {
            if (packet.data && packet.data.length > 2) {
                responseData = Buffer.concat([
                    Buffer.from([0x01]), 
                    packet.data.slice(1, Math.min(64, packet.data.length)) 
                ]);
            } else {
                responseData = Buffer.from([0x01, 0x01, 0x00]);
            }
        } 
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
