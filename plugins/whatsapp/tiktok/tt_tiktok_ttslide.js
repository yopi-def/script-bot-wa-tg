const axios = require("axios");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

let handlerSlide = async (conn, { m, args }) => {
  if (!args[0]) return m.reply("❌ Kirim link TikTok yang valid.\n\nContoh: .ttslide https://vt.tiktok.com/xxxxx");

  const url = args[0];
  const loadms = await conn.sendMessage(m.chat, { text: "⏳ Sedang mengambil slideshow TikTok..." });

  try {
    const data = await db.func("scrape").tiktokDl(url);
    const { media, author, title } = data;

    if (!media || !media.length) {
      return await conn.sendMessage(m.chat, {
        text: `❌ Failed...\nTidak ditemukan media pada link tersebut.`,
        edit: loadms.key
      });
    }

    const firstType = media[0].type;

    if (firstType !== "photo") {
      return await conn.sendMessage(m.chat, {
        text: `❌ Link ini bukan slideshow!\nGunakan .tthdmp4 atau .ttsdmp4 untuk video.`,
        edit: loadms.key
      });
    }

    const albumMsgs = media.map((img) => ({
      image: { url: img.url },
      caption: null,
    }));

    const captionText = `📸 *TIKTOK SLIDESHOW*\n\n📌 *Judul:* ${title}\n🧑‍🎤 *Author:* ${author.nickname} (@${author.username})\n📊 *Total Gambar:* ${media.length}`;

    await conn.sendMessage(m.chat, {
      text: captionText,
      edit: loadms.key
    });

    await conn.albumMessage(m.chat, albumMsgs, db.quted("📸 TikTok Slideshow"));

  } catch (err) {
    console.error("Error ttslide:", err);
    await conn.sendMessage(m.chat, {
      text: `❌ Failed...\n${err.message}`,
      edit: loadms.key
    });
  }
};

handlerSlide.cmd = "ttslide";
handlerSlide.alias = ["tiktokslide"];
handlerSlide.tags = ["tiktok"];
handlerSlide.desc = "Download slideshow/gambar dari TikTok";

module.exports = handlerSlide