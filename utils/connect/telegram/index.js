const fs = require("fs");
const path = require("path");
const chalk = require("chalk");
const { Bot, InlineKeyboard } = require("grammy");

const token = config().get("telegram.setting").token;
if (!token) {
  console.log(chalk.red("[FATAL] Token Telegram tidak ditemukan"));
  process.exit(1);
}

const bot = new Bot(token);

global.bot = bot;
global.InlineKeyboard = InlineKeyboard;

const pluginPath = path.join(process.cwd(), "plugins", "telegram");

if (fs.existsSync(pluginPath)) {
  const files = fs
    .readdirSync(pluginPath)
    .filter(f => f.endsWith(".js"));

  for (const file of files) {
    const fullPath = path.join(pluginPath, file);

    try {
      delete require.cache[require.resolve(fullPath)];

      const plugin = require(fullPath);

      if (typeof plugin === "function") {
        plugin(bot);
      }

      console.log(chalk.green("[PLUGIN] Loaded →"), file);
    } catch (err) {
      console.log(
        chalk.red("[PLUGIN ERROR]"),
        file,
        "\n",
        err.stack || err
      );
    }
  }
} else {
  console.log(chalk.yellow("[WARN] Folder plugin telegram tidak ditemukan"));
}

bot.start()
  .then(() => {
    console.log(chalk.yellowBright("[INFO]"), "Telegram Bot Running");
  })
  .catch(err => {
    console.log(chalk.redBright("[INFO]"), "Bot Telegram gagal dijalankan");
  });