let handlerDelOPR = async (conn, { m, text, args }) => {
  // Check role argument
  const roleArg = args[0]?.toLowerCase();
  const validRoles = ['owner', 'premium', 'reseller', 'prem', 'res'];
  
  if (!validRoles.includes(roleArg)) {
    return m.reply(
      `❌ Format salah!\n\n` +
      `Gunakan: *.delopr <role> <nomor/reply>*\n\n` +
      `Role:\n` +
      `• owner\n` +
      `• reseller/res\n\n` +
      `Contoh:\n` +
      `• .delopr owner 628xxx\n` +
      `• .delopr res (reply pesan)`
    );
  }
  
  // Normalize role
  let role = roleArg;
  if (role === 'res') role = 'reseller';
  
  // Get target LID
  const target = await db.func("others").getLidFromInput(conn, m, args.slice(1).join(' '));
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
  
  // Check current role status
  const roleKey = role === 'owner' ? 'isOwner' : 'isReseller';
  
  if (!userDB[roleKey]) {
    return m.reply(
      `ℹ️ User bukan ${db.func("others").formatRoleName(role)}!\n\n` +
      `👤 ${userDB.username}\n` +
      `📱 +${userDB.phone}`
    );
  }
  
  // Remove role
  db.users[lid].update(user => {
    user[roleKey] = false;
    
    // Clear premium expiry if removing premium
    if (role === 'premium') {
      user.premiumExpiry = null;
    }
    
    return user;
  });
  
  // Success message
  let msg = `✅ *ROLE REMOVED*\n\n`;
  msg += `👤 ${userDB.username}\n`;
  msg += `📱 +${userDB.phone}\n`;
  msg += `🚫 Role: ${db.func("others").formatRoleName(role)}\n\n`;
  msg += `User kembali menjadi Member biasa.`;
  
  await m.reply(msg);
  
  // Notify target user
  try {
    await conn.sendMessage(lid, {
      text: `ℹ️ *PEMBERITAHUAN*\n\n` +
            `Role *${db.func("others").formatRoleName(role)}* kamu telah dicabut.\n\n` +
            `Kamu sekarang kembali menjadi Member biasa.`
    });
  } catch (e) {
    console.log('Failed to notify user:', e.message);
  }
};

handlerDelOPR.cmd = "delopr";
handlerDelOPR.alias = ["delrole", "removerole"];
handlerDelOPR.tags = ["owner"];
handlerDelOPR.desc = "Hapus role Owner/Reseller\nContoh: .delopr owner 628xxx";
handlerDelOPR.isOwner = true;

module.exports = handlerDelOPR;