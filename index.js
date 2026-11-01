const mineflayer = require('mineflayer');
const autoVersionForge = require('minecraft-protocol-forge/src/client/autoVersionForge');

function createBot() {
    console.log('Launching Dynamic Forge 1.20.1 Handshake Modpack Emulator...');

    const targetHost = process.env.BOT_HOST || 'localhost';
    const forgeTaggedHost = `${targetHost}\0FML3\0`;

    // CRITICAL FIX: Set version to false to allow autoVersionForge to negotiate headers
    const bot = mineflayer.createBot({
        host: forgeTaggedHost,
        port: parseInt(process.env.BOT_PORT, 10) || 25565,
        username: 'HeadlessModBot',
        version: false, 
        auth: 'offline',
        skipValidation: true
    });

    // Hook the dynamic automated forge handler to the client instance
    const options = {
        forgeMods: undefined, // Leaving this undefined tells the engine to automatically match the server's mod list
        channels: undefined
    };
    autoVersionForge(bot._client, options);

    bot.on('spawn', () => {
        console.log('\n======================================================');
        console.log('SUCCESS! Dynamic Forge Handshake cleared completely.');
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
