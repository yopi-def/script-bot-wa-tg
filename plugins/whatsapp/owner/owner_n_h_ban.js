let handlerBan = async (conn, { m, text }) => {
  // Get target LID
  const target = await db.func("others").getLidFromInput(conn, m, text);
  if (target.error) return m.reply(target.error);
  
  const { lid } = target;
  
  // Check if user exists
  if (!db.users[lid].exists()) {
    return m.reply(
      `❌ User belum terdaftar!\n\n` +
      `📱 LID: ${lid}\n\n` +
      `💡 Minta user kirim pesan ke bot terlebih dahulu.`
    );
  }
  
  const userDB = db.users[lid].get();
  
  // Check if already banned
  if (userDB.isBanned) {
    return m.reply(
      `ℹ️ User sudah di-ban!\n\n` +
      `👤 ${userDB.username || "Unknown"}\n` +
      `📱 +${userDB.phone}`
    );
  }
  
  // Ban user
  db.users[lid].update(user => {
    user.isBanned = true;
    return user;
  });
  
  // Success message
  let msg = `✅ *USER BANNED*\n\n`;
  msg += `👤 ${userDB.username || "Unknown"}\n`;
  msg += `📱 +${userDB.phone}\n`;
  msg += `🚫 Status: Banned\n\n`;
  msg += `User tidak bisa menggunakan bot.`;
  
  await m.reply(msg);
  
  // Notify target user
  try {
    await conn.sendMessage(lid, {
      text: `🚫 *BANNED*\n\n` +
            `Kamu telah di-ban dari bot.\n\n` +
            `Hubungi owner untuk info lebih lanjut.`
    });
  } catch (e) {
    console.log('Failed to notify user:', e.message);
  }
};

handlerBan.cmd = "ban";
handlerBan.alias = ["banuser"];
handlerBan.tags = ["owner"];
handlerBan.desc = "Ban user dari bot (reply/nomor)";
handlerBan.isOwner = true;

module.exports = handlerBan;