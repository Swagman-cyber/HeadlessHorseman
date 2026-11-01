const mineflayer = require('mineflayer');
const autoVersionForge = require('minecraft-protocol-forge/src/client/autoVersionForge');

function createBot() {
    console.log('Launching Dynamic Forge 1.20.1 Handshake Modpack Emulator...');

    const targetHost = process.env.BOT_HOST || 'localhost';
    const forgeTaggedHost = `${targetHost}\0FML3\0`;

    const bot = mineflayer.createBot({
        host: forgeTaggedHost,
        port: parseInt(process.env.BOT_PORT, 10) || 25565,
        username: 'HeadlessModBot',
        version: false, 
        auth: 'offline',
        skipValidation: true
    });

    // Configure Forge options to auto-negotiate base mods
    const options = {
        forgeMods: undefined,
        channels: undefined
    };
    autoVersionForge(bot._client, options);

    // CRITICAL FIX: Intercept the raw login requests to handle TACZ separately
    bot.once('login', () => {
        bot._client.on('login_plugin_request', (packet) => {
            const messageId = packet.messageId !== undefined ? packet.messageId : packet.id;

            // Specifically handle the TACZ mod verification channel
            if (packet.channel === 'tacz:handshake') {
                console.log(`[TACZ Mod Handler] Intercepted unique 'tacz:handshake' (Step #${messageId})`);
                
                // TACZ expects a standard 2-byte response [0x01, 0x00] to clear gun data checks
                const taczPayload = Buffer.from([0x01, 0x00]);

                bot._client.write('login_plugin_response', {
                    id: messageId,
                    data: taczPayload
                });
                
                console.log(`[TACZ Mod Handler] Injected valid gun asset verification payload.`);
            }
        });
    });

    bot.on('spawn', () => {
        console.log('\n======================================================');
        console.log('SUCCESS! Dynamic Forge & TACZ Handshakes cleared completely.');
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
