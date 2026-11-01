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

    // CRITICAL FIX: Intercept immediately on socket creation before any third-party plugins can claim the packets
    bot.on('client', (client) => {
        console.log('[Network Engine] Raw socket client bound. Injecting high-priority TACZ interceptor...');
        
        // Listen directly to raw pipeline traffic
        client.on('login_plugin_request', (packet) => {
            if (packet.channel === 'tacz:handshake') {
                const messageId = packet.messageId !== undefined ? packet.messageId : packet.id;
                console.log(`\n[TACZ CRITICAL INTERCEPT] Caught custom gun packet (Step #${messageId})!`);

                // Send the exact 2-byte verification payload required by TACZ server mods
                client.write('login_plugin_response', {
                    id: messageId,
                    data: Buffer.from([0x01, 0x00])
                });

                console.log(`[TACZ CRITICAL INTERCEPT] Overrode handler and successfully pushed gun registry verification.`);
            }
        });
    });

    // Initialize standard Forge handler for blocks and items afterward
    const options = {
        forgeMods: undefined,
        channels: undefined
    };
    autoVersionForge(bot._client, options);

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
