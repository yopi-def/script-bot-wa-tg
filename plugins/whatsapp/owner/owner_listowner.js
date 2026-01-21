let handlerListOwner = async (conn, { m }) => {
  const allUsers = db.users.all();
  const owners = allUsers.filter(user => user.isOwner === true);
  
  if (owners.length === 0) {
    return m.reply(`📋 *LIST OWNER*\n\nBelum ada Owner terdaftar.`);
  }
  
  let msg = `╭━━━『 👑 *LIST OWNER* 』\n`;
  msg += `│\n`;
  msg += `│ Total: ${owners.length} owner\n`;
  msg += `│\n`;
  msg += `╰━━━━━━━━━━━━━━━━━━━━━╯\n\n`;
  
  owners.forEach((user, index) => {
    msg += `┌─ ${index + 1}. ${user.username || "Unknown"}\n`;
    msg += `│ 📱 +${user.phone}\n`;
    msg += `│ 🆔 \`${user.id}\`\n`;
    msg += `│ 📅 Join: ${user.create}\n`;
    msg += `└─────────────\n\n`;
  });
  
  msg += `💡 Total: ${owners.length} Owner`;
  
  await m.reply(msg);
};

handlerListOwner.cmd = "listowner";
handlerListOwner.alias = ["ownlist", "owners"];
handlerListOwner.tags = ["owner"];
handlerListOwner.desc = "Lihat daftar semua Owner";
handlerListOwner.isOwner = true;

module.exports = handlerListOwner;