const axios = require("axios");
const db = require("../database");

// =====================================================
// GAME CONFIGURATION
// =====================================================
const GAME_CONFIG = {
  baseXP: 140,
  xpMultiplier: 0.02, // 2% increase per level
  
  games: {
    asahotak: {
      name: "Asah Otak",
      url: "https://raw.githubusercontent.com/yopi-def/database/refs/heads/main/game/asahotak.json",
      xpReward: 50,
      timeout: 60000, // 60 seconds
      hint: true
    },
    family100: {
      name: "Family 100",
      url: "https://raw.githubusercontent.com/yopi-def/database/refs/heads/main/game/family100.json",
      xpReward: 100,
      timeout: 120000, // 120 seconds
      hint: false
    },
    lengkapikalimat: {
      name: "Lengkapi Kalimat",
      url: "https://raw.githubusercontent.com/yopi-def/database/refs/heads/main/game/lengkapikalimat.json",
      xpReward: 40,
      timeout: 45000,
      hint: true
    },
    siapakahaku: {
      name: "Siapakah Aku",
      url: "https://raw.githubusercontent.com/yopi-def/database/refs/heads/main/game/siapakahaku.json",
      xpReward: 60,
      timeout: 60000,
      hint: true
    },
    susunkata: {
      name: "Susun Kata",
      url: "https://raw.githubusercontent.com/yopi-def/database/refs/heads/main/game/susunkata.json",
      xpReward: 55,
      timeout: 60000,
      hint: true
    },
    tebakbendera: {
      name: "Tebak Bendera",
      url: "https://raw.githubusercontent.com/yopi-def/database/refs/heads/main/game/tebakbendera.json",
      xpReward: 45,
      timeout: 45000,
      hint: false
    },
    tebakgambar: {
      name: "Tebak Gambar",
      url: "https://raw.githubusercontent.com/yopi-def/database/refs/heads/main/game/tebakgambar.json",
      xpReward: 70,
      timeout: 90000,
      hint: true
    },
    tebakkata: {
      name: "Tebak Kata",
      url: "https://raw.githubusercontent.com/yopi-def/database/refs/heads/main/game/tebakkata.json",
      xpReward: 50,
      timeout: 60000,
      hint: true
    },
    tebakkimia: {
      name: "Tebak Kimia",
      url: "https://raw.githubusercontent.com/yopi-def/database/refs/heads/main/game/tebakkimia.json",
      xpReward: 65,
      timeout: 45000,
      hint: false
    },
    tebakkpop: {
      name: "Tebak K-Pop",
      url: "https://raw.githubusercontent.com/yopi-def/database/refs/heads/main/game/tebakkpop.json",
      xpReward: 60,
      timeout: 60000,
      hint: true
    },
    tebaklagu: {
      name: "Tebak Lagu",
      url: "https://raw.githubusercontent.com/yopi-def/database/refs/heads/main/game/tebaklagu.json",
      xpReward: 80,
      timeout: 90000,
      hint: false
    },
    tebaklirik: {
      name: "Tebak Lirik",
      url: "https://raw.githubusercontent.com/yopi-def/database/refs/heads/main/game/tebaklirik.json",
      xpReward: 55,
      timeout: 60000,
      hint: true
    },
    tebaklogo: {
      name: "Tebak Logo",
      url: "https://raw.githubusercontent.com/yopi-def/database/refs/heads/main/game/tebaklogo.json",
      xpReward: 65,
      timeout: 75000,
      hint: true
    },
    tebakmakanan: {
      name: "Tebak Makanan",
      url: "https://raw.githubusercontent.com/yopi-def/database/refs/heads/main/game/tebakmakanan.json",
      xpReward: 60,
      timeout: 60000,
      hint: true
    },
    tebaktebakan: {
      name: "Tebak-Tebakan",
      url: "https://raw.githubusercontent.com/yopi-def/database/refs/heads/main/game/tebaktebakan.json",
      xpReward: 45,
      timeout: 60000,
      hint: true
    }
  }
};

// =====================================================
// XP & LEVEL CALCULATION
// =====================================================
function calculateXPForLevel(level) {
  if (level <= 1) return GAME_CONFIG.baseXP;
  
  let xp = GAME_CONFIG.baseXP;
  for (let i = 2; i <= level; i++) {
    xp = Math.floor(xp * (1 + GAME_CONFIG.xpMultiplier));
  }
  return xp;
}

function calculateLevel(totalXP) {
  let level = 1;
  let xpNeeded = GAME_CONFIG.baseXP;
  let accumulatedXP = 0;
  
  while (accumulatedXP + xpNeeded <= totalXP) {
    accumulatedXP += xpNeeded;
    level++;
    xpNeeded = Math.floor(xpNeeded * (1 + GAME_CONFIG.xpMultiplier));
  }
  
  return {
    level,
    currentXP: totalXP - accumulatedXP,
    xpNeeded: xpNeeded,
    totalXP
  };
}

// =====================================================
// FETCH GAME DATA
// =====================================================
async function fetchGameData(gameType) {
  const config = GAME_CONFIG.games[gameType];
  if (!config) return { error: "Game tidak ditemukan" };
  
  try {
    const response = await axios.get(config.url);
    return { ok: true, data: response.data, config };
  } catch (error) {
    return { error: "Gagal mengambil data game" };
  }
}

// =====================================================
// GAME SESSION MANAGER
// =====================================================
function createGameSession(chatId, senderLid, gameType, question, answer, messageId) {
  const config = GAME_CONFIG.games[gameType];
  
  return {
    chatId,
    senderLid,
    gameType,
    gameName: config.name,
    question,
    answer,
    messageId,
    xpReward: config.xpReward,
    startTime: Date.now(),
    timeout: config.timeout,
    hintUsed: false,
    attempts: 0
  };
}

// =====================================================
// ANSWER VALIDATION
// =====================================================
function normalizeAnswer(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ');
}

function checkAnswer(userAnswer, correctAnswer) {
  const normalized = normalizeAnswer(userAnswer);
  
  // Handle array answers (Family 100)
  if (Array.isArray(correctAnswer)) {
    return correctAnswer.some(ans => 
      normalizeAnswer(ans) === normalized
    );
  }
  
  // Handle single answer
  return normalizeAnswer(correctAnswer) === normalized;
}

function getSimilarity(str1, str2) {
  const s1 = normalizeAnswer(str1);
  const s2 = normalizeAnswer(str2);
  
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  
  if (longer.length === 0) return 1.0;
  
  const editDistance = (s1, s2) => {
    s1 = s1.toLowerCase();
    s2 = s2.toLowerCase();
    
    const costs = [];
    for (let i = 0; i <= s1.length; i++) {
      let lastValue = i;
      for (let j = 0; j <= s2.length; j++) {
        if (i === 0) {
          costs[j] = j;
        } else if (j > 0) {
          let newValue = costs[j - 1];
          if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
            newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
          }
          costs[j - 1] = lastValue;
          lastValue = newValue;
        }
      }
      if (i > 0) costs[s2.length] = lastValue;
    }
    return costs[s2.length];
  };
  
  return (longer.length - editDistance(longer, shorter)) / longer.length;
}

// =====================================================
// HINT GENERATOR
// =====================================================
function generateHint(answer, hintLevel = 1) {
  if (Array.isArray(answer)) {
    // For Family 100, show how many answers
    return `💡 Ada ${answer.length} jawaban yang benar`;
  }
  
  const text = String(answer);
  const length = text.length;
  
  if (hintLevel === 1) {
    // Show length and first letter
    return `💡 ${length} huruf, dimulai dengan "${text[0].toUpperCase()}"`;
  } else if (hintLevel === 2) {
    // Show more letters
    const revealed = Math.ceil(length * 0.4);
    let hint = "";
    for (let i = 0; i < length; i++) {
      if (i < revealed || text[i] === " ") {
        hint += text[i];
      } else {
        hint += "_";
      }
    }
    return `💡 ${hint}`;
  }
  
  return `💡 Panjang jawaban: ${length} huruf`;
}

// =====================================================
// LEADERBOARD
// =====================================================
function getLeaderboard(limit = 10) {
  const allUsers = db.game.all();
  
  // Sort by totalXP
  const sorted = allUsers.sort((a, b) => (b.totalXP || 0) - (a.totalXP || 0));
  
  return sorted.slice(0, limit).map((user, index) => {
    const stats = calculateLevel(user.totalXP || 0);
    return {
      rank: index + 1,
      id: user.id,
      level: stats.level,
      totalXP: stats.totalXP,
      gamesPlayed: user.gamesPlayed || 0,
      gamesWon: user.gamesWon || 0,
      winRate: user.gamesPlayed > 0 
        ? ((user.gamesWon / user.gamesPlayed) * 100).toFixed(1) 
        : "0.0"
    };
  });
}

function getUserRank(userId) {
  const allUsers = db.game.all();
  const sorted = allUsers.sort((a, b) => (b.totalXP || 0) - (a.totalXP || 0));
  
  const index = sorted.findIndex(u => u.id === userId);
  return index === -1 ? null : index + 1;
}

// =====================================================
// USER STATS
// =====================================================
function ensureUserStats(userId) {
  if (!db.game[userId].exists()) {
    db.game[userId].ensure({
      id: userId,
      totalXP: 0,
      gamesPlayed: 0,
      gamesWon: 0,
      gamesFailed: 0,
      gamesSurrender: 0,
      bestStreak: 0,
      currentStreak: 0,
      gameStats: {}
    });
  }
  return db.game[userId].get();
}

function updateUserStats(userId, won, xpGained, gameType) {
  const user = db.game[userId].get();
  
  if (!user) return;
  
  const updates = {
    totalXP: (user.totalXP || 0) + xpGained,
    gamesPlayed: (user.gamesPlayed || 0) + 1,
    gamesWon: won ? (user.gamesWon || 0) + 1 : (user.gamesWon || 0),
    gamesFailed: !won ? (user.gamesFailed || 0) + 1 : (user.gamesFailed || 0),
    currentStreak: won ? (user.currentStreak || 0) + 1 : 0
  };
  
  if (won && updates.currentStreak > (user.bestStreak || 0)) {
    updates.bestStreak = updates.currentStreak;
  }
  
  // Update game-specific stats
  if (!user.gameStats) user.gameStats = {};
  if (!user.gameStats[gameType]) {
    user.gameStats[gameType] = { played: 0, won: 0 };
  }
  
  user.gameStats[gameType].played++;
  if (won) user.gameStats[gameType].won++;
  
  updates.gameStats = user.gameStats;
  
  db.game[userId].set(updates);
}

function surrenderGame(userId) {
  const user = db.game[userId].get();
  if (!user) return;
  
  db.game[userId].set({
    ...user,
    gamesSurrender: (user.gamesSurrender || 0) + 1,
    currentStreak: 0
  });
}

// =====================================================
// FORMAT MESSAGES
// =====================================================
function formatGameStart(gameType, question, extraData = {}) {
  const config = GAME_CONFIG.games[gameType];
  const timeoutSec = Math.floor(config.timeout / 1000);
  
  let text = `🎮 *${config.name.toUpperCase()}*\n\n`;
  
  if (extraData.img) {
    text += `🖼️ Lihat gambar di atas\n\n`;
  }
  
  if (extraData.deskripsi) {
    text += `📝 ${extraData.deskripsi}\n\n`;
  }
  
  if (extraData.tipe) {
    text += `📌 Tipe: ${extraData.tipe}\n\n`;
  }
  
  text += `❓ *Soal:*\n${question}\n\n`;
  text += `⏱️ Waktu: ${timeoutSec} detik\n`;
  text += `🎁 Reward: ${config.xpReward} XP\n\n`;
  text += `💡 Ketik *.hint* untuk bantuan\n`;
  text += `🏳️ Ketik *.gnyerah* untuk menyerah`;
  
  return text;
}

function formatCorrectAnswer(xpGained, level, timeElapsed) {
  const timeSec = Math.floor(timeElapsed / 1000);
  return `✅ *BENAR!*\n\n` +
    `🎁 +${xpGained} XP\n` +
    `⭐ Level ${level.level}\n` +
    `📊 XP: ${level.currentXP}/${level.xpNeeded}\n` +
    `⏱️ Waktu: ${timeSec} detik`;
}

function formatWrongAnswer(similarity) {
  if (similarity > 0.7) {
    return `❌ Hampir benar! Coba lagi...`;
  } else if (similarity > 0.5) {
    return `❌ Kurang sedikit lagi...`;
  }
  return `❌ Salah! Coba lagi...`;
}

function formatTimeout(answer) {
  if (Array.isArray(answer)) {
    return `⏰ *WAKTU HABIS!*\n\n📝 Jawaban yang benar:\n${answer.map((a, i) => `${i + 1}. ${a}`).join('\n')}`;
  }
  return `⏰ *WAKTU HABIS!*\n\n📝 Jawaban yang benar: *${answer}*`;
}

function formatSurrender(answer) {
  if (Array.isArray(answer)) {
    return `🏳️ *MENYERAH!*\n\n📝 Jawaban yang benar:\n${answer.map((a, i) => `${i + 1}. ${a}`).join('\n')}`;
  }
  return `🏳️ *MENYERAH!*\n\n📝 Jawaban yang benar: *${answer}*`;
}

function formatLeaderboard(leaderboard, page = 1, perPage = 10) {
  let text = `🏆 *LEADERBOARD GAME*\n\n`;
  
  const start = (page - 1) * perPage;
  const end = start + perPage;
  const pageData = leaderboard.slice(start, end);
  
  pageData.forEach(user => {
    const medal = user.rank === 1 ? "🥇" : user.rank === 2 ? "🥈" : user.rank === 3 ? "🥉" : "👤";
    text += `${medal} *#${user.rank}*\n`;
    text += `   ⭐ Level ${user.level} | 🎁 ${user.totalXP} XP\n`;
    text += `   🎮 ${user.gamesPlayed} games | 📈 ${user.winRate}% win\n\n`;
  });
  
  return text;
}

async function formatUserProfile(userId) {
  const user = await db.game[userId].get();
  if (!user) {
    return `📊 *PROFILE GAME*\n\nBelum pernah bermain game.`;
  }
  
  const level = calculateLevel(user.totalXP || 0);
  const rank = getUserRank(userId);
  const winRate = user.gamesPlayed > 0 
    ? ((user.gamesWon / user.gamesPlayed) * 100).toFixed(1) 
    : "0.0";
  
  let text = `📊 *PROFILE GAME*\n\n`;
  text += `🏆 Rank: #${rank || "-"}\n`;
  text += `⭐ Level: ${level.level}\n`;
  text += `🎁 Total XP: ${level.totalXP}\n`;
  text += `📊 Progress: ${level.currentXP}/${level.xpNeeded} XP\n\n`;
  text += `📈 *STATISTIK*\n`;
  text += `🎮 Games Played: ${user.gamesPlayed || 0}\n`;
  text += `✅ Games Won: ${user.gamesWon || 0}\n`;
  text += `❌ Games Failed: ${user.gamesFailed || 0}\n`;
  text += `🏳️ Surrender: ${user.gamesSurrender || 0}\n`;
  text += `📈 Win Rate: ${winRate}%\n`;
  text += `🔥 Current Streak: ${user.currentStreak || 0}\n`;
  text += `🏅 Best Streak: ${user.bestStreak || 0}`;
  
  return text;
}

// =====================================================
// EXPORTS
// =====================================================
module.exports = {
  GAME_CONFIG,
  calculateXPForLevel,
  calculateLevel,
  fetchGameData,
  createGameSession,
  checkAnswer,
  getSimilarity,
  generateHint,
  getLeaderboard,
  getUserRank,
  ensureUserStats,
  updateUserStats,
  surrenderGame,
  formatGameStart,
  formatCorrectAnswer,
  formatWrongAnswer,
  formatTimeout,
  formatSurrender,
  formatLeaderboard,
  formatUserProfile,
  normalizeAnswer
};