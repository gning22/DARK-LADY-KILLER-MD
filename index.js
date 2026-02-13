const { default: makeWASocket, useMultiFileAuthState, delay, disconnectReason, downloadContentFromMessage } = require("@whiskeysockets/baileys");
const pino = require("pino");
const { Boom } = require("@hapi/boom");
const { Sticker, StickerTypes } = require('wa-sticker-formatter');

// --- CONFIGURATION ---
const SHADOWMD = "221763175367"; 
const LOGO_URL = "https://files.catbox.moe/o3p92m.png";
const AUDIO_URL = "https://files.catbox.moe/o3p92m.mp3"; // Vérifie bien ton lien audio
const PREFIXE = "!";

async function startBot() {
    // Supprime le dossier 'auth_session' sur Katabump si ça bloque toujours
    const { state, saveCreds } = await useMultiFileAuthState('auth_session');
    
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        logger: pino({ level: "silent" }),
        browser: ["Ubuntu", "Chrome", "20.0.04"]
    });

    // On attend 10 secondes au lieu de 5 pour éviter l'erreur 428
    if (!sock.authState.creds.registered) {
        console.log("⏳ Patientez 10 secondes pour éviter le blocage WhatsApp...");
        await delay(10000); 
        try {
            let code = await sock.requestPairingCode(SHADOWMD);
            console.log(`\n👑 SHADOW KILLER CODE : ${code}\n`);
        } catch (err) {
            console.log("❌ Erreur de pairing : Trop de tentatives. Attends 30 min.");
        }
    }

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message || msg.key.fromMe) return;
        const from = msg.key.remoteJid;
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
        
        if (text.startsWith(PREFIXE)) {
            const command = text.slice(1).trim().split(/ +/).shift().toLowerCase();
            
            if (command === 'menu') {
                await sock.sendMessage(from, { 
                    image: { url: LOGO_URL }, 
                    caption: `╭━━〔 💀 *SHADOW KILLER* 💀 〕━━┈\n┃\n┃ 👋 Salut @${from.split('@')[0]}\n┃ 👑 *EMPEREUR DES BANNS*\n┃\n┃ 🛠️ !menu1 : Outils\n┃ 🎮 !menu2 : Fun\n┃ 🛡️ !menu3 : Groupe\n┃ 🎨 !s : Sticker\n╰━━━━━━━━━━━━━━━━━━━━┈`,
                    mentions: [from] 
                });
                await sock.sendMessage(from, { audio: { url: AUDIO_URL }, mimetype: 'audio/mp4', ptt: true });
            }
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
