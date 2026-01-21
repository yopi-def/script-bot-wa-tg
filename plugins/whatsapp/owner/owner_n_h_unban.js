let handlerUnban = async (conn, { m, text }) => {
  // Get target LID
  const target = await db.func("others").getLidFromInput(conn, m, text);
  if (target.error) return m.reply(target.error);
  
  const { lid } = target;
  
  // Check if user exists
  if (!db.users[lid].exists()) {
    return m.reply(
      `❌ User belum terdaftar!\n\n` +
      `📱 LID: ${lid}`
    );
  }
  
  const userDB = db.users[lid].get();
  
  // Check if not banned
  if (!userDB.isBanned) {
    return m.reply(
      `ℹ️ User tidak di-ban!\n\n` +
      `👤 ${userDB.username || "Unknown"}\n` +
      `📱 +${userDB.phone}`
    );
  }
  
  // Unban user
  db.users[lid].update(user => {
    user.isBanned = false;
    return user;
  });
  
  // Success message
  let msg = `✅ *USER UNBANNED*\n\n`;
  msg += `👤 ${userDB.username || "Unknown"}\n`;
  msg += `📱 +${userDB.phone}\n`;
  msg += `✅ Status: Active\n\n`;
  msg += `User bisa menggunakan bot kembali.`;
  
  await m.reply(msg);
  
  // Notify target user
  try {
    await conn.sendMessage(lid, {
      text: `✅ *UNBANNED*\n\n` +
            `Kamu sudah di-unban!\n\n` +
            `Sekarang kamu bisa menggunakan bot kembali.`
    });
  } catch (e) {
    console.log('Failed to notify user:', e.message);
  }
};

handlerUnban.cmd = "unban";
handlerUnban.alias = ["unbanuser"];
handlerUnban.tags = ["owner"];
handlerUnban.desc = "Unban user (reply/nomor)";
handlerUnban.isOwner = true;

module.exports = handlerUnban;