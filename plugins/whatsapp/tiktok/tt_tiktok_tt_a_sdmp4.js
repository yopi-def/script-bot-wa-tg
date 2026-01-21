const axios = require("axios");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

let handlerSD = async (conn, { m, args }) => {
  if (!args[0]) return m.reply("❌ Kirim link TikTok yang valid.\n\nContoh: .ttsdmp4 https://vt.tiktok.com/xxxxx");

  const url = args[0];
  const loadms = await conn.sendMessage(m.chat, { text: "⏳ Sedang mengambil video SD TikTok..." });

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

    const videoUrl = media.find(v => v.type === 'nowatermark')?.url || media[0].url;

    const captionText = `📹 *TIKTOK VIDEO SD*\n\n📌 *Judul:* ${title}\n🧑‍🎤 *Author:* ${author.nickname} (@${author.username})\n👀 *Views:* ${stats.views}\n❤️ *Likes:* ${stats.likes}`;

    await conn.sendMessage(m.chat, {
      text: "✅ Video SD berhasil diambil! Mengirim...",
      edit: loadms.key
    });

    await conn.sendMessage(
      m.chat,
      {
        video: { url: videoUrl },
        caption: captionText
      },
      { quoted: db.quted("📹 TikTok SD") }
    );

  } catch (err) {
    console.error("Error ttsdmp4:", err);
    await conn.sendMessage(m.chat, {
      text: `❌ Failed...\n${err.message}`,
      edit: loadms.key
    });
  }
};

handlerSD.cmd = "ttsdmp4";
handlerSD.alias = ["ttsd", "ttvidsd"];
handlerSD.tags = ["tiktok"];
handlerSD.desc = "Download video TikTok kualitas SD tanpa watermark";

module.exports = handlerSD