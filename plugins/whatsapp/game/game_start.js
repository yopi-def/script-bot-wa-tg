let handler = async (conn, { m, from, args, text, command }) => {
  const gameAPI = db.func("game");
  
  if (command === "listgame") {
    const games = gameAPI.GAME_CONFIG.games;
    let text = `🎮 *LIST GAME TERSEDIA*\n\n`;
    Object.entries(games).forEach(([key, value], index) => {
      text += `${index + 1}. *${value.name}*\n`;
      text += `   📝 Command: *.${key}*\n`;
      text += `   🎁 Reward: ${value.xpReward} XP\n`;
      text += `   ⏱️ Waktu: ${Math.floor(value.timeout / 1000)}s\n\n`;
    });
    text += `\n💡 *CARA BERMAIN:*\n`;
    text += `1. Ketik command game (contoh: *.asahotak*)\n`;
    text += `2. Reply/Quote pesan soal dengan jawaban\n`;
    text += `3. Ketik *.hint* untuk bantuan\n`;
    text += `4. Ketik *.gnyerah* untuk menyerah\n\n`;
    text += `📊 Ketik *.leaderboard* untuk melihat ranking\n`;
    text += `👤 Ketik *.gameprofile* untuk melihat stats`;
    return m.reply(text);
  }

  const existingSession = db.session.game[from].get();
  if (existingSession) {
    return m.reply("❌ Masih ada game yang aktif!\nKetik *.gnyerah* untuk menyerah.");
  }

  const gameType = command;
  
  const result = await gameAPI.fetchGameData(gameType);
  if (result.error) {
    return m.reply(`❌ ${result.error}`);
  }
  
  const questions = result.data;
  const random = questions[Math.floor(Math.random() * questions.length)];
  
  let questionText, answer, extraData = {};
  
  if (gameType === "family100") {
    questionText = random.soal;
    answer = random.jawaban;
  } else if (gameType === "tebakgambar" || gameType === "tebakkpop" || gameType === "tebaklogo" || gameType === "tebakmakanan") {
    questionText = random.soal || random.deskripsi || "Tebak gambar ini!";
    answer = random.jawaban;
    extraData.img = random.img;
    extraData.deskripsi = random.deskripsi;
  } else if (gameType === "tebaklagu") {
    questionText = "Tebak judul lagu ini!";
    answer = random.judul;
    extraData.audio = random.lagu;
    extraData.artis = random.artis;
  } else if (gameType === "susunkata") {
    questionText = random.soal;
    answer = random.jawaban;
    extraData.tipe = random.tipe;
  } else if (gameType === "tebakbendera") {
    questionText = random.soal;
    answer = random.jawaban;
  } else {
    questionText = random.soal;
    answer = random.jawaban;
  }
  
  let sentMsg;
  if (extraData.img) {
    sentMsg = await conn.sendMessage(from, {
      image: { url: extraData.img },
      caption: gameAPI.formatGameStart(gameType, questionText, extraData)
    }, { quoted: m });
  } else if (extraData.audio) {
    sentMsg = await conn.sendMessage(from, {
      audio: { url: extraData.audio },
      mimetype: "audio/mp4",
      caption: gameAPI.formatGameStart(gameType, questionText, extraData)
    }, { quoted: m });
  } else {
    sentMsg = await conn.sendMessage(from, {
      text: gameAPI.formatGameStart(gameType, questionText, extraData)
    }, { quoted: m });
  }
  
  gameAPI.ensureUserStats(m.senderLid);
  
  const session = gameAPI.createGameSession(
    from,
    m.senderLid,
    gameType,
    questionText,
    answer,
    sentMsg.key.id
  );
  
  db.session.game[from].set(session);
  
  setTimeout(async () => {
    const currentSession = db.session.game[from].get();
    
    if (currentSession && currentSession.messageId === sentMsg.key.id) {
      await conn.sendMessage(from, {
        text: gameAPI.formatTimeout(answer)
      }, { quoted: sentMsg });
      
      gameAPI.updateUserStats(currentSession.senderLid, false, 0, currentSession.gameType);
      
      db.session.game[from].delete();
    }
  }, session.timeout);
};

handler.cmd = "listgame";
handler.alias = [
  "asahotak",
  "family100",
  "lengkapikalimat",
  "siapakahaku",
  "susunkata",
  "tebakbendera",
  "tebakgambar",
  "tebakkata",
  "tebakkimia",
  "tebakkpop",
  "tebaklagu",
  "tebaklirik",
  "tebaklogo",
  "tebakmakanan",
  "tebaktebakan"
];
handler.tags = ["game"];
handler.desc = "Mulai permainan (15 jenis game tersedia)";

module.exports = handler;