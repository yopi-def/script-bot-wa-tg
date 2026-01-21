let handlerListReseller = async (conn, { m }) => {
  const allUsers = db.users.all();
  const resellers = allUsers.filter(user => user.isReseller === true);
  
  if (resellers.length === 0) {
    return m.reply(`📋 *LIST RESELLER*\n\nBelum ada Reseller terdaftar.`);
  }
  
  let msg = `╭━━━『 💼 *LIST RESELLER* 』\n`;
  msg += `│\n`;
  msg += `│ Total: ${resellers.length} reseller\n`;
  msg += `│\n`;
  msg += `╰━━━━━━━━━━━━━━━━━━━━━━╯\n\n`;
  
  resellers.forEach((user, index) => {
    msg += `┌─ ${index + 1}. ${user.username || "Unknown"}\n`;
    msg += `│ 📱 +${user.phone}\n`;
    msg += `│ 🆔 \`${user.id}\`\n`;
    msg += `│ 📅 Join: ${user.create}\n`;
    msg += `└─────────────\n\n`;
  });
  
  msg += `💡 Total: ${resellers.length} Reseller`;
  
  await m.reply(msg);
};

handlerListReseller.cmd = "listreseller";
handlerListReseller.alias = ["reslist", "resellers", "listres"];
handlerListReseller.tags = ["owner"];
handlerListReseller.desc = "Lihat daftar semua Reseller";
handlerListReseller.isOwner = true;

module.exports = handlerListReseller;