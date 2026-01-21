let handler = async (conn, { m, args }) => {
  const gameAPI = db.func("game");
  
  const page = parseInt(args[0]) || 1;
  const perPage = 10;
  
  const leaderboard = gameAPI.getLeaderboard(100);
  
  if (leaderboard.length === 0) {
    return m.reply("📊 Belum ada data leaderboard.");
  }
  
  const totalPages = Math.ceil(leaderboard.length / perPage);
  const validPage = Math.max(1, Math.min(page, totalPages));
  
  let text = gameAPI.formatLeaderboard(leaderboard, validPage, perPage);
  text += `\n📄 Halaman ${validPage}/${totalPages}`;
  
  if (totalPages > 1) {
    text += `\n\n💡 Ketik: *leaderboard ${validPage + 1}* untuk halaman berikutnya`;
  }
  
  await m.reply(text);
};

handler.cmd = "leaderboard";
handler.alias = ["lb"];
handler.tags = ["game"];
handler.desc = "Lihat leaderboard pemain game";

module.exports = handler;