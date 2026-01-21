let handlerPing = async (conn, { m }) => {
  const start = Date.now();
  const sent = await m.reply("_Testing speed..._");
  const end = Date.now();
  
  const ping = end - start;
  const uptime = process.uptime();
  
  let speedEmoji = "🐌";
  let speedText = "Lambat";
  
  if (ping < 100) {
    speedEmoji = "⚡";
    speedText = "Sangat Cepat";
  } else if (ping < 300) {
    speedEmoji = "🚀";
    speedText = "Cepat";
  } else if (ping < 500) {
    speedEmoji = "✈️";
    speedText = "Normal";
  } else if (ping < 1000) {
    speedEmoji = "🚗";
    speedText = "Agak Lambat";
  }
  
  let text = `${speedEmoji} *SPEED TEST*\n\n`;
  text += `📊 Response Time: *${ping}ms*\n`;
  text += `🏷️ Status: *${speedText}*\n`;
  text += `⏱️ Uptime: ${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m`;
  
  await conn.sendMessage(m.chat, { 
    text, 
    edit: sent.key 
  });
};

handlerPing.cmd = "ping";
handlerPing.alias = ["speed"];
handlerPing.tags = ["info"];
handlerPing.desc = "Cek response time bot";
module.exports = handlerPing;