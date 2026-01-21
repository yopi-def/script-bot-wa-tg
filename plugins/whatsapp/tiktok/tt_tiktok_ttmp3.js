const axios = require("axios");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

let handlerAudio = async (conn, { m, args }) => {
  if (!args[0]) return m.reply("❌ Kirim link TikTok yang valid.\n\nContoh: .ttmp3 https://vt.tiktok.com/xxxxx");

  const url = args[0];
  const loadms = await conn.sendMessage(m.chat, { text: "⏳ Sedang mengambil audio TikTok..." });

  try {
    const data = await db.func("scrape").tiktokDl(url);
    const { music, author, title } = data;

    if (!music?.url) {
      return await conn.sendMessage(m.chat, {
        text: `❌ Tidak ditemukan audio dari video ini.`,
        edit: loadms.key
      });
    }

    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const datePart = `${pad(now.getDate())}${pad(now.getMonth() + 1)}${now.getFullYear()}${pad(now.getHours())}${pad(now.getMinutes())}`;
    const randomPart = crypto.randomBytes(3).toString("hex");
    const filename = `TikTok_${datePart}_${randomPart}.mp3`;
    const filePath = path.join(__dirname, "../../data/media", filename);

    if (!fs.existsSync(path.dirname(filePath))) {
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
    }

    await conn.sendMessage(m.chat, {
      text: "⏳ Downloading audio...",
      edit: loadms.key
    });

    const response = await axios.get(music.url, { responseType: "arraybuffer" });
    fs.writeFileSync(filePath, response.data);

    const captionText = `🎵 *TIKTOK AUDIO*\n\n🎼 *Judul:* ${music.title}\n👤 *Artis:* ${music.author}\n💿 *Album:* ${music.album}\n\n📌 *Dari Video:* ${title}\n🧑‍🎤 *By:* ${author.nickname} (@${author.username})`;

    await conn.sendMessage(m.chat, {
      text: "✅ Audio berhasil diambil! Mengirim...",
      edit: loadms.key
    });

    await conn.sendMessage(
      m.chat,
      {
        document: fs.readFileSync(filePath),
        mimetype: "audio/mpeg",
        fileName: filename,
        caption: captionText,
      },
      { quoted: db.quted("🎵 TikTok Audio") }
    );

    fs.unlinkSync(filePath);

  } catch (err) {
    console.error("Error ttmp3:", err);
    await conn.sendMessage(m.chat, {
      text: `❌ Failed...\n${err.message}`,
      edit: loadms.key
    });
  }
};

handlerAudio.cmd = "ttmp3";
handlerAudio.alias = ["ttaudio", "ttmusic"];
handlerAudio.tags = ["tiktok"];
handlerAudio.desc = "Download audio/musik dari TikTok dalam format MP3";

module.exports = handlerAudio