let handlerOwner = async (conn, { m }) => {
  const ownerConfig = config().get("whatsapp.owner") || [];
  const ownerName = config().get("whatsapp.owner_name") || "Owner";
  const botName = config().get("bot.name_full") || "Bot WhatsApp";
  
  let text = `╭━━━『 👑 *OWNER INFO* 』━━━╮\n`;
  text += `│\n`;
  text += `│ 🤖 *Bot:* ${botName}\n`;
  text += `│ 👤 *Owner:* ${ownerName}\n`;
  text += `│\n`;
  text += `│ 📱 *Contact:*\n`;
  
  ownerConfig.forEach((num, index) => {
    text += `│ ${index + 1}. wa.me/${num}\n`;
  });
  
  text += `│\n`;
  text += `│ 💬 Hubungi owner untuk:\n`;
  text += `│ • Jadi Reseller 💼\n`;
  text += `│ • Lapor Bug 🐛\n`;
  text += `│ • Request Fitur 💡\n`;
  text += `│ • Kerjasama 🤝\n`;
  text += `│\n`;
  text += `╰━━━━━━━━━━━━━━━━━━━━━╯`;
  
  // Send with contact card
  try {
    const mainOwner = ownerConfig[0];
    await conn.sendMessage(m.chat, {
      contacts: {
        displayName: ownerName,
        contacts: [{
          vcard: `BEGIN:VCARD\nVERSION:3.0\nFN:${ownerName}\nTEL;type=CELL;type=VOICE;waid=${mainOwner}:+${mainOwner}\nEND:VCARD`
        }]
      }
    }, { quoted: m });
    
    await m.reply(text);
  } catch {
    await m.reply(text);
  }
};

handlerOwner.cmd = "owner";
handlerOwner.alias = ["creator", "pengembang"];
handlerOwner.tags = ["info"];
handlerOwner.desc = "Informasi kontak owner bot";
module.exports = handlerOwner;