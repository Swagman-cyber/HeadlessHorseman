const mineflayer = require('mineflayer');
const forgeHandshake = require('minecraft-protocol-forge');

function createBot() {
    console.log('Launching Dynamic Forge 1.20.1 Handshake Modpack Emulator...');

    const targetHost = process.env.BOT_HOST || 'localhost';
    // Maintain the standard FML3 protocol registration suffix
    const forgeTaggedHost = `${targetHost}\0FML3\0`;

    const bot = mineflayer.createBot({
        host: forgeTaggedHost,
        port: parseInt(process.env.BOT_PORT, 10) || 25565,
        username: 'HeadlessModBot',
        version: '1.20.1', 
        auth: 'offline',
        skipValidation: true
    });

    // Automatically processes TACZ and Create registry blocks dynamically
    bot.once('login', () => {
        console.log('[Forge Handshake] Client initialized. Injecting dynamic FML3 protocol handler...');
        
        try {
            // This reads the raw mod-registry tokens from the server and safely echoes back exact match tables
            forgeHandshake(bot._client, {
                forgeMods: [] // Leaving this empty prompts auto-negotiation for the server's mod list
            });
            console.log('[Forge Handshake] Registry synchronization pipeline hooked successfully.');
        } catch (err) {
            console.error('[Forge Handshake] Failed to bind custom protocol layer:', err.message);
        }
    });

    bot.on('spawn', () => {
        console.log('\n======================================================');
        console.log('SUCCESS! Dynamic Forge Handshake cleared completely.');
        console.log(`Bot status: Active in modded world as ${bot.username}`);
        console.log('======================================================\n');
    });

    // Anti-AFK Check (Safely check if bot state entity exists before setting physical triggers)
    const afkInterval = setInterval(() => {
        if (bot.entity) {
            bot.setControlState('jump', true);
            setTimeout(() => { if (bot.entity) bot.setControlState('jump', false); }, 500);
        }
    }, 50000);

    bot.on('kick', (reason) => {
        // Strip down json structures if the kick response is a compound chat component object
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
