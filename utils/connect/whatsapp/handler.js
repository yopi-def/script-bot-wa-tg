const path = require("path");
const chalk = require('chalk');
const db = require("../../database");

const handleCasesMessage = require(path.join(process.cwd(), 'plugins', 'fhynella'));

const cooldown = new Map();
const recentMsgs = new Set();
const globalHits = new Map();
const globalMuteUntil = new Map();

const GLOBAL_COOLDOWN_MS = 3500;
const GLOBAL_LIMIT = 5;
const COOLDOWN_MS = 4000;

function formatUser(date = new Date()) {
  const dd = String(date.getDate()).padStart(2, '0');
  const MM = String(date.getMonth() + 1).padStart(2, '0');
  const HH = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');

  return "user" + dd + MM + HH + mm;
}

function buildCommandIndex(plugins) {
  const indexed = {};
  if (plugins?.size) {
    for (const p of plugins.values()) {
      if (!p?.cmd) continue;
      const cmds = [p.cmd].concat(p.alias || []);
      cmds.forEach(c => (indexed[c.toLowerCase()] = p));
    }
  }
  return indexed;
}

function checkRoleAccess(plugin, roles) {
  const { isOwner, isPremium, isReseller } = roles || {};
  if (!plugin) return { ok: true };
  if (isOwner) return { ok: true };
  if (plugin.isPremium && !isPremium)
    return { ok: false, reason: "PREMIUM_ONLY" };
  if (plugin.isReseller && !isReseller)
    return { ok: false, reason: "RESELLER_ONLY" };
  if (plugin.isOwner && !isOwner)
    return { ok: false, reason: "OWNER_ONLY" };
  return { ok: true };
}


async function handleGameAnswer(conn, m) {
  if (!m.quoted || !m.quoted.id) return false;
  
  const from = m.chat;
  const gameAPI = db.func("game");
  const session = db.session.game[from].get();
  if (!session) return false;
  if (m.quoted.id !== session.messageId) return false;
  const userAnswer = m.body.trim();
  const senderLid = m.senderLid;
  const isCorrect = gameAPI.checkAnswer(userAnswer, session.answer);
  
  if (isCorrect) {
    const timeElapsed = Date.now() - session.startTime;
    gameAPI.ensureUserStats(senderLid);
    let xpBonus = 0;
    const timePercent = timeElapsed / session.timeout;
    if (timePercent < 0.3) xpBonus = 20; // Very fast
    else if (timePercent < 0.5) xpBonus = 10; // Fast
    let xpPenalty = session.hintUsed ? 10 : 0;
    const totalXP = Math.max(5, session.xpReward + xpBonus - xpPenalty);
    gameAPI.updateUserStats(senderLid, true, totalXP, session.gameType);

    const user = db.game[senderLid].get();
    const level = gameAPI.calculateLevel(user.totalXP);

    await conn.sendMessage(from, {
      text: gameAPI.formatCorrectAnswer(totalXP, level, timeElapsed)
    }, { quoted: m });
 
    db.session.game[from].delete();
    
    return true;
  } else {
    const similarity = gameAPI.getSimilarity(userAnswer, 
      Array.isArray(session.answer) ? session.answer[0] : session.answer
    );
    
    db.session.game[from].update({
      attempts: (session.attempts || 0) + 1,
      hintUsed: session.hintUsed
    });
    
    await m.reply(gameAPI.formatWrongAnswer(similarity));
    return true;
  }
}

const handler = async (conn, m) => {
  const id = m.key?.id;
  if (id && recentMsgs.has(id)) return;
  if (id) { recentMsgs.add(id); setTimeout(() => recentMsgs.delete(id), 1500)}

  const body = (m.body || '').trim();
  const from = m.chat;
  const prefixList = [".", "/"]
  const botNumber = await conn.decodeJid(conn.user.id);
  

  // 🔹 Anti-flood grup
  if (m.isGroup) {
    const now = Date.now();
    const until = globalMuteUntil.get(from) || 0;
    if (now < until) return;
    const hits = globalHits.get(from) || [];
    const fresh = hits.filter(t => now - t < 1000);
    fresh.push(now);
    globalHits.set(from, fresh);
    if (fresh.length >= GLOBAL_LIMIT) {
      globalMuteUntil.set(from, now + GLOBAL_COOLDOWN_MS);
      globalHits.set(from, []);
      return;
    }
  }

  // ====================================
  // PEMROSESAN DASAR PERINTAH
  // ====================================
  const prefixRegex = new RegExp(`^(?:${prefixList.map(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`,'i');
  const prefixMatch = body.match(prefixRegex);
  const prefix = prefixMatch ? prefixMatch[0] : '';
  const hasPrefix = Boolean(prefix);

  const sliced = hasPrefix ? body.slice(prefix.length).trim() : body;
  const parts = sliced.split(/\s+/);
  const commandText = (parts[0] || '').toLowerCase();
  const args = parts.slice(1);

  const isDescRequest = /\?+\s*$/.test(commandText);
  const command = isDescRequest ? commandText.replace(/\?+$/, '') : commandText;
  const isBot = m.key.fromMe;
  const groupMetadata = m.isGroup ? await conn.groupMetadata(m.chat).catch(() => {}) : "";
  const groupName = m.isGroup ? groupMetadata.subject : "";
  
  const quoted = m.quoted ? m.quoted : m;
  const mime = (quoted.msg || quoted).mimetype || '';

  // ====================================
  // INFORMASI PENGGUNA
  // ====================================
  const ownerNumbers = [botNumber, "6287895943737", "628217620233", "628154067543"].map(v => (v || "").replace(/[^0-9]/g, "")).filter(Boolean);
  const ownerInfo = await Promise.all(ownerNumbers.map(num => conn.onWhatsApp(num)));
  const ownerLid = ownerInfo.flat().filter(v => v.exists).map(v => v.lid);
  const isOwnerNumber = ownerLid.includes(m.senderLid);

  const isOwnerRole = db.users[m.senderLid].exists() ? db.users[m.senderLid].get().isOwner : true
  const isPremiumRole = db.users[m.senderLid].exists() ? db.users[m.senderLid].get().isPremium : true
  const isResellerRole = db.users[m.senderLid].exists() ? db.users[m.senderLid].get().isReseller : true

  const isDev = isOwnerNumber
  const isOwner = !isDev ? isOwnerRole : true
  const isPremium = !isDev ? isPremiumRole : true
  const isReseller =  !isDev ? isResellerRole : true

  const indexedCommands = buildCommandIndex(conn.plugins);
  const canNoPrefix = (!db.users[m.senderLid].exists()) ? false : (!db.users[m.senderLid].get().usePrefix)
  const clean = parts[0].toLowerCase();
  
  let pluginToRun = null;
  let pluginName = null;
  
  if (!isBot) {
    await handleCasesMessage(conn, m, { botNumber, isOwner })
    db.func("others").logWhatsAppMessage({
      chatId: m.chat,
      senderName: m.pushName || "(Tanpa Nama)",
      groupName: m.isGroup ? groupName || "(Tanpa Nama Grup)" : null,
      isGroup: m.isGroup,
      type: mime || "text",
      text: body
    });
  }

  if (!isBot && m.quoted) {
    const gameHandled = await handleGameAnswer(conn, m);
    if (gameHandled) return;
  }

  if ((hasPrefix && indexedCommands[command]) || (!hasPrefix && canNoPrefix && indexedCommands[clean])) {
    pluginToRun = indexedCommands[command] || indexedCommands[clean];
    pluginName = command || clean;
  }


  let username = formatUser()
  let senderLid = m.senderLid
  let item = {
    timezone: "Asia/Jakarta",
    senderJid: m.senderJid || "",
    phone: m.senderJid?.split("@")[0] || "",
    telegram: ""
  }

  if (!db.users[m.senderLid].exists()) db.users[m.senderLid].ensure(db.data.item(username, senderLid, item))

  if (!pluginToRun) return

  await conn.sendPresenceUpdate("available", m.sender)
  await conn.readMessages([m.key])
  if (!isBot) conn.sendPresenceUpdate("composing", m.chat)
    

  if (isDescRequest) return m.reply(`📘 *DESCRIPTION ${pluginName.toUpperCase()}*\n${pluginToRun.desc || 'Tidak ada deskripsi.'}`);

  const roleCheck = checkRoleAccess(pluginToRun, { isOwner, isPremium, isReseller });
  if (!roleCheck.ok) {
    if (roleCheck.reason === "PREMIUM_ONLY") return m.reply("🔒 Fitur ini hanya untuk *Premium*.");
    if (roleCheck.reason === "RESELLER_ONLY") return m.reply("🔒 Fitur ini hanya untuk *Reseller*.");
    if (roleCheck.reason === "OWNER_ONLY") return m.reply("🔒 Fitur ini hanya untuk *Owner*.");
    return m.reply("⛔ Kamu tidak punya akses.");
  }
  
  const context = {
    m,
    from,
    sender: m.sender,
    args,
    isOwner,
    isPremium,
    isReseller,
    botNumber,
    plugins: conn.plugins,
    prefix,
    command,
    pmd: prefix + command,
    quoted: m.quoted || m,
    text: args.join(' ').trim(),
  };

  if (!isOwner && pluginToRun) {
    const now = Date.now();
    const last = cooldown.get(m.sender) || 0;
    if (now - last < COOLDOWN_MS) return m.reply('😌 Santai dulu...');
    cooldown.set(m.sender, now);
  }

  try {
    await pluginToRun(conn, context);
  } catch (err) {
    console.error('[ERROR]', `Saat command: ${command}`, err);
    await conn.sendMessage(from, { text: '⚠️ Terjadi kesalahan di server.' }, { quoted: m });
  }
};

module.exports = { handler };