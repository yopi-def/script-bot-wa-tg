const fs = require("fs");
const path = require("path");
const moment = require("moment-timezone");

// ============================================================
// CONFIGURATION
// ============================================================
const CONFIG = {
  layout: "fancy",
  order: [
    "game", "tools", "panel", "down", "user", "ai", 
    "pvp", "list", "info", "atlantic", "owner", "youtube", "other"
  ],
  profileLabels: {
    user: "⎫ Users : @{data}",
    role: "⎫ Role  : {data}",
    level: "⎭ Level : Lv.{data}"
  },
  styles: {
    fancy: {
      header: "`⪼┈╼╼╾╼𓊈 FHIIYA 𓊉╾╼╾╾┈⪻`",
      profileHeader: "`⪼┈╼╼╾╼𓊈 PROFIL 𓊉╾╼╾╾┈⪻`",
      commandTitle: "*𝜗ৎ List Feature*",
      categoryTitle: "*𝜗ৎ Feature {name}*",
      commandPrefix: "> ≔ {prefix}{cmd}",
      barrierHeader: "────────────────────"
    }
  },
  emojiMap: {
    game: "🎮", tools: "🛠️", panel: "⚙️", down: "📥",
    user: "👤", ai: "🤖", pvp: "⚔️", list: "📋",
    info: "ℹ️", atlantic: "🌊", owner: "👑", youtube: "📺", other: "📦"
  },
  mediaSources: [["./utils/media/image/menu", "image/png"]]
};

const CONFIG_PATH = path.join(process.cwd(), "plugins/fhynella/menu.json");

// ============================================================
// UTILITIES
// ============================================================
class Utils {
  static applyTemplate(str, data = {}) {
    return str.replace(/\{(\w+)\}/g, (_, k) => data[k] ?? "");
  }

  static titleCase(s = "") {
    return s.toLowerCase().replace(/(^|\s)\w/g, (c) => c.toUpperCase());
  }

  static randomPick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  static getRandomJpg(folderPath) {
    const files = fs.readdirSync(folderPath);
    const jpgFiles = files.filter(file => /\.(jpe?g)$/i.test(file));
    
    if (jpgFiles.length === 0) {
      throw new Error("Tidak ada file JPG di folder ini");
    }
    
    const randomFile = Utils.randomPick(jpgFiles);
    return path.join(folderPath, randomFile);
  }

  static getGreeting() {
    const hour = moment().hours();
    if (hour >= 4 && hour < 11) return "Selamat Pagi";
    if (hour >= 11 && hour < 15) return "Selamat Siang";
    if (hour >= 15 && hour < 18) return "Selamat Sore";
    return "Selamat Malam";
  }

  static getUserRole({ isOwner, isReseller, isPremium }) {
    if (isOwner) return "Owner";
    if (isReseller) return "Reseller";
    if (isPremium) return "Premium";
    return "Member";
  }
}

// ============================================================
// CONFIG MANAGER
// ============================================================
class ConfigManager {
  static load() {
    try {
      return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
    } catch (err) {
      console.error("[MENU] Error loading config:", err);
      return CONFIG;
    }
  }

  static save(cfg) {
    try {
      fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2), "utf8");
      return true;
    } catch (err) {
      console.error("[MENU] Error saving config:", err);
      return false;
    }
  }
}

// ============================================================
// PLUGIN ANALYZER
// ============================================================
class PluginAnalyzer {
  static analyze(plugins) {
    const stats = {};
    const tagSet = new Set();

    for (const [cmd, plugin] of plugins.entries()) {
      if (!plugin.cmd) continue;

      const tags = Array.isArray(plugin.tags)
        ? plugin.tags
        : [plugin.tags || "other"];

      tags.forEach(tag => {
        tag = tag.toLowerCase();
        tagSet.add(tag);

        if (!stats[tag]) {
          stats[tag] = { commands: [] };
        }

        if (cmd === plugin.cmd) {
          stats[tag].commands.push({
            cmd: plugin.cmd,
            desc: plugin.desc || "Tidak ada deskripsi",
            alias: plugin.alias || []
          });
        }
      });
    }

    return {
      stats,
      tags: [...tagSet].sort()
    };
  }
}

// ============================================================
// USER DATA BUILDER
// ============================================================
class UserDataBuilder {
  static build(m, { isOwner, isPremium, isReseller }) {
    const senderLid = m.senderLid;
    const userDB = db.users[senderLid]?.get() || {};
    const userGame = db.game[senderLid]?.get();

    // Calculate level
    let level = { level: 0, currentXP: 0, xpNeeded: 140 };
    if (userGame) {
      level = db.func("game").calculateLevel(userGame.totalXP || 0);
    }

    // Get time info
    const timezone = userDB.timezone || "Asia/Jakarta";
    const time = moment.tz(timezone).locale("id");

    return {
      name: m.pushName,
      role: Utils.getUserRole({ isOwner, isPremium, isReseller }),
      level,
      time: {
        day: time.format("dddd"),
        date: time.format("DD MMMM YYYY")
      },
      db: userDB
    };
  }
}

// ============================================================
// TEXT BUILDER
// ============================================================
class TextBuilder {
  constructor(layout, cfg) {
    this.layout = layout;
    this.cfg = cfg;
  }

  buildProfile(userData) {
    return [
      this.layout.profileHeader || "",
      "```",
      Utils.applyTemplate(this.cfg.profileLabels.user || "", { 
        data: userData.name 
      }),
      Utils.applyTemplate(this.cfg.profileLabels.role || "", { 
        data: userData.role 
      }),
      Utils.applyTemplate(this.cfg.profileLabels.level || "", {
        data: `${userData.level.level} (${userData.level.currentXP}/${userData.level.xpNeeded})`
      }),
      "```"
    ].filter(Boolean).join("\n");
  }

  buildHeader(userData) {
    const greeting = Utils.getGreeting();
    return [
      this.layout.header || "",
      "",
      `${greeting}, *${userData.name}* 👋`,
      "",
      `🌄 \`\`\`${userData.time.day}\`\`\``,
      `📅 \`\`\`${userData.time.date}\`\`\``,
      this.layout.barrierHeader || "────────",
      ""
    ].join("\n");
  }

  buildCategoryList(tags, stats, prefix, command) {
    const lines = [
      this.layout.commandTitle || "*List Feature*"
    ];

    tags.forEach(tag => {
      const cmdCount = stats[tag]?.commands.length || 0;
      lines.push(
        Utils.applyTemplate(this.layout.commandPrefix || "{prefix}{cmd}", { 
          prefix, 
          cmd: `${command} ${tag} (${cmdCount})` 
        })
      );
    });

    lines.push("");
    lines.push(this.layout.barrierHeader || "────────");
    lines.push("*Quick Access:*");
    lines.push(`> ${prefix}menu <ctg> - Lihat per kategori`);
    lines.push(`> ${prefix}menu all - Lihat semua command`);

    return lines.join("\n");
  }

  buildAllCommands(tags, stats, prefix) {
    const lines = [];

    tags.forEach(tag => {
      const data = stats[tag];
      if (!data || data.commands.length === 0) return;

      lines.push(
        Utils.applyTemplate(this.layout.categoryTitle || "{name}", {
          name: Utils.titleCase(tag) + ` (${data.commands.length})`
        })
      );

      data.commands.forEach(cmd => {
        lines.push(
          Utils.applyTemplate(this.layout.commandPrefix || "{prefix}{cmd}", { 
            prefix, 
            cmd: cmd.cmd 
          })
        );
      });

      lines.push("");
    });

    return lines.join("\n");
  }

  buildCategoryCommands(tag, data, prefix) {
    const lines = [
      Utils.applyTemplate(this.layout.categoryTitle || "{name}", {
        name: Utils.titleCase(tag) + ` (${data.commands.length})`
      })
    ];

    data.commands.forEach(cmd => {
      lines.push(
        Utils.applyTemplate(this.layout.commandPrefix || "{prefix}{cmd}", { 
          prefix, 
          cmd: cmd.cmd 
        })
      );
    });

    lines.push("");

    return lines.join("\n");
  }
}

// ============================================================
// MESSAGE SENDER
// ============================================================
class MessageSender {
  static async send(conn, m, caption) {
    const users = db.users[m.senderLid].get() || {};
    const [folder, mimetype] = Utils.randomPick(CONFIG.mediaSources);
    const file = Utils.getRandomJpg(folder);

    const baseMessage = {
      document: fs.readFileSync(file),
      jpegThumbnail: fs.readFileSync(file),
      mimetype,
      caption,
      fileName: "Halo Apakabar",
      fileLength: 9999999999,
      mentions: [m.sender],
      contextInfo: {
        isForwarded: true,
        mentionedJid: [m.sender],
        forwardedNewsletterMessageInfo: {
          newsletterJid: db.cg().get("whatsapp.jid").ch,
          newsletterName: db.cg().get("whatsapp.jid").ch_name
        },
        externalAdReply: {
          title: `interact with users @${users.username}`,
          body: `uuid: ${users.uuid}`,
          mediaType: 1,
          thumbnailUrl: db.cg().get("whatsapp.url").img1,
          renderLargerThumbnail: true
        }
      }
    }

    return conn.sendMessage(m.chat, baseMessage, {
      quoted: {
        key: { 
          remoteJid: "0@s.whatsapp.net", 
          fromMe: false, 
          id: "MEDIA_PREVIEW" 
        },
        message: {
          newsletterAdminInviteMessage: {
            newsletterJid: db.cg().get("whatsapp.jid").ch,
            caption: db.cg().get("bot").name_full
          }
        }
      }
    });
  }
}

// ============================================================
// MAIN HANDLER
// ============================================================
let handler = async (conn, { m, command, args, isOwner, isPremium, isReseller, prefix }) => {
  const cfg = ConfigManager.load();
  const subCmd = (args[0] || "")
  
  // ========== PREPARE DATA ==========
  const layout = cfg.styles[cfg.layout];
  if (!layout) {
    return m.reply("❌ Layout tidak ditemukan. Hubungi owner.");
  }

  const userData = UserDataBuilder.build(m, { isOwner, isPremium, isReseller });
  const { stats, tags } = PluginAnalyzer.analyze(conn.plugins || new Map());
  const textBuilder = new TextBuilder(layout, cfg);

  const profileText = textBuilder.buildProfile(userData);
  const headerText = textBuilder.buildHeader(userData);

  // ========== MENU ALL ==========
  if (subCmd === "all") {
    const commandsText = textBuilder.buildAllCommands(tags, stats, prefix);
    const footerText = `\n${layout.barrierHeader || "────────"}\n💡 Total: *${conn.plugins.size}* commands`;
    
    const fullText = [profileText, headerText, commandsText, footerText].join("\n");
    return MessageSender.send(conn, m, fullText);
  }

  // ========== MENU SPECIFIC CATEGORY ==========
  if (subCmd && stats[subCmd]) {
    const categoryText = textBuilder.buildCategoryCommands(subCmd, stats[subCmd], prefix);
    const fullText = [profileText, headerText, categoryText].join("\n");

    return MessageSender.send(conn, m, fullText);
  }

  // ========== MAIN MENU ==========
  const categoryListText = textBuilder.buildCategoryList(tags, stats, prefix, command);
  const fullText = [profileText, headerText, categoryListText].join("\n");

  return MessageSender.send(conn, m, fullText);
};

// ============================================================
// EXPORTS
// ============================================================
handler.cmd = "menu";
handler.alias = ["help"];
handler.tags = ["info"];
handler.desc = "Menu bot dengan single select sections";

module.exports = handler;
