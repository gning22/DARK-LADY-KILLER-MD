const { default: makeWASocket, useMultiFileAuthState, delay, disconnectReason, downloadContentFromMessage } = require("@whiskeysockets/baileys");
const pino = require("pino");
const { Boom } = require("@hapi/boom");
const { Sticker, StickerTypes } = require('wa-sticker-formatter');

// --- CONFIGURATION PERSONNALISÉE ---
const SHADOW_NUM = "221763175367"; 
const LOGO_URL = "https://files.catbox.moe/o3p92m.png";
const AUDIO_URL = "METS_TON_LIEN_CATBOX_ICI.mp3"; 
const PREFIXE = "!";

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_session');
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        logger: pino({ level: "silent" }),
        browser: ["Ubuntu", "Chrome", "20.0.04"]
    });

    if (!sock.authState.creds.registered) {
        console.log("⏳ Génération du code de pairing...");
        await delay(5000);
        let code = await sock.requestPairingCode(SHADOWMD);
        console.log(`\n🔥 TON CODE : ${code}\n`);
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
                // Envoi du Logo + Texte
                await sock.sendMessage(from, { 
                    image: { url: LOGO_URL }, 
                    caption: `╭━━〔 💀 *SHADOW KILLER* 💀 〕━━┈\n┃\n┃ 👋 Salut @${from.split('@')[0]}\n┃ 👑 *EMPEREUR DES BANNS*\n┃\n┃ 🛠️ !menu1 : Outils\n┃ 🎮 !menu2 : Fun\n┃ 🛡️ !menu3 : Groupe\n┃ ☪️ !menu4 : Islam\n┃ 🎨 !s : Sticker\n┃\n╰━━━━━━━━━━━━━━━━━━━━┈`,
                    mentions: [from] 
                });
                // Envoi de l'Audio de bienvenue
                await sock.sendMessage(from, { 
                    audio: { url: AUDIO_URL }, 
                    mimetype: 'audio/mp4', 
                    ptt: true 
                });
                break;

            case 'menu1':
                await sock.sendMessage(from, { text: "🛠️ *OUTILS :*\n!ping, !owner, !date, !uptime, !cpu, !google, !wiki, !calc, !id" });
                break;

            case 'menu2':
                await sock.sendMessage(from, { text: "🎮 *FUN :*\n!blague, !love, !iq, !gay, !beau, !moche, !pileface, !vérité, !action" });
                break;

            case 'menu3':
                await sock.sendMessage(from, { text: "🛡️ *GROUPE :*\n!tagall, !hidetag, !link, !kick, !add, !promote, !demote, !close" });
                break;

            case 'menu4':
                await sock.sendMessage(from, { text: "☪️ *ISLAM :*\n!coran, !verset, !hadith, !dua, !dhikr, !prière, !tasbih" });
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

            case 'ping':
                await sock.sendMessage(from, { text: "🚀 *Vitesse :* 12ms" });
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
