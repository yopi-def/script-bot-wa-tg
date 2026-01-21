let handlerStats = async (conn, { m }) => {
  const plugins = conn.plugins || new Map();
  
  // Count commands
  let totalCommands = 0;
  let premiumCommands = 0;
  let ownerCommands = 0;
  let resellerCommands = 0;
  
  const tagCounts = {};
  
  for (const [cmd, plugin] of plugins.entries()) {
    if (!plugin.cmd || cmd !== plugin.cmd) continue;
    
    totalCommands++;
    if (plugin.isPremium) premiumCommands++;
    if (plugin.isOwner) ownerCommands++;
    if (plugin.isReseller) resellerCommands++;
    
    const tags = Array.isArray(plugin.tags) ? plugin.tags : [plugin.tags || "other"];
    tags.forEach(tag => {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    });
  }
  
  // Count users & groups
  const allUsers = db.users.all();
  const totalUsers = allUsers.length;
  const ownerUsers = allUsers.filter(u => u.isOwner).length;
  const resellerUsers = allUsers.filter(u => u.isReseller).length;
  
  // Game stats
  const allGameUsers = db.game.all();
  const totalGamePlayers = allGameUsers.length;
  const totalGamesPlayed = allGameUsers.reduce((sum, u) => sum + (u.gamesPlayed || 0), 0);
  
  let text = `╭━━━『 📊 *BOT STATISTICS* 』━━━╮\n`;
  text += `│\n`;
  text += `│ 🤖 *Command Stats*\n`;
  text += `│ ├ Total: ${totalCommands}\n`;
  text += `│ ├ Reseller: ${resellerCommands}\n`;
  text += `│ └ Owner: ${ownerCommands}\n`;
  text += `│\n`;
  text += `│ 👥 *User Stats*\n`;
  text += `│ ├ Registered: ${totalUsers}\n`;
  text += `│ ├ Reseller: ${resellerUsers}\n`;
  text += `│ └ Owner: ${ownerUsers}\n`;
  text += `│\n`;
  text += `│ 🎮 *Game Stats*\n`;
  text += `│ ├ Players: ${totalGamePlayers}\n`;
  text += `│ └ Games Played: ${totalGamesPlayed}\n`;
  text += `│\n`;
  text += `│ 🏷️ *Category Stats*\n`;
  
  Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .forEach(([tag, count]) => {
      text += `│ ├ ${tag}: ${count}\n`;
    });
  
  text += `│\n`;
  text += `╰━━━━━━━━━━━━━━━━━━━━━━╯`;
  
  await m.reply(text);
};

handlerStats.cmd = "stats";
handlerStats.alias = ["statistics", "botstats"];
handlerStats.tags = ["info"];
handlerStats.desc = "Statistik lengkap bot";
module.exports = handlerStats;