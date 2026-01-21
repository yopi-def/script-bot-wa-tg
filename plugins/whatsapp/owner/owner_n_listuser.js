let handlerListUser = async (conn, { m, args }) => {
  const allUsers = db.users.all();
  
  if (allUsers.length === 0) {
    return m.reply(`📋 *LIST USER*\n\nBelum ada user terdaftar.`);
  }
  
  // Pagination
  const page = parseInt(args[0]) || 1;
  const perPage = 10;
  const totalPages = Math.ceil(allUsers.length / perPage);
  const validPage = Math.max(1, Math.min(page, totalPages));
  
  const start = (validPage - 1) * perPage;
  const end = start + perPage;
  const pageUsers = allUsers.slice(start, end);
  
  // Count by role
  const ownerCount = allUsers.filter(u => u.isOwner).length;
  const premiumCount = allUsers.filter(u => u.isPremium).length;
  const resellerCount = allUsers.filter(u => u.isReseller).length;
  
  let msg = `╭━━━『 📋 *LIST USER* 』\n`;
  msg += `│\n`;
  msg += `│ Total: ${allUsers.length} users\n`;
  msg += `│ 👑 Owner: ${ownerCount}\n`;
  msg += `│ ⭐ Premium: ${premiumCount}\n`;
  msg += `│ 💼 Reseller: ${resellerCount}\n`;
  msg += `│\n`;
  msg += `╰━━━━━━━━━━━━━━━━━━━━━━╯\n\n`;
  
  pageUsers.forEach((user, index) => {
    const roles = [];
    if (user.isOwner) roles.push('👑');
    if (user.isPremium) roles.push('⭐');
    if (user.isReseller) roles.push('💼');
    const roleStr = roles.length > 0 ? ` ${roles.join('')}` : '';
    
    const banned = user.isBanned ? ' 🚫' : '';
    
    msg += `${start + index + 1}. ${user.username || "Unknown"}${roleStr}${banned}\n`;
    msg += `   📱 +${user.phone}\n\n`;
  });
  
  msg += `━━━━━━━━━━━━━━━━━━\n`;
  msg += `📄 Halaman ${validPage}/${totalPages}\n\n`;
  
  if (totalPages > 1) {
    msg += `💡 Halaman lain: *.listuser ${validPage + 1}*`;
  }
  
  await m.reply(msg);
};

handlerListUser.cmd = "listuser";
handlerListUser.alias = ["userlist", "users", "allusers"];
handlerListUser.tags = ["owner"];
handlerListUser.desc = "Lihat semua user terdaftar\nContoh: .listuser 2";
handlerListUser.isOwner = true;

module.exports = handlerListUser;