const db = require("../../utils/database");
const { InlineKeyboard } = require("grammy");
const panelAPI = db.func("panel");

const { checkRateLimit, backupMultiple, restoreMultiple } = db.func("backup");
const os = require("os");

module.exports = (bot) => {

function formatBytes(bytes) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function formatUptime(seconds) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const parts = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  return parts.join(" ") || "< 1m";
}

function tg(tgid) {
  const id = String(tgid);
  const configOwners = (db.cg().get("telegram").owner || []).map(String);
  const user = db.data.findByTelegramId(id);

  let isDev = false;
  let isOwner = false;
  let isReseller = false;

  if (configOwners.includes(id)) {
    isDev = true;
    isOwner = true;
    isReseller = true;
  } else if (user) {
    isOwner = user.isOwner;
    isReseller = user.isReseller;
  }

  return { id, user, isDev, isOwner, isReseller };
}

async function editOrSend(ctx, text, keyboard) {
  try {
    if (ctx.callbackQuery) {
      await ctx.editMessageText(text, {
        parse_mode: "Markdown",
        reply_markup: keyboard
      });
    } else {
      await ctx.reply(text, {
        parse_mode: "Markdown",
        reply_markup: keyboard
      });
    }
  } catch (e) {
    if (!e.description?.includes("message is not modified")) {
      console.error("Render error:", e);
    }
  }
}

/* ===================== PERMISSION ===================== */

function onlyOwner(ctx) {
  if (!tg(ctx.from?.id).isOwner) {
    ctx.answerCallbackQuery({
      text: "⛔ Access denied!",
      show_alert: true
    });
    return false;
  }
  return true;
}

function onlyDev(ctx) {
  if (!tg(ctx.from?.id).isDev) {
    ctx.answerCallbackQuery({
      text: "⛔ Developer only!",
      show_alert: true
    });
    return false;
  }
  return true;
}

/* ===================== PAGES ===================== */

async function sendHome(ctx) {
  const name = ctx.from?.first_name || "User";
  const userId = ctx.from?.id;

  const text = `
\`\`\`
Halo ${name}!

Selamat datang di bot multifungsi.
Pilih menu di bawah untuk memulai.
\`\`\`
`.trim();

  const kb = new InlineKeyboard()
    .text("⚡ Performance", "menu:performance")
    .text("📋 Panel", "menu:panel")
    .row()
    .text("👤 User Info", "menu:userinfo")
    .text("❌ Close", "menu:close")
    .row()
    .text("🎴 OtakuDesu", "otaku:main_menu")

  if (tg(userId).isOwner) {
    kb.row().text("👑 Owner Menu", "menu:owner");
  }

  return editOrSend(ctx, text, kb);
}

async function sendPerformance(ctx) {
  const mem = process.memoryUsage();
  const usage = ((mem.heapUsed / mem.heapTotal) * 100).toFixed(1);
  const cpus = os.cpus();
  const loadAvg = os.loadavg().map(v => v.toFixed(2)).join(", ");

  const text = `
⚡ *System Performance*

💾 Memory:
• Used: \`${formatBytes(mem.heapUsed)}\`
• Total: \`${formatBytes(mem.heapTotal)}\`
• Usage: \`${usage}%\`

🖥 System:
• CPU: \`${cpus[0]?.model}\`
• Cores: \`${cpus.length}\`
• Platform: \`${os.platform()}\`
• Load Avg: \`${loadAvg}\`

⏱ Runtime:
• Uptime: \`${formatUptime(process.uptime())}\`
• Node: \`${process.version}\`
`.trim();

  const kb = new InlineKeyboard()
    .text("🔄 Refresh", "menu:performance")
    .row()
    .text("⬅ Back", "menu:home");

  return editOrSend(ctx, text, kb);
}

async function sendPanel(ctx) {
  const text = `
📋 *Panel Pterodactyl*

Pilih perintah yang tersedia
`.trim();

  const kb = new InlineKeyboard()
    .text("/userinfo <uid>", "main_userinfo")
    .text("/panel", "main_panel")
    .row()
    .text("⬅ Back", "menu:home");

  return editOrSend(ctx, text, kb);
}

async function sendUserInfo(ctx) {
  const u = ctx.from;

  const text = `
👤 *User Information*

\`\`\`
ID       : ${u.id}
Name     : ${u.first_name} ${u.last_name || ""}
Username : ${u.username || "-"}
Language : ${u.language_code}
Premium  : ${u.is_premium ? "YES" : "NO"}
Bot      : ${u.is_bot ? "YES" : "NO"}
\`\`\`
`.trim();

  const kb = new InlineKeyboard()
    .text("🔄 Refresh", "menu:userinfo")
    .row()
    .text("⬅ Back", "menu:home");

  return editOrSend(ctx, text, kb);
}

async function sendOwner(ctx) {
  const text = `
👑 *Owner Menu*

Panel khusus administrator bot
`.trim();

  const kb = new InlineKeyboard()
    .text("📤 Backup & Restore", "menu:backup")
    .row()
    .text("⚠️ Check Limit", "menu:limit")
    .row()
    .text("⬅ Back", "menu:home");

  return editOrSend(ctx, text, kb);
}

async function sendBackup(ctx) {
  const text = `
📤 *Backup & Restore*

Backup & restore data bot ke GitHub
`.trim();

  const kb = new InlineKeyboard()
    .text("📤 Run Backup", "menu:backup-run")
    .row()
    .text("📥 Run Restore", "menu:restore-run")
    .row()
    .text("⬅ Back", "menu:owner");

  return editOrSend(ctx, text, kb);
}

async function sendLimit(ctx) {
  try {
    const rate = await checkRateLimit();
    const kb = new InlineKeyboard()
      .text("🔄 Refresh", "menu:limit")
      .row()
      .text("⬅ Back", "menu:owner");
    return editOrSend(ctx, rate.text, kb);
  } catch (e) {
    return editOrSend(
      ctx,
      `❌ Error: ${e.message}`,
      new InlineKeyboard().text("⬅ Back", "menu:owner")
    );
  }
}










/* =====================================================
 * UTIL
 * ===================================================== */

function getPanels() {
  return db.cg("api").get("pterodactyl") || [];
}

function deny(ctx, text) {
  return ctx.answerCallbackQuery({
    text,
    show_alert: true
  });
}

function getPanelByIndex(index) {
  const panels = getPanels();
  const i = Number(index);
  return Number.isInteger(i) && panels[i] ? panels[i] : null;
}

function maskURL(url) {
  const p = url.replace(/^https?:\/\//, "").split(".");
  if (p.length < 3) return url;
  p[1] = p[1][0] + "***" + p[1].slice(-1);
  return p.join(".");
}

async function isWaExists(jid) {
  try {
    const res = await conn.onWhatsApp(jid);
    return res[0] || { exists: false, jid, lid: "" };
  } catch {
    return { exists: false, jid, lid: "" };
  }
}

async function safeAlert(ctx, text, alert = false) {
  if (!ctx.callbackQuery) return;
  try {
    await ctx.answerCallbackQuery({
      text: String(text).slice(0, 40),
      show_alert: alert,
    });
  } catch {}
}

async function safeEdit(ctx, text, extra = {}) {
  try {
    if (ctx.callbackQuery?.message) {
      return await ctx.editMessageText(text, extra);
    }
  } catch {}
  return ctx.reply(text, extra);
}

async function showNestEggs(ctx, panelIndex) {
  const panel = getPanelByIndex(panelIndex);
  if (!panel) return safeAlert(ctx, "Panel tidak valid", true);
  const res = await panelAPI.getnestegg(panel.url);
  if (!res || res.error || !res.ok) return safeAlert(ctx, "Gagal ambil data Eggs", true);
  const kb = new InlineKeyboard();
  kb.text("⬅️ Kembali", `ui_panel:${panelIndex}`).row();
  await safeEdit(ctx, res.mess, { reply_markup: kb, parse_mode: "Markdown" });
}

/* =====================================================
 * PANEL SELECT
 * ===================================================== */

async function selectPanel(ctx, userId = null) {
  const panels = getPanels();
  if (!panels.length) {
    await ctx.reply("❌ Tidak ada panel terdaftar");
    return null;
  }

  const kbz = new InlineKeyboard()
    .text("📋 CLICK HERE", `ui_panel:0` + (userId ? `:${userId}` : "")).row();

  if (panels.length === 1) return ctx.reply((userId ? `Info UserID ${userId}` : "Feature List"), { reply_markup: kbz });

  const kb = new InlineKeyboard();
  panels.forEach((p, i) => {
    const callbackData = `ui_panel:${i}` + (userId ? `:${userId}` : "");
    kb.text(`${p.name || "Panel"}`, callbackData).row();
  });

  await ctx.reply("Pilih panel:", { reply_markup: kb });
  return null;
}

/* =====================================================
 * USER LIST (PAGED)
 * ===================================================== */

async function showUserList(ctx, panelIndex, page = 1, admin = false) {
  const panel = getPanelByIndex(panelIndex);
  if (!panel) return safeAlert(ctx, "Panel tidak valid", true);

  const res = await panelAPI.userlist(panel.url, page, admin);
  if (!res || res.error || !res.ok)
    return safeAlert(ctx, "Gagal ambil user", true);

  const { data, total, total_page } = res;
  
  let text = admin ? "👑 *ADMIN LIST*\n\n" : "👤 *USER LIST*\n\n";
  text += `📊 Total: ${total} ${admin ? 'admin' : 'user'}\n`;
  text += `📄 Page: ${page}/${total_page}\n`;
  text += `━━━━━━━━━━━━━━━━\n\n`;
  
  data.forEach((u, idx) => {
    const num = ((page - 1) * 15) + idx + 1;
    text += `${num}. *${u.username}* (ID: ${u.usrid})\n`;
    text += `   📧 ${u.email}\n`;
    text += `   🏷️ ${u.role}\n`;
    text += `   🖥️ ${u.server.length} server\n\n`;
  });
  
  const kb = new InlineKeyboard();
  kb.text("📋 Menu Info", `ui_panel:${panelIndex}`).row();
  
  data.forEach(u => {
    kb.text(`${u.usrid} | ${u.username}`, `ui_user:${panelIndex}:${u.usrid}:1`).row();
  });

  if (total_page > 1) {
    if (page > 1) kb.text("⬅ Prev", admin ? `ui_userlist_admin:${panelIndex}:${page - 1}` : `ui_userlist:${panelIndex}:${page - 1}`);
    if (page < total_page) kb.text("Next ➡", admin ? `ui_userlist_admin:${panelIndex}:${page + 1}` : `ui_userlist:${panelIndex}:${page + 1}`);
    kb.row();
  }

  await safeEdit(ctx, text, { reply_markup: kb, parse_mode: "Markdown" });
}

/* =====================================================
 * USER INFO + SERVER PAGINATION (IMPROVED)
 * ===================================================== */

async function showUserInfo(ctx, panelIndex, userId, srvPage = 1) {
  const panel = getPanelByIndex(panelIndex);
  if (!panel) return safeAlert(ctx, "Panel tidak valid", true);

  const res = await panelAPI.userinfo(panel.url, userId);
  if (!res || res.error || !res.ok)
    return safeAlert(ctx, "User tidak ditemukan", true);

  const u = res;
  const servers = Array.isArray(u.server) ? u.server : [];

  const perPage = 3;
  const totalSrv = servers.length;
  const totalPage = Math.max(1, Math.ceil(totalSrv / perPage));
  const page = Math.min(Math.max(1, srvPage), totalPage);

  const slice = servers.slice((page - 1) * perPage, page * perPage);

  let text = `╭━━━━『 👤 *USER INFO* 』━━━━╮\n`;
  text += `│\n`;
  text += `│ 🆔 ID: \`${u.usrid}\`\n`;
  text += `│ 👤 Username: *${u.username}*\n`;
  text += `│ 📧 Email: ${u.email}\n`;
  text += `│ 👥 Name: ${u.name}\n`;
  text += `│\n`;
  text += `│ 🏷️ Role: ${u.role === "Admins" ? "👑 Admin" : "👤 User"}\n`;
  text += `│ 🔐 2FA: ${u.a2fa}\n`;
  text += `│ 📅 Created: ${new Date(u.create).toLocaleDateString('id-ID')}\n`;
  text += `│\n`;
  text += `│ 🖥️ Total Server: ${totalSrv}\n`;
  text += `│\n`;
  text += `╰━━━━━━━━━━━━━━━━━━━━━╯`;

  if (slice.length) {
    text += `\n\n╭━━━『 🖥️ *SERVERS* (${page}/${totalPage}) 』━━━╮\n`;
    slice.forEach((s, idx) => {
      const num = ((page - 1) * perPage) + idx + 1;
      text += `│\n`;
      text += `│ ${num}. *${s.name}* (ID: ${s.srvid})\n`;
      text += `│ ├ 💾 RAM: ${s.ram}\n`;
      text += `│ ├ 💿 Disk: ${s.disk}\n`;
      text += `│ ├ ⚡ CPU: ${s.cpu}\n`;
      text += `│ └ 📊 Status: ${s.status === "Aktif" ? "✅ Active" : "⏸️ Suspended"}\n`;
    });
    text += `│\n`;
    text += `╰━━━━━━━━━━━━━━━━━━━━━╯`;
  } else {
    text += `\n\n📝 User belum memiliki server`;
  }

  const kb = new InlineKeyboard();

  kb.text(u.role === "Admins" ? "👤 Turunkan Admin" : "👑 Jadikan Admin", `ui_user_admin:${panelIndex}:${u.usrid}`);
  kb.text("🔑 Reset Password", `ui_user_pwd:${panelIndex}:${u.usrid}`).row();
  kb.text("🗑 Hapus User", `ui_user_del:${panelIndex}:${u.usrid}`);
  kb.text("📋 Menu Info", `ui_panel:${panelIndex}`).row();
  kb.text("➕ Tambah Server", `ui_srv_add:${panelIndex}:${u.usrid}`).row();  

  slice.forEach(s => {
    kb.text(`🖥 ${s.name}`, `ui_srv:${panelIndex}:${s.srvid}`).row();
  });

  if (totalPage > 1) {
    if (page > 1) kb.text("⬅ Prev", `ui_user:${panelIndex}:${u.usrid}:${page - 1}`);
    if (page < totalPage) kb.text("Next ➡", `ui_user:${panelIndex}:${u.usrid}:${page + 1}`);
    kb.row();
  }

  await safeEdit(ctx, text, { reply_markup: kb, parse_mode: "Markdown" });
}

/* =====================================================
 * ADD SERVER (IMPROVED)
 * ===================================================== */

async function showAddServerRAM(ctx, panelIndex, userId, srvPage = 1) {
  const panel = getPanelByIndex(panelIndex);
  if (!panel) return safeAlert(ctx, "Panel tidak valid", true);

  const res = await panelAPI.userinfo(panel.url, userId);
  if (!res || res.error || !res.ok)
    return safeAlert(ctx, "User tidak ditemukan", true);

  const u = res;
  const servers = Array.isArray(u.server) ? u.server : [];

  let text = `╭━━━『 ➕ *ADD SERVER* 』━━━━╮\n`;
  text += `│\n`;
  text += `│ 👤 User: *${u.username}*\n`;
  text += `│ 🆔 ID: \`${u.usrid}\`\n`;
  text += `│ 🖥️ Current Servers: ${servers.length}\n`;
  text += `│\n`;
  text += `╰━━━━━━━━━━━━━━━━━━━━━╯\n\n`;
  text += `📊 *Pilih Spesifikasi RAM:*\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `💡 CPU dihitung otomatis:\n`;
  text += `   RAM × 25 + 10 = CPU%\n\n`;
  text += `Contoh:\n`;
  text += `• 1GB = 35% CPU\n`;
  text += `• 5GB = 135% CPU\n`;
  text += `• Unlimited = ∞ CPU`;

  const kb = new InlineKeyboard();
  const cpuOf = gb => (gb === 0 ? "∞" : `${gb * 25 + 10}%`);

  for (let i = 1; i <= 5; i++) {
    kb
      .text(`${i}GB (${cpuOf(i)})`, `ui_srv_add_ok:${panelIndex}:${userId}:${i}`)
      .text(`${i + 5}GB (${cpuOf(i + 5)})`, `ui_srv_add_ok:${panelIndex}:${userId}:${i + 5}`)
      .row();
  }
  kb.text("♾️ Unlimited (CPU ∞)", `ui_srv_add_ok:${panelIndex}:${userId}:0`).row();
  kb.text("⬅️ Kembali", `ui_user:${panelIndex}:${userId}:1`);
  
  await safeEdit(ctx, text, { reply_markup: kb, parse_mode: "Markdown" });
}

/* =====================================================
 * SERVER INFO (IMPROVED)
 * ===================================================== */

async function showServerInfo(ctx, panelIndex, srvId) {
  const panel = getPanelByIndex(panelIndex);
  if (!panel) return safeAlert(ctx, "Panel tidak valid", true);

  const s = await panelAPI.srvinfo(panel.url, srvId);
  if (!s || s.error || !s.ok)
    return safeAlert(ctx, "Server error", true);

  // ✅ IMPROVED: Complete server info
  let text = `╭━━━『 🖥️ *SERVER INFO* 』━━━╮\n`;
  text += `│\n`;
  text += `│ 🆔 ID: \`${s.srvid}\`\n`;
  text += `│ 📝 Name: *${s.name}*\n`;
  text += `│ 👤 User ID: ${s.usrid}\n`;
  text += `│\n`;
  text += `│ 📊 *Specifications:*\n`;
  text += `│ ├ 💾 RAM: ${s.ram}\n`;
  text += `│ ├ 💿 Disk: ${s.disk}\n`;
  text += `│ └ ⚡ CPU: ${s.cpu}\n`;
  text += `│\n`;
  text += `│ 🔧 *Configuration:*\n`;
  text += `│ ├ 🌐 Node: ${s.node}\n`;
  text += `│ ├ 🥚 Nest: ${s.nest}\n`;
  text += `│ └ 🪺 Egg: ${s.egg}\n`;
  text += `│\n`;
  text += `│ 📊 Status: ${s.status === "Aktif" ? "✅ Active" : "⏸️ Suspended"}\n`;
  text += `│\n`;
  text += `╰━━━━━━━━━━━━━━━━━━━━━╯`;

  let statusSus = s.status !== "Suspended"

  const kb = new InlineKeyboard();
  kb.text(statusSus ? "⏸ Suspend" : "▶ Unsuspend", `ui_srv_act:${panelIndex}:${srvId}:${statusSus ? "suspend":"unsuspend"}`).row();
  kb.text("♻ Reinstall", `ui_srv_act:${panelIndex}:${srvId}:reinstall`).row();
  kb.text("🗑 Hapus Server", `ui_srv_del:${panelIndex}:${srvId}:${s.usrid}`).row();
  kb.text("⬅ Kembali", `ui_user:${panelIndex}:${s.usrid}:1`);

  await safeEdit(ctx, text, { reply_markup: kb, parse_mode: "Markdown" });
}

/* =====================================================
 * SERVER LIST (IMPROVED)
 * ===================================================== */
 
async function showServerList(ctx, panelIndex, page = 1) {
  const panel = getPanelByIndex(panelIndex);
  if (!panel) return safeAlert(ctx, "Panel tidak valid", true);

  const res = await panelAPI.srvlist(panel.url, page);
  if (!res || res.error || !res.ok)
    return safeAlert(ctx, "Gagal ambil server", true);

  const { data, total, total_page } = res;
  
  let text = `╭━━━『 🖥️ *SERVER LIST* 』━━━━╮\n`;
  text += `│\n`;
  text += `│ 📊 Total: ${total} servers\n`;
  text += `│ 📄 Page: ${page}/${total_page}\n`;
  text += `│\n`;
  text += `╰━━━━━━━━━━━━━━━━━━━━━╯\n\n`;
  
  data.forEach((s, idx) => {
    const num = ((page - 1) * 15) + idx + 1;
    const statusIcon = s.status === "Aktif" ? "✅" : "⏸️";
    text += `${num}. *${s.name}* ${statusIcon}\n`;
    text += `   🆔 ID: ${s.srvid} | 👤 User: ${s.usrid}\n`;
    text += `   💾 ${s.ram} | ⚡ ${s.cpu}\n\n`;
  });
  
  const kb = new InlineKeyboard();
  kb.text("📋 Menu Info", `ui_panel:${panelIndex}`).row();

  data.forEach(s => {
    kb.text(`${s.srvid} | ${s.name}`, `ui_srv:${panelIndex}:${s.srvid}`).row();
  });

  if (total_page > 1) {
    if (page > 1) kb.text("⬅ Prev", `ui_srvlist:${panelIndex}:${page - 1}`);
    if (page < total_page) kb.text("Next ➡", `ui_srvlist:${panelIndex}:${page + 1}`);
    kb.row();
  }

  await safeEdit(ctx, text, { reply_markup: kb, parse_mode: "Markdown" });
}





let session_panel = {};


/* =====================================================
 * COMMAND
 * ===================================================== */
bot.command(["start", "menu"], sendHome);

bot.command("userinfo", async ctx => {
  const check = tg(ctx.from.id)
  if (!check.user) return ctx.reply("🔐 Verifikasi dulu /otp");
  if (!check.isReseller) return ctx.reply("🔒 Fitur ini hanya untuk *Reseller*.", { parse_mode: "Markdown" });
  const text = ctx.message.text.trim();
  const parts = text.split(" ");
  const userId = parts[1];

  await selectPanel(ctx, userId);
});

bot.command("panel", async ctx => {
  const panels = getPanels();
  const chatId = ctx.chat.id;
  const check = tg(ctx.from.id)
  if (!check.user) return ctx.reply("🔐 Verifikasi dulu /otp");
  if (!check.isReseller) return ctx.reply("🔒 Fitur ini hanya untuk *Reseller*.", { parse_mode: "Markdown" });
  if (!panels.length) return ctx.reply("❌ Tidak ada panel terdaftar");
  session_panel[chatId] = {};
  if (panels.length === 1) {
    session_panel[chatId].panelIndex = 0;
    return showPanelMenu(ctx);
  }
  const kb = new InlineKeyboard();
  panels.forEach((p, i) => {
    kb.text(`${p.name || "Panel"}`, `ui_select_panel:${i}`).row();
  });
  await ctx.reply("Pilih panel:", { reply_markup: kb });
});



bot.callbackQuery("menu:home", ctx => (ctx.answerCallbackQuery(), sendHome(ctx)));
bot.callbackQuery("menu:performance", ctx => (ctx.answerCallbackQuery(), sendPerformance(ctx)));
bot.callbackQuery("menu:panel", ctx => (ctx.answerCallbackQuery(), sendPanel(ctx)));
bot.callbackQuery("menu:userinfo", ctx => (ctx.answerCallbackQuery(), sendUserInfo(ctx)));
bot.callbackQuery("menu:owner", ctx => onlyOwner(ctx) && (ctx.answerCallbackQuery(), sendOwner(ctx)));
bot.callbackQuery("menu:backup", ctx => onlyOwner(ctx) && (ctx.answerCallbackQuery(), sendBackup(ctx)));
bot.callbackQuery("menu:limit", ctx => onlyOwner(ctx) && (ctx.answerCallbackQuery(), sendLimit(ctx)));

bot.callbackQuery("menu:backup-run", ctx => {
  if (!onlyDev(ctx)) return;
  ctx.answerCallbackQuery({ text: "Backup completed!", show_alert: true });
  return backupMultiple(db.cg().get("backup.github").filePath);
});

bot.callbackQuery("menu:restore-run", ctx => {
  if (!onlyDev(ctx)) return;
  ctx.answerCallbackQuery({ text: "Restore completed!", show_alert: true });
  return restoreMultiple(db.cg().get("backup.github").filePath);
});

bot.callbackQuery("menu:close", async ctx => {
  await ctx.answerCallbackQuery();
  try { await ctx.deleteMessage(); } catch {}
});

bot.callbackQuery("main_userinfo", async ctx => {
  await ctx.deleteMessage();
  const check = tg(ctx.from.id)
  if (!check.user) return ctx.reply("🔐 Verifikasi dulu /otp");
  if (!check.isReseller) return ctx.reply("🔒 Fitur ini hanya untuk *Reseller*.", { parse_mode: "Markdown" });

  return selectPanel(ctx, null);
});

bot.callbackQuery("main_panel", async ctx => {
  await ctx.deleteMessage();
  const panels = getPanels();
  const chatId = ctx.chat.id;
  const check = tg(ctx.from.id)
  if (!check.user) return ctx.reply("🔐 Verifikasi dulu /otp");
  if (!check.isReseller) return ctx.reply("🔒 Fitur ini hanya untuk *Reseller*.", { parse_mode: "Markdown" });
  if (!panels.length) return ctx.reply("❌ Tidak ada panel terdaftar");
  session_panel[chatId] = {};
  if (panels.length === 1) {
    session_panel[chatId].panelIndex = 0;
    return showPanelMenu(ctx);
  }
  const kb = new InlineKeyboard();
  panels.forEach((p, i) => {
    kb.text(`${p.name || "Panel"}`, `ui_select_panel:${i}`).row();
  });
  return ctx.reply("Pilih panel:", { reply_markup: kb });
});


/* =====================================================
 * CALLBACKS
 * ===================================================== */

bot.callbackQuery(/ui_panel:(\d+)(?::(\d+))?/, async ctx => {
  const panelIndex = Number(ctx.match[1]);
  const userId = ctx.match[2];

  if (userId) {
    await showUserInfo(ctx, panelIndex, userId);
  } else {
    const kb = new InlineKeyboard()
      .text("📓 List Admin", `ui_userlist_admin:${panelIndex}:1`).row()
      .text("📚 List Users", `ui_userlist:${panelIndex}:1`).row()
      .text("💾 List Server", `ui_srvlist:${panelIndex}:1`).row()
      .text("🥚 List Eggs", `ui_nestegg:${panelIndex}`).row();
    await safeEdit(ctx, "📋 *Menu Info:*", { reply_markup: kb, parse_mode: "Markdown" });
  }
});

bot.callbackQuery(/ui_nestegg:(\d+)/, ctx =>
  showNestEggs(ctx, ctx.match[1])
);

bot.callbackQuery(/ui_userlist:(\d+):(\d+)/, ctx =>
  showUserList(ctx, ctx.match[1], Number(ctx.match[2]))
);

bot.callbackQuery(/ui_userlist_admin:(\d+):(\d+)/, ctx =>
  showUserList(ctx, ctx.match[1], Number(ctx.match[2]), true)
);

bot.callbackQuery(/ui_user:(\d+):(\d+):?(\d+)?/, ctx =>
  showUserInfo(ctx, ctx.match[1], ctx.match[2], Number(ctx.match[3] || 1))
);

bot.callbackQuery(/ui_user_admin:(\d+):(\d+)/, async ctx => {
  const check = tg(ctx.from.id)
  if (!check.isOwner) return deny(ctx, "Hanya bisa dilakukan oleh Owner");
  const panel = getPanelByIndex(ctx.match[1]);
  const res = await panelAPI.usertgadp(panel.url, ctx.match[2]);
  await safeAlert(ctx, res.error ? "Error" : "OK");
  await showUserInfo(ctx, ctx.match[1], ctx.match[2], 1);
});

bot.callbackQuery(/ui_user_pwd:(\d+):(\d+)/, async ctx => {
  const check = tg(ctx.from.id)

  if (!check.isOwner) return deny(ctx, "Hanya bisa dilakukan oleh Owner");
  
  const panel = getPanelByIndex(ctx.match[1]);
  const pwd = String(Math.floor(Math.random() * 900000) + 100000); // 6 digit
  const res = await panelAPI.usertgpwd(panel.url, ctx.match[2], pwd);
  await safeAlert(ctx, res.error ? "Error" : `Password: ${pwd}`, true);
});

bot.callbackQuery(/ui_user_del:(\d+):(\d+)/, async ctx => {
  const check = tg(ctx.from.id)

  if (!check.isOwner) return deny(ctx, "Hanya bisa dilakukan oleh Owner");
  
  const panel = getPanelByIndex(ctx.match[1]);
  const res = await panelAPI.userdel(panel.url, ctx.match[2]);
  await safeAlert(ctx, res.error ? "User gagal dihapus" : res.mess, true);
  await ctx.deleteMessage();
});

bot.callbackQuery(/ui_srvlist:(\d+):(\d+)/, ctx =>
  showServerList(ctx, ctx.match[1], Number(ctx.match[2]))
);

bot.callbackQuery(/ui_srv_add:(\d+):(\d+)/, ctx =>
  showAddServerRAM(ctx, ctx.match[1], ctx.match[2])
);

bot.callbackQuery(/ui_srv_add_ok:(\d+):(\d+):(\d+)/, async ctx => {
  const panel = getPanelByIndex(ctx.match[1]);
  const result = await panelAPI.srvadd(panel.url, ctx.match[2], ctx.match[3]);
  
  if (!result.ok) {
    return safeAlert(ctx, "Gagal buat server", true);
  }
  
  await safeAlert(ctx, "Server dibuat", true);
  await showUserInfo(ctx, ctx.match[1], ctx.match[2], 1);
});

bot.callbackQuery(/ui_srv:(\d+):(\d+)/, ctx =>
  showServerInfo(ctx, ctx.match[1], ctx.match[2])
);

bot.callbackQuery(/ui_srv_act:(\d+):(\d+):(suspend|unsuspend|reinstall)/, async ctx => {
  const check = tg(ctx.from.id)

  if (!check.isOwner) return deny(ctx, "Hanya bisa dilakukan oleh Owner");
  
  const panel = getPanelByIndex(ctx.match[1]);
  const result = await panelAPI.srvsetts(panel.url, ctx.match[2], ctx.match[3]);
  if (result.error) return safeAlert(ctx, `Gagal ${ctx.match[3]} server.`, true);
  await safeAlert(ctx, result.mess, true);
  if (ctx.match[3] === "reinstall") return
  await showServerInfo(ctx, ctx.match[1], ctx.match[2]);
});

bot.callbackQuery(/ui_srv_del:(\d+):(\d+):(\d+)/, async ctx => {
  const check = tg(ctx.from.id)

  if (!check.isOwner) return deny(ctx, "Hanya bisa dilakukan oleh Owner");
  
  const panel = getPanelByIndex(ctx.match[1]);
  await panelAPI.srvdel(panel.url, ctx.match[2]);
  await safeAlert(ctx, "Server dihapus", true);
  await showUserInfo(ctx, ctx.match[1], ctx.match[3], 1);
});












/* ===================== SELECT PANEL ===================== */
bot.callbackQuery(/ui_select_panel:(\d+)/, async ctx => {
  const chatId = ctx.chat.id;
  if (ctx.callbackQuery.message) await ctx.deleteMessage();

  session_panel[chatId] = session_panel[chatId] || {};
  session_panel[chatId].panelIndex = parseInt(ctx.match[1]);

  await showPanelMenu(ctx);
});

/* ===================== PANEL MENU ===================== */
async function showPanelMenu(ctx) {
  const kb = new InlineKeyboard()
    .text("➕ Add User", "ui_add_user").row()
    .text("➕ Add User + Server", "ui_add_user_srv");

  await ctx.reply("📋 *Pilih Aksi:*", { reply_markup: kb, parse_mode: "Markdown" });
}

/* ===================== ADD USER ===================== */
bot.callbackQuery("ui_add_user", async ctx => {
  const chatId = ctx.chat.id;
  if (ctx.callbackQuery.message) await ctx.deleteMessage();

  if (session_panel[chatId]?.panelIndex === undefined)
    return ctx.reply("Panel belum dipilih.");

  session_panel[chatId].mode = "user";
  session_panel[chatId].step = "username";

  await ctx.reply(
    "📝 *Masukkan Username*\n\n" +
    "Format:\n" +
    "• Alphanumeric (a-z, A-Z, 0-9)\n" +
    "• Minimal 3 karakter\n" +
    "• Tanpa spasi atau simbol",
    { parse_mode: "Markdown" }
  );
});

/* ===================== ADD USER + SERVER ===================== */
bot.callbackQuery("ui_add_user_srv", async ctx => {
  const chatId = ctx.chat.id;
  if (ctx.callbackQuery.message) await ctx.deleteMessage();

  if (session_panel[chatId]?.panelIndex === undefined)
    return ctx.reply("Panel belum dipilih.");

  session_panel[chatId].mode = "user_srv";
  session_panel[chatId].step = "username";

  await ctx.reply(
    "📝 *Masukkan Username*\n" +
    "(User + Server)\n\n" +
    "Format:\n" +
    "• Alphanumeric (a-z, A-Z, 0-9)\n" +
    "• Minimal 3 karakter\n" +
    "• Tanpa spasi atau simbol",
    { parse_mode: "Markdown" }
  );
});

/* ===================== TOGGLE ROOT ADMIN ===================== */
bot.callbackQuery("ui_rootadmin", async ctx => {
  const chatId = ctx.chat.id;
  const s = session_panel[chatId];
  if (!s) return;
  const check = tg(ctx.from.id)

  if (!check.isOwner) return deny(ctx, "Hanya bisa dilakukan oleh Owner");
  
  s.root_admin = !s.root_admin;

  const kb = new InlineKeyboard()
    .text(`Root Admin: ${s.root_admin ? "✅ ON" : "❌ OFF"}`, "ui_rootadmin").row()
    .text("✅ Lanjut", "ui_next_after_root").row()
    .text("❌ Batalkan", "ui_batal_user");

  await safeEdit(ctx, 
    `📋 *Data User:*\n\n` +
    `👤 Username: \`${s.username}\`\n` +
    `👑 Root Admin: ${s.root_admin ? "✅ ON" : "❌ OFF"}`, 
    { reply_markup: kb, parse_mode: "Markdown" }
  );
});

/* ===================== NEXT AFTER ROOT ===================== */
bot.callbackQuery("ui_next_after_root", async ctx => {
  const chatId = ctx.chat.id;
  const s = session_panel[chatId];
  if (!s) return;

  if (ctx.callbackQuery.message) await ctx.deleteMessage();

  /* === JIKA USER + SERVER → PILIH RAM DULU === */
  if (s.mode === "user_srv") {
    s.step = "select_ram";

    const kb = new InlineKeyboard();
    const cpuOf = gb => (gb === 0 ? "∞" : `${gb * 25 + 10}%`);

    for (let i = 1; i <= 5; i++) {
      kb.text(`${i}GB (${cpuOf(i)})`, `ui_srv_add_create:${i}`)
        .text(`${i + 5}GB (${cpuOf(i + 5)})`, `ui_srv_add_create:${i + 5}`)
        .row();
    }
    kb.text("♾️ Unlimited (CPU ∞)", "ui_srv_add_create:0");

    return ctx.reply(
      "📊 *Pilih RAM untuk Server:*\n\n" +
      "💡 CPU dihitung otomatis:\n" +
      "`RAM × 25 + 10 = CPU%`\n\n" +
      "Contoh:\n" +
      "• 1GB = 35% CPU\n" +
      "• 5GB = 135% CPU\n" +
      "• Unlimited = ∞ CPU",
      { reply_markup: kb, parse_mode: "Markdown" }
    );
  }

  /* === HANYA USER → PILIH DELIVERY === */
  return askDelivery(ctx);
});

/* ===================== SELECT RAM ===================== */
bot.callbackQuery(/ui_srv_add_create:(\d+)/, async ctx => {
  const chatId = ctx.chat.id;
  const s = session_panel[chatId];
  if (!s) return;

  if (ctx.callbackQuery.message) await ctx.deleteMessage();

  s.ram = parseInt(ctx.match[1]);
  s.step = "choose_delivery";

  await askDelivery(ctx);
});

/* ===================== ASK DELIVERY ===================== */
async function askDelivery(ctx) {
  const chatId = ctx.chat.id;
  const s = session_panel[chatId];

  const kb = new InlineKeyboard()
    .text("📱 Kirim ke WhatsApp", "ui_wa_yes").row()
    .text("➡️ Lanjut buat di sini", "ui_wa_no");

  let text = `╭━━━『 ✅ *KONFIRMASI* 』━━━╮\n`;
  text += `│\n`;
  text += `│ 👤 Username: \`${s.username}\`\n`;
  text += `│ 👑 Root Admin: ${s.root_admin ? "✅ ON" : "❌ OFF"}\n`;
  if (s.mode === "user_srv") {
    const ramText = s.ram === 0 ? "Unlimited" : `${s.ram}GB`;
    const cpuText = s.ram === 0 ? "∞" : `${s.ram * 25 + 10}%`;
    text += `│\n`;
    text += `│ 🖥️ *Server Specs:*\n`;
    text += `│ ├ RAM: ${ramText}\n`;
    text += `│ ├ CPU: ${cpuText}\n`;
    text += `│ └ Disk: ${ramText}\n`;
  }
  text += `│\n`;
  text += `╰━━━━━━━━━━━━━━━━━━━━━╯\n\n`;
  text += `📤 *Pilih pengiriman data:*`;

  await ctx.reply(text, { reply_markup: kb, parse_mode: "Markdown" });
}

/* ===================== DELIVERY OPTIONS ===================== */
bot.callbackQuery("ui_wa_yes", async ctx => {
  const chatId = ctx.chat.id;
  const s = session_panel[chatId];
  if (!s) return;

  if (ctx.callbackQuery.message) await ctx.deleteMessage();

  s.step = "input_wa";

  await ctx.reply(
    "📱 *Masukkan Nomor WhatsApp*\n\n" +
    "Format:\n" +
    "• Gunakan kode negara\n" +
    "• Tanpa simbol + atau -\n\n" +
    "Contoh:\n" +
    "`628123456789`\n" +
    "`6281234567890`",
    { parse_mode: "Markdown" }
  );
});

bot.callbackQuery("ui_wa_no", async ctx => {
  const chatId = ctx.chat.id;
  const s = session_panel[chatId];
  if (!s) return;

  if (ctx.callbackQuery.message) await ctx.deleteMessage();

  s.send_wa = false;
  await proceedCreate(ctx);
});

/* ===================== CREATE PROCESS (IMPROVED) ===================== */
async function proceedCreate(ctx) {
  const chatId = ctx.chat.id;
  const s = session_panel[chatId];
  const panel = getPanelByIndex(s.panelIndex);

  // Show processing message
  const processingMsg = await ctx.reply("⏳ Membuat user...");

  const resUser = await panelAPI.useradd(panel.url, s.username, s.root_admin);
  
  let resSrv = null
  if (s.mode === "user_srv") {
    resSrv = await panelAPI.srvadd(panel.url, resUser.id, s.ram);
  }

  if (!resUser.ok) {
    delete session_panel[chatId];
    await ctx.api.editMessageText(
      chatId,
      processingMsg.message_id,
      "❌ *Gagal membuat user!*\n\n" +
      "Error:\n" +
      `\`${resUser.error || "Unknown error"}\``,
      { parse_mode: "Markdown" }
    );
    return;
  }

  let text = `✅ *AKUN PANEL PTERODACTYL*\n\n`;

    text += `🧩 *PANEL INFO:*\n`;
    text += `━━━━━━━━━━━━━━━━\n`;
    text += `🌐 Panel: ${panel.name}\n`;
    text += `🔗 Login: ${panel.url}\n\n`;

    text += `🪪 *USER INFO:*\n`;
    text += `━━━━━━━━━━━━━━━━\n`;
    text += ` 🆔 ID: \`${resUser.id}\`\n`;
    text += ` 👤 Username: *${resUser.username}*\n`;
    text += ` 🔑 Password: \`${resUser.password}\`\n`;
    text += ` 👥 Name: ${resUser.first_name} ${resUser.last_name}\n`;
    text += ` 📧 Email: ${resUser.email}\n`;
    text += ` 👑 Admin: ${s.root_admin ? "✅" : "❌"}\n\n`;

  if (s.mode === "user_srv") {
    await ctx.api.editMessageText(
      chatId,
      processingMsg.message_id,
      "⏳ User dibuat! Membuat server...",
      { parse_mode: "Markdown" }
    );
    
    if (!resSrv.ok) {
      await ctx.reply(
        text + "\n\n❌ *Server gagal dibuat!*\n" +
        `Error: \`${resSrv.error || "Unknown error"}\``,
        { parse_mode: "Markdown" }
      );
      delete session_panel[chatId];
      return;
    }
    
    text += `🖥️ *SERVER INFO:*\n`;
    text += `━━━━━━━━━━━━━━━━\n`;
    text += ` 🆔 ID: \`${resSrv.srvid}\`\n`;
    text += ` 📝 Name: *${resSrv.name}*\n`;
    text += ` 👤 User ID: ${resSrv.usrid}\n\n`;

    text += ` 📊 *Specifications:*\n`;
    text += ` ├ 💾 RAM: ${resSrv.spec.ram}\n`;
    text += ` ├ ⚡ CPU: ${resSrv.spec.cpu}\n`;
    text += ` ├ 💿 Disk: ${resSrv.spec.disk}\n\n`;
    text += ` └ 📍 Location: ${resSrv.spec.loc}\n`;
  }

  // Send to WhatsApp if requested
  if (s.send_wa && s.wa_jid) {
    try {
      let waText = `✅ *AKUN PANEL PTERODACTYL*\n\n`;

      waText += `🧩 *PANEL INFO:*\n`;
      waText += `━━━━━━━━━━━━━━━━\n`;
      waText += `🌐 \`Panel:\` \`\`\`${panel.name}\`\`\`\n`;
      waText += `🔗 ${panel.url}\n`;
      waText += `\`Username:\` \`\`\`${resUser.username}\`\`\`\n`;
      waText += `\`Password:\` \`\`\`${resUser.password}\`\`\`\n\n`;
      
      waText += `🪪 *USER INFO:*\n`;
      waText += `━━━━━━━━━━━━━━━━\n`;
      waText += `\`UsrID:\` \`\`\`${resUser.id}\`\`\`\n`;
      waText += `\`Name :\` \`\`\`${resUser.first_name} ${resUser.last_name}\`\`\`\n`;
      waText += `\`Email:\` \`\`\`${resUser.email}\`\`\`\n`;
      waText += `\`Admin:\` \`\`\`${s.root_admin ? "Yes" : "No"}\`\`\`\n\n`;
      
      if (s.mode === "user_srv" && resSrv) {
        waText += `🖥️ *SERVER INFO:*\n`;
        waText += `━━━━━━━━━━━━━━━━\n`;
        waText += `\`UsrID:\` \`\`\`${resSrv.usrid}\`\`\`\n`;
        waText += `\`SrvID:\` \`\`\`${resSrv.srvid}\`\`\`\n`;
        waText += `\`Name :\` \`\`\`${resSrv.name}\`\`\`\n\n`;

        waText += `📊 \`Specifications\`\n`;
        waText += ` ├ \`\`\`RAM :\`\`\` ${resSrv.spec.ram}\n`;
        waText += ` ├ \`\`\`CPU :\`\`\` ${resSrv.spec.cpu}\n`;
        waText += ` ├ \`\`\`Disk:\`\`\` ${resSrv.spec.disk}\n`;
        waText += ` └ \`\`\`Loct:\`\`\` ${resSrv.spec.loc}\n\n`;
      }
      
      waText += `Terimakasih telah bertransaksi.`;
      
      await conn.sendMessage(s.wa_jid, { text: waText });
      text += `\n\n✅ Data telah dikirim ke WhatsApp`;
    } catch (error) {
      console.log(error)
      text += `\n\n⚠️ Gagal mengirim ke WhatsApp`;
    }
  }

  await ctx.api.editMessageText(
    chatId,
    processingMsg.message_id,
    text,
    { parse_mode: "Markdown", disable_web_page_preview: true }
  );
  
  delete session_panel[chatId];
}

/* ===================== CANCEL ===================== */
bot.callbackQuery("ui_batal_user", async ctx => {
  const chatId = ctx.chat.id;
  if (ctx.callbackQuery.message) await ctx.deleteMessage();
  delete session_panel[chatId];
  await ctx.reply("✅ Proses dibatalkan.");
});

/* ===================== MESSAGE HANDLER ===================== */
bot.on("message", async (ctx, next) => {
  const chatId = ctx.chat.id;
  const s = session_panel[chatId];
  
  if (s) {
    /* ===== INPUT WHATSAPP ===== */
    if (s.step === "input_wa") {
      const number = ctx.message.text.replace(/\D/g, "");
      const WAcheck = await isWaExists(number);

      if (!WAcheck.exists) {
        const kb = new InlineKeyboard()
          .text("📱 Kirim ke WhatsApp", "ui_wa_yes").row()
          .text("➡️ Lanjut buat di sini", "ui_wa_no");

        return ctx.reply(
          "❌ *Nomor WhatsApp tidak valid!*\n\n" +
          `Nomor: \`${number}\`\n\n` +
          "Nomor tidak terdaftar di WhatsApp atau salah format.\n\n" +
          "Pilih opsi:",
          { reply_markup: kb, parse_mode: "Markdown" }
        );
      }

      s.wa_jid = WAcheck.jid;
      s.send_wa = true;

      return proceedCreate(ctx);
    }

    /* ===== INPUT USERNAME ===== */
    if (s.step === "username") {
      const username = ctx.message.text.trim();
      
      if (!/^[a-zA-Z0-9]{3,}$/.test(username)) {
        return ctx.reply(
          "❌ *Username tidak valid!*\n\n" +
          "Format yang benar:\n" +
          "• Hanya huruf (a-z, A-Z) dan angka (0-9)\n" +
          "• Minimal 3 karakter\n" +
          "• Tanpa spasi atau simbol\n\n" +
          "Contoh: `user123`, `johndoe`, `admin01`",
          { parse_mode: "Markdown" }
        );
      }

      s.username = username;
      s.root_admin = false;
      s.step = "rootadmin";

      const kb = new InlineKeyboard()
        .text("Root Admin: ❌ OFF", "ui_rootadmin").row()
        .text("✅ Lanjut", "ui_next_after_root").row()
        .text("❌ Batalkan", "ui_batal_user");

      return ctx.reply(
        `📋 *Data User:*\n\n` +
        `👤 Username: \`${username}\`\n` +
        `👑 Root Admin: ❌ OFF\n\n` +
        `Klik tombol *Root Admin* untuk toggle ON/OFF`,
        { reply_markup: kb, parse_mode: "Markdown" }
      );
    }
    return
  }
  await next();
  if (!ctx.message?.text) return;
  if (ctx.message.text.startsWith("/")) return;

  db.func("others").logTelegramMessage({
    chatId: ctx.chat.id,
    senderName: ctx.from.username || ctx.from.first_name,
    groupName: ctx.chat.type.includes("group") ? ctx.chat.title : null,
    username: ctx.from.username,
    isGroup: ctx.chat.type.includes("group"),
    type: "text",
    text: ctx.message.text
  });
});

bot.catch(err => {
  console.error("BOT ERROR:", err.error || err);
})}