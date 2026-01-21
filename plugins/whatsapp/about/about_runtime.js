let handlerRuntime = async (conn, { m }) => {
  const os = require("os");
  
  const uptime = process.uptime();
  const days = Math.floor(uptime / 86400);
  const hours = Math.floor((uptime % 86400) / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);
  const seconds = Math.floor(uptime % 60);
  
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  
  const toGB = (bytes) => (bytes / 1024 / 1024 / 1024).toFixed(2);
  const toPercent = (used, total) => ((used / total) * 100).toFixed(1);
  
  const cpus = os.cpus();
  const cpuModel = cpus[0]?.model || "Unknown";
  const cpuCores = cpus.length;
  
  let text = `╭━━━『 ⚙️ *SYSTEM INFO* 』━━━╮\n`;
  text += `│\n`;
  text += `│ 🤖 *Bot Status*\n`;
  text += `│ ├ Uptime: ${days}d ${hours}h ${minutes}m ${seconds}s\n`;
  text += `│ ├ Node.js: ${process.version}\n`;
  text += `│ └ Platform: ${os.platform()} ${os.arch()}\n`;
  text += `│\n`;
  text += `│ 💾 *Memory Usage*\n`;
  text += `│ ├ Used: ${toGB(usedMem)} GB\n`;
  text += `│ ├ Free: ${toGB(freeMem)} GB\n`;
  text += `│ ├ Total: ${toGB(totalMem)} GB\n`;
  text += `│ └ Usage: ${toPercent(usedMem, totalMem)}%\n`;
  text += `│\n`;
  text += `│ 🖥️ *CPU Info*\n`;
  text += `│ ├ Model: ${cpuModel.substring(0, 30)}\n`;
  text += `│ └ Cores: ${cpuCores}\n`;
  text += `│\n`;
  text += `│ 📊 *Load Average*\n`;
  text += `│ └ ${os.loadavg().map(l => l.toFixed(2)).join(", ")}\n`;
  text += `│\n`;
  text += `╰━━━━━━━━━━━━━━━━━━━━━╯`;
  
  await m.reply(text);
};

handlerRuntime.cmd = "runtime";
handlerRuntime.alias = ["uptime", "systeminfo", "sysinfo"];
handlerRuntime.tags = ["info"];
handlerRuntime.desc = "Tampilkan runtime & system info bot";
module.exports = handlerRuntime;