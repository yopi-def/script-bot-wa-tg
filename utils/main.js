const fs = require("fs");
const os = require("os");
const path = require("path");
const chalk = require("chalk");
const DataBase = require("./database");

const toGB = (bytes) => (bytes / 1024 / 1024 / 1024).toFixed(2) + " GB";

globalThis.db = DataBase
globalThis.config = DataBase.cg

function getSystemInfo() {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();

  return {
    OS: `${os.type()} ${os.release()} (${os.arch()})`,
    CPU: `${os.cpus()?.[0]?.model || "Unknown CPU"} / ${os.cpus()?.length || 1} Core`,
    RAM: `${toGB(totalMem - freeMem)} / ${toGB(totalMem)}`,
    "RAM Free": `${toGB(freeMem)} (${((freeMem / totalMem) * 100).toFixed(0)}%)`,
    Loc: `${Intl.DateTimeFormat().resolvedOptions().locale} / ${Intl.DateTimeFormat().resolvedOptions().timeZone}`,
    Dir: process.cwd(),
    "Node.js": process.version
  };
}

function printSystemInfo() {
  const info = getSystemInfo();
  const max = Math.max(...Object.keys(info).map(k => k.length));
  for (const [label, value] of Object.entries(info)) {
    const padded = label.padEnd(max, " ");
    console.log(
      chalk.red(`+ ${chalk.yellow(padded)} :`) + chalk.white(" " + value)
    );
  }
}

async function startService(name, loader) {
  try {
    await loader();
    console.log(chalk.yellowBright(`[INFO]`), `Connected ${name}`);
  } catch (err) {
    console.error(chalk.red(`[ERROR] Gagal memulai ${name}:`), err);
  }
}

(async () => {
  console.clear();
  console.log(chalk.cyan("==================================="));
  console.log(chalk.cyan.bold("📟 SYSTEM INFORMATION"));
  printSystemInfo();

  console.log(chalk.green.bold("-----------------------------------"));

  const { backupMultiple, restoreMultiple } = db.func("backup")
  await restoreMultiple(db.cg().get("backup.github").filePath);
  setInterval( async () => {
    await backupMultiple(db.cg().get("backup.github").filePath);
  }, db.cg().get("backup.once_minute_backup") * 60 * 1000);
  
  await startService("Telegram", async () => {
    await require("./connect/telegram");
  });

  await startService("WhatsApp", async () => {
    await require("./connect/whatsapp");
  });

})();