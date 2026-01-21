let handlerAddReseller = async (conn, { m, text }) => {
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
  
  // Check if already reseller
  if (userDB.isReseller) {
    return m.reply(
      `ℹ️ User sudah menjadi Reseller!\n\n` +
      `👤 ${userDB.username}\n` +
      `📱 +${userDB.phone}`
    );
  }
  
  // Update to reseller
  db.users[lid].update(user => {
    user.isReseller = true;
    return user;
  });
  
  // Success message
  let msg = `✅ *RESELLER ADDED*\n\n`;
  msg += `👤 ${userDB.username}\n`;
  msg += `📱 +${userDB.phone}\n`;
  msg += `🔑 LID: \`${lid}\`\n\n`;
  msg += `🎉 User sekarang Reseller!`;
  
  await m.reply(msg);
  
  // Notify target user
  try {
    await conn.sendMessage(lid, {
      text: `🎉 *SELAMAT!*\n\n` +
            `Kamu telah diangkat menjadi *Reseller*!\n\n` +
            `Sekarang kamu bisa akses fitur khusus reseller.`
    });
  } catch (e) {
    console.log('Failed to notify user:', e.message);
  }
};

handlerAddReseller.cmd = "addreseller";
handlerAddReseller.alias = ["addres", "addseller"];
handlerAddReseller.tags = ["owner"];
handlerAddReseller.desc = "Tambah user sebagai Reseller (reply/nomor)";
handlerAddReseller.isOwner = true;

module.exports = handlerAddReseller;