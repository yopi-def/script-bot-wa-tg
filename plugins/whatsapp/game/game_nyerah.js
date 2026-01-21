let handler = async (conn, { m, from }) => {
  const gameAPI = db.func("game");
  
  const session = db.session.game[from].get();
  if (!session) {
    return m.reply("❌ Tidak ada game yang aktif!");
  }

  const senderLid = m.senderLid

  gameAPI.ensureUserStats(senderLid);
  gameAPI.surrenderGame(senderLid);

  gameAPI.updateUserStats(senderLid, false, 0, session.gameType);
  await m.reply(gameAPI.formatSurrender(session.answer));
  db.session.game[from].delete();
};

handler.cmd = "gnyerah";
handler.alias = ["surrender", "giveup", "menyerah"];
handler.tags = ["game"];
handler.desc = "Menyerah dari game yang sedang berjalan";

module.exports = handler;