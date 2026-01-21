const axios = require("axios");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

let handlerHD = async (conn, { m, args }) => {
  if (!args[0]) return m.reply("❌ Kirim link TikTok yang valid.\n\nContoh: .tthdmp4 https://vt.tiktok.com/xxxxx");

  const url = args[0];
  const loadms = await conn.sendMessage(m.chat, { text: "⏳ Sedang mengambil video HD TikTok..." });

  try {
    const data = await db.func("scrape").tiktokDl(url);
    const { media, author, title, stats } = data;

    if (!media || !media.length) {
      return await conn.sendMessage(m.chat, {
        text: `❌ Failed...\nTidak ditemukan media pada link tersebut.`,
        edit: loadms.key
      });
    }

    const firstType = media[0].type;

    if (firstType === "photo") {
      return await conn.sendMessage(m.chat, {
        text: `❌ Link ini adalah slideshow!\nGunakan .ttslide untuk download gambar.`,
        edit: loadms.key
      });
    }

    const videoUrl = media.find(v => v.type === 'nowatermark_hd')?.url || media[0].url;

    const captionText = `🎥 *TIKTOK VIDEO HD*\n\n📌 *Judul:* ${title}\n🧑‍🎤 *Author:* ${author.nickname} (@${author.username})\n👀 *Views:* ${stats.views}\n❤️ *Likes:* ${stats.likes}`;

    await conn.sendMessage(m.chat, {
      text: "✅ Video HD berhasil diambil! Mengirim...",
      edit: loadms.key
    });

    await conn.sendMessage(
      m.chat,
      {
        video: { url: videoUrl },
        caption: captionText
      },
      { quoted: db.quted("🎬 TikTok HD") }
    );

  } catch (err) {
    console.error("Error tthdmp4:", err);
    await conn.sendMessage(m.chat, {
      text: `❌ Failed...\n${err.message}`,
      edit: loadms.key
    });
  }
};

handlerHD.cmd = "tthdmp4";
handlerHD.alias = ["tthd", "ttvidhd"];
handlerHD.tags = ["tiktok"];
handlerHD.desc = "Download video TikTok kualitas HD tanpa watermark";

module.exports = handlerHD