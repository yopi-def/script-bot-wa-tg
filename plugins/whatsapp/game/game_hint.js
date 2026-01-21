let handler = async (conn, { m, from }) => {
  const gameAPI = db.func("game");
  
  const session = db.session.game[from].get();
  if (!session) {
    return m.reply("❌ Tidak ada game yang aktif!");
  }
  
  if (session.hintUsed) {
    return m.reply("💡 Kamu sudah menggunakan hint!");
  }
  
  const config = gameAPI.GAME_CONFIG.games[session.gameType];
  if (!config.hint) {
    return m.reply("❌ Game ini tidak memiliki fitur hint!");
  }
  
  const hintText = gameAPI.generateHint(session.answer, 1);
  await m.reply(hintText);
  
  db.session.game[from].update({
    hintUsed: true,
    attempts: session.attempts || 0
  });
};

handler.cmd = "hint";
handler.alias = ["bantuan", "clue"];
handler.tags = ["game"];
handler.desc = "Minta bantuan untuk game yang sedang berjalan";

module.exports = handler;