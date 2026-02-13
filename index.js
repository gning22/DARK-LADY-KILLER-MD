const { default: makeWASocket, useMultiFileAuthState, delay, disconnectReason, downloadContentFromMessage } = require("@whiskeysockets/baileys");
const pino = require("pino");
const { Boom } = require("@hapi/boom");
const { Sticker, StickerTypes } = require('wa-sticker-formatter');

// --- CONFIGURATION ---
// J'ai défini SHADOWMD ici pour corriger ton erreur
const SHADOWMD = "221763175367"; 
const LOGO_URL = "https://files.catbox.moe/o3p92m.png";
const AUDIO_URL = "https://files.catbox.moe/4f6t7y.mp3"; // Assure toi que ce lien est le bon
const PREFIXE = "!";

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_session');
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        logger: pino({ level: "silent" }),
        browser: ["Ubuntu", "Chrome", "20.0.04"]
    });

    // Gestion du code de pairing
    if (!sock.authState.creds.registered) {
        console.log("⌛ Génération du code de pairing...");
        await delay(5000);
        // Utilisation de SHADOWMD qui est maintenant bien défini
        let code = await sock.requestPairingCode(SHADOWMD);
        console.log(`\n🔥 TON CODE DE PAIRING 🔥\n${code}\n`);
    }

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const from = msg.key.remoteJid;
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
        if (!text.startsWith(PREFIXE)) return;

        const command = text.slice(1).trim().split(/ +/).shift().toLowerCase();

        switch (command) {
            case 'menu':
                await sock.sendMessage(from, { 
                    image: { url: LOGO_URL }, 
                    caption: `╭━━〔 💀 *SHADOW KILLER* 💀 〕━━┈\n┃\n┃ 👋 Salut @${from.split('@')[0]}\n┃ 👑 *EMPEREUR DES BANNS*\n┃\n┃ 🛠️ !menu1 : Outils\n┃ 🎮 !menu2 : Fun\n┃ 🛡️ !menu3 : Groupe\n┃ 🎨 !s : Sticker\n╰━━━━━━━━━━━━━━━━━━━━┈`,
                    mentions: [from] 
                });
                await sock.sendMessage(from, { 
                    audio: { url: AUDIO_URL }, 
                    mimetype: 'audio/mp4', 
                    ptt: true 
                });
                break;
                
            case 'ping':
                await sock.sendMessage(from, { text: "🚀 En ligne !" });
                break;

            case 's':
            case 'sticker':
                const quoted = msg.message.extendedTextMessage?.contextInfo?.quotedMessage;
                if (msg.message.imageMessage || quoted?.imageMessage) {
                    const messageType = msg.message.imageMessage || quoted.imageMessage;
                    const stream = await downloadContentFromMessage(messageType, 'image');
                    let buffer = Buffer.from([]);
                    for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
                    const sticker = new Sticker(buffer, { pack: 'Shadow Killer', author: 'Bot', type: StickerTypes.FULL });
                    await sock.sendMessage(from, await sticker.toMessage());
                }
                break;
        }
    });

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error instanceof Boom)?.output?.statusCode !== disconnectReason.loggedOut;
            if (shouldReconnect) startBot();
        } else if (connection === 'open') {
            console.log('✅ SHADOW KILLER PRIME EST EN LIGNE !');
        }
    });
}

startBot();
