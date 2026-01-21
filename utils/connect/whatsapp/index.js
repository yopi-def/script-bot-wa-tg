const {
  default: makeWAsocket,
  useMultiFileAuthState,
  DisconnectReason, Browsers,
  fetchLatestBaileysVersion,
} = require('@fhynella/baileys');
const pino = require('pino');
const chalk = require('chalk');
const readline = require('readline');
const qrcode = require('qrcode-terminal');

const { Boom } = require('@hapi/boom');
const { handler } = require('./handler');
const { bridge, plugins, event } = require('./bridge');
const db = require("../../database");
const color = (text, clr) => (!clr ? chalk.green(text) : chalk.keyword(clr)(text));

function ask(query) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(query, (ans) => {
      rl.close();
      resolve(ans);
    });
  });
}

async function client({ session = "main" } = {}) {
  try {
    const { state, saveCreds } = await useMultiFileAuthState(`${db.cg().get("whatsapp.setting").session}/${session}`);
    const { version } = await fetchLatestBaileysVersion();

    let usePrintQR = false;
    let wantPairing = false;
    let pairingPhone = null;
    
    const conn = makeWAsocket({
      version,
      auth: state,
      logger: pino({ level: 'silent' }),
      printQRInTerminal: false,
      browser: Browsers.ubuntu('Safari'),
      syncFullHistory: true,
      markOnlineOnConnect: !db.cg().get("whatsapp.setting").incoming_message_notification
    });
    
    globalThis.conn = conn
    globalThis.stateWhatsApp = state.creds.registered

    if (!state.creds.registered) {
      await new Promise(r => setTimeout(r, 2500));
      console.log(color('\n🔐 Pilih Metode Autentikasi:', 'yellow'));
      console.log('  1) Scan QR');
      console.log('  2) Pairing Code');
      console.log('  0) Batal\n');
      
      const pick = await ask('Pilih (1/2/0): ');

      if (pick === '1') {
        usePrintQR = true;
        console.log(color('📲 QR Code --', 'cyan'));
      } else if (pick === '2') {
        wantPairing = true;
        console.log(color('📲 PAIRING Code --', 'cyan'));
        console.log(chalk.yellowBright("\n⁉️ Masukkan nomor WhatsApp (exp: 628xx)"))
        pairingPhone = await ask('<phone> ');
        if (!pairingPhone) {
          console.log(color('❌ Nomor tidak terisi, batal pairing. Keluar.', 'red'));
          process.exit(0);
        }
          console.log(color('\n⏳ Meminta kode pairing ke server WhatsApp...', 'gray'));
      } else {
        console.log(color('⚠️ Autentikasi dibatalkan oleh pengguna. Keluar.', 'red'));
        process.exit(0);
      }
    } 

    if (wantPairing && !state.creds.registered) {
        try {
          const rawCode = await conn.requestPairingCode(pairingPhone.trim(), db.cg().get("whatsapp.setting").costume_pairing);
          const formatted = rawCode.replace(/[^A-Za-z0-9]/g, '').match(/.{1,4}/g)?.join('-')?.toUpperCase() || rawCode;
          console.log(color('✉️ kode pairing:', 'gray'), formatted);
        } catch (err) {
          console.error(color(`[PAIRING ERROR] ${err?.message || err}`, 'red'));
        }
    }

    if (state.creds.registered) {
      await event(conn);
      await plugins(conn);
    }

    conn.ev.on('messages.upsert', async ({ messages }) => {
      try {
        const msg = bridge(conn, messages[0]);
        if (!msg.message || msg.key.remoteJid === 'status@broadcast') return;
        msg.message = Object.keys(msg.message)[0] === 'ephemeralMessage' ? msg.message.ephemeralMessage.message : msg.message;
        if (msg.key.id.length <= 25) return;
        try {
          await handler(conn, msg);
        } catch (e) {
          console.error('[HANDLER ERROR]', e);
        }
      } catch (err) {
        console.error('[EVENT ERROR]', err.message);
      }
    });

    if (db.cg().get("whatsapp.setting.auto_reject_call").status) {
      conn.ev.on("call", async (callEvents) => {
        for (const call of callEvents) {
          if (call.status === "offer") {
            try {
              await new Promise(resolve => setTimeout(resolve, 2000))
              await conn.rejectCall(call.id, call.from)
              if (call.isGroup) return
              await conn.sendMessage(call.from, {
                text: db.cg().get("whatsapp.setting.auto_reject_call").text,
                title: db.cg().get("whatsapp.setting.auto_reject_call").title,
                footer: db.cg().get("whatsapp.setting.auto_reject_call").footer,
                interactiveButtons: [
                  {
                    name: 'cta_url',
                    buttonParamsJson: JSON.stringify({
                      display_text: 'Hubungi Nomor Lain',
                      url: db.cg().get("whatsapp.setting.auto_reject_call").url_whatsapp,
                      merchant_url: db.cg().get("whatsapp.setting.auto_reject_call").url_whatsapp
                    })
                  },
                ]
              })
            } catch (err) {
              console.error("Gagal reject call:", err)
            }
          }
        }
      })
    }

    conn.ev.on('connection.update', async (update) => {
      const { qr, connection, lastDisconnect } = update;
      
      if (usePrintQR && !state.creds.registered) {
        if (qr) {
          console.log(chalk.yellowBright("\n📲 Scan QR berikut untuk login ke WhatsApp:"));
          qrcode.generate(qr, { small: true });
          console.log(chalk.gray("Gunakan WhatsApp > Linked Devices > Scan QR ini"));
        }
      }
      
      if (connection === 'close') {
        const reasonCode = new Boom(lastDisconnect?.error)?.output?.statusCode;
        if (reasonCode === DisconnectReason.loggedOut) {
          console.error(color('🔴 Device logout. Hapus folder session dan restart.', 'red'));
          process.exit(1);
        } else {
          console.log(color('⚠️ Koneksi terputus, mencoba reconnect...', 'yellow'));
          setTimeout(() => client().catch(() => {}), 2000);
        }
      } else if (connection === 'open') {}
    });

    conn.ev.on('creds.update', saveCreds);

    return conn;
  } catch (err) {
    console.error(color('[CLIENT ERROR]', 'red'), err);
    throw err;
  }
}

client();

function formatPhoneNumber(number) {
  // Hapus semua karakter non-digit
  let cleaned = number.replace(/\D/g, "");
  
  // Jika mulai dengan 0, ganti dengan 62
  if (cleaned.startsWith("0")) {
    cleaned = "62" + cleaned.substring(1);
  }
  
  // Jika tidak mulai dengan 62, tambahkan
  if (!cleaned.startsWith("62")) {
    cleaned = "62" + cleaned;
  }
  
  return cleaned + "@s.whatsapp.net";
}

// Fungsi untuk mengirim pesan WhatsApp
async function sendMessage(number, message) {
  try {
    if (!globalThis.conn || !globalThis.stateWhatsApp) {
      console.log("[WA] Bot belum terhubung, pesan tidak terkirim:", message);
      return { ok: false, error: "WhatsApp belum terhubung" };
    }

    const jid = formatPhoneNumber(number);
    await globalThis.conn.sendMessage(jid, { text: message });
    
    console.log(`[WA] Pesan terkirim ke ${number}: ${message.substring(0, 50)}...`);
    return { ok: true };
  } catch (error) {
    console.error("[WA ERROR] Gagal mengirim pesan:", error);
    return { ok: false, error: error.message };
  }
}

// Cek status koneksi
function isWhatsAppConnected() {
  return globalThis.stateWhatsApp;
}

// Get globalThis.connet instance
function getsocket() {
  return globalThis.conn;
}

module.exports = {
  sendMessage,
  isWhatsAppConnected,
  getsocket,
  formatPhoneNumber,
};
