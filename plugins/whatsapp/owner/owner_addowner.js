let handlerAddOwner = async (conn, { m, text }) => {
  // Get target LID
  const target = await db.func("others").getLidFromInput(conn, m, text);
  if (target.error) return m.reply(target.error);
  
  const { lid, method } = target;
  
  // Check if user exists in database
  if (!db.users[lid].exists()) {
    return m.reply(
      `❌ User belum terdaftar!\n\n` +
      `📱 LID: ${lid}\n\n` +
      `💡 Minta user kirim pesan ke bot terlebih dahulu.`
    );
  }
  
  // Get current user data
  const userDB = db.users[lid].get();
  
  // Check if already owner
  if (userDB.isOwner) {
    return m.reply(
      `ℹ️ User sudah menjadi Owner!\n\n` +
      `👤 ${userDB.username}\n` +
      `📱 +${userDB.phone}`
    );
  }
  
  // Update to owner
  db.users[lid].update(user => {
    user.isOwner = true;
    return user;
  });
  
  // Success message
  let msg = `✅ *OWNER ADDED*\n\n`;
  msg += `👤 ${userDB.username}\n`;
  msg += `📱 +${userDB.phone}\n`;
  msg += `🔑 LID: \`${lid}\`\n\n`;
  msg += `🎉 User sekarang memiliki akses Owner!`;
  
  await m.reply(msg);
  
  // Notify target user
  try {
    await conn.sendMessage(lid, {
      text: `🎉 *SELAMAT!*\n\nKamu telah diangkat menjadi *Owner*!\n\n` +
            `Sekarang kamu memiliki akses penuh ke semua fitur bot.`
    });
  } catch (e) {
    console.log('Failed to notify user:', e.message);
  }
};

handlerAddOwner.cmd = "addowner";
handlerAddOwner.alias = ["addown"];
handlerAddOwner.tags = ["owner"];
handlerAddOwner.desc = "Tambah user sebagai Owner (reply/nomor)";
handlerAddOwner.isOwner = true;

module.exports = handlerAddOwner