const chalk = require("chalk");

function logWhatsAppMessage({ chatId, senderName, groupName, isGroup, type, text }) {
  const header = chalk.bgGreen.white.bold(" 💬 PESAN WHATSAPP ");
  const line = chalk.gray("───────────────────────────────");

  console.log("\n" + header);
  console.log(line);

  const info = {
    ...(isGroup
      ? {
          "💬 Group": groupName || chatId || "Tidak diketahui",
          "👤 Pengirim": senderName || "Tidak diketahui",
        }
      : {
          "💬 Sender": senderName || chatId || "Tidak diketahui",
        }),
    "📦 Jenis": type || "Text",
    "📝 Pesan": text ? `\n${text}` : "(tidak ada teks)",
  };

  const maxLabelLen = Math.max(...Object.keys(info).map(k => k.length));

  for (const [label, value] of Object.entries(info)) {
    const padded = label.padEnd(maxLabelLen, " ");
    console.log(
      chalk.cyan(padded) +
      chalk.white.bold(" :") +
      " " +
      chalk.white(value)
    );
  }

  console.log(line + "\n");
}

function logTelegramMessage({ chatId, senderName, groupName, username, isGroup, type, text }) {
  const header = chalk.bgBlue.white.bold(" 💬 PESAN TELEGRAM ");
  const line = chalk.gray("───────────────────────────────");

  console.log("\n" + header);
  console.log(line);

  const info = {
    ...(isGroup
      ? {
          "💬 Group": groupName || chatId || "Tidak diketahui",
          "👤 Pengirim": `${senderName || "Tidak diketahui"} (@${username || "-"})`,
        }
      : {
          "💬 Sender": `${senderName || chatId || "Tidak diketahui"} (@${username || "-"})`,
        }),
    "📦 Jenis": type || "Text",
    "📝 Pesan": text ? `\n${text}` : "(tidak ada teks)",
  };

  const maxLabelLen = Math.max(...Object.keys(info).map(k => k.length));

  for (const [label, value] of Object.entries(info)) {
    const padded = label.padEnd(maxLabelLen, " ");
    console.log(
      chalk.cyan(padded) +
      chalk.white.bold(" :") +
      " " +
      chalk.white(value)
    );
  }

  console.log(line + "\n");
}

function extractPhoneNumber(text) {
  if (!text) return null;
  let numbers = text.replace(/\D/g, '');
  if (numbers.length < 10) return null;
  return numbers;
}

async function getLidFromInput(conn, m, text) {
  if (m.quoted && m.quoted.sender) {
    const lid = conn.decodeJid(m.quoted.sender);
    return { 
      lid, 
      phone: lid.split('@')[0],
      method: 'quoted'
    };
  }
  
  const phone = extractPhoneNumber(text);
  if (!phone) {
    return { 
      error: "❌ Format salah!\n\nGunakan:\n• Reply pesan target\n• Ketik nomor: 628xxx" 
    };
  }
  
  try {
    const result = await conn.onWhatsApp(phone);
    if (!result || result.length === 0 || !result[0].exists) {
      return { 
        error: `❌ Nomor *${phone}* tidak terdaftar di WhatsApp!` 
      };
    }
    return {
      lid: result[0].lid,
      jid: result[0].jid,
      phone: phone,
      method: 'phone'
    };
  } catch (error) {
    return { 
      error: `❌ Gagal memeriksa nomor: ${error.message}` 
    };
  }
}

function formatRoleName(role) {
  const roleNames = {
    owner: '👑 Owner',
    premium: '⭐ Premium',
    reseller: '💼 Reseller'
  };
  return roleNames[role] || role;
}


module.exports = {
  logTelegramMessage,
  logWhatsAppMessage,
  getLidFromInput,
  formatRoleName
};