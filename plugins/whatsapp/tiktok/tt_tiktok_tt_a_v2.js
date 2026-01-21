const axios = require("axios");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const tiktokDlV3 = async (url) => {
  return new Promise(async (resolve, reject) => {
    try {
      const domain = "https://www.tikwm.com/api/";

      const res = await axios.post(
        domain,
        {},
        {
          headers: {
            "Accept": "application/json, text/javascript, */*; q=0.01",
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
            "User-Agent":
              "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36",
            "X-Requested-With": "XMLHttpRequest",
          },
          params: { url, hd: 1 },
        }
      );

      const resData = res.data?.data;
      if (!resData) throw new Error("Gagal mengambil data dari TikWM API.");

      const formatNumber = (num) =>
        Number(num || 0).toLocaleString("id-ID").replace(/,/g, ".");
      const formatDate = (n) =>
        new Date(n * 1000).toLocaleString("id-ID", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
          hour: "numeric",
          minute: "numeric",
        });

      const media = [];
      if (resData.images?.length) {
        resData.images.forEach((img) =>
          media.push({ type: "photo", url: img })
        );
      } else {
        if (resData.hdplay)
          media.push({ type: "nowatermark_hd", url: resData.hdplay });
        else if (resData.play)
          media.push({ type: "nowatermark", url: resData.play });
        else if (resData.wmplay)
          media.push({ type: "watermark", url: resData.wmplay });
      }

      const result = {
        status: true,
        id: resData.id,
        title: resData.title || "Tanpa Judul",
        region: resData.region,
        created_at: formatDate(resData.create_time),
        cover: resData.cover,
        duration: resData.duration + " detik",
        stats: {
          views: formatNumber(resData.play_count),
          likes: formatNumber(resData.digg_count),
          comments: formatNumber(resData.comment_count),
          shares: formatNumber(resData.share_count),
          downloads: formatNumber(resData.download_count),
        },
        author: {
          id: resData.author.id,
          username: resData.author.unique_id,
          nickname: resData.author.nickname,
          avatar: resData.author.avatar,
        },
        music: {
          id: resData.music_info.id,
          title: resData.music_info.title,
          author: resData.music_info.author,
          album: resData.music_info.album || "-",
          url: resData.music || resData.music_info.play,
        },
        media,
      };

      resolve(result);
    } catch (err) {
      reject({
        status: false,
        message:
          err?.response?.data?.msg ||
          err.message ||
          "Terjadi kesalahan saat memproses link TikTok.",
      });
    }
  });
};

let handler = async (conn, { m, args }) => {
  if (!args[0]) {
    return m.reply(
      "❌ Kirim link TikTok yang valid.\n\n" +
      "📝 *Contoh:*\n" +
      "• .ttv2 https://vt.tiktok.com/xxxxx\n\n" +
      "✨ *Support:*\n" +
      "• Video HD/SD (tanpa watermark)\n" +
      "• Slideshow/Photo"
    );
  }

  const url = args[0];
  const loadms = await conn.sendMessage(m.chat, { 
    text: "⏳ Tunggu sebentar...\n🔍 Sedang mengambil data TikTok..." 
  });

  try {
    const data = await tiktokDlV3(url);
    const { media, author, title, stats, music, duration, created_at, region } = data;

    if (!media || !media.length) {
      return await conn.sendMessage(m.chat, {
        text: `❌ Failed...\nTidak ditemukan media pada link tersebut.`,
        edit: loadms.key
      });
    }

    const firstType = media[0].type;

    // ====================================
    // CEK APAKAH SLIDESHOW/PHOTO
    // ====================================
    if (firstType === "photo") {
      await conn.sendMessage(m.chat, {
        text: `✅ Ditemukan ${media.length} gambar!\n📤 Mengirim slideshow...`,
        edit: loadms.key
      });

      const albumMsgs = media.map((img) => ({
        image: { url: img.url },
        caption: null,
      }));

      const captionText = 
        `╭━━〔 *TIKTOK SLIDESHOW* 〕━━╮\n\n` +
        `📌 *Judul:* ${title}\n` +
        `🧑‍🎤 *Author:* ${author.nickname}\n` +
        `      (@${author.username})\n` +
        `📀 *Musik:* ${music.title}\n` +
        `      By: ${music.author}\n\n` +
        `📅 *Diupload:* ${created_at}\n` +
        `🌍 *Region:* ${region}\n` +
        `📊 *Total Gambar:* ${media.length}\n\n` +
        `📈 *Statistik:*\n` +
        `  👀 ${stats.views} Views\n` +
        `  ❤️ ${stats.likes} Likes\n` +
        `  💬 ${stats.comments} Comments\n` +
        `  🔁 ${stats.shares} Shares\n\n` +
        `╰━━━━━━━━━━━━━━━━━━━━━╯`;

      await conn.sendMessage(m.chat, {
        text: captionText,
        edit: loadms.key
      });

      await conn.albumMessage(m.chat, albumMsgs, db.quted("📸 TikTok Slideshow"));

    } 
    // ====================================
    // CEK APAKAH VIDEO
    // ====================================
    else {
      // Prioritas: HD > SD > Watermark
      const videoUrl = 
        media.find(v => v.type === 'nowatermark_hd')?.url || 
        media.find(v => v.type === 'nowatermark')?.url || 
        media[0].url;

      const quality = media.find(v => v.type === 'nowatermark_hd') ? 'HD' : 'SD';

      await conn.sendMessage(m.chat, {
        text: `✅ Video ${quality} ditemukan!\n📤 Mengirim video...`,
        edit: loadms.key
      });

      const captionText = 
        `╭━━━〔 *TIKTOK VIDEO* 〕━━━╮\n\n` +
        `📌 *Judul:* ${title}\n` +
        `🧑‍🎤 *Author:* ${author.nickname}\n` +
        `      (@${author.username})\n` +
        `📀 *Musik:* ${music.title}\n` +
        `      By: ${music.author}\n\n` +
        `🎬 *Durasi:* ${duration}\n` +
        `📅 *Diupload:* ${created_at}\n` +
        `🌍 *Region:* ${region}\n` +
        `🎞️ *Kualitas:* ${quality}\n\n` +
        `📈 *Statistik:*\n` +
        `  👀 ${stats.views} Views\n` +
        `  ❤️ ${stats.likes} Likes\n` +
        `  💬 ${stats.comments} Comments\n` +
        `  🔁 ${stats.shares} Shares\n` +
        `  ⬇️ ${stats.downloads} Downloads\n\n` +
        `╰━━━━━━━━━━━━━━━━━━━━╯`;

      await conn.sendMessage(
        m.chat,
        {
          video: { url: videoUrl },
          caption: captionText
        },
        { quoted: db.quted(`🎬 TikTok ${quality}`) }
      );
    }

  } catch (err) {
    console.error("Error ttv2:", err);
    await conn.sendMessage(m.chat, {
      text: 
        `❌ *Gagal mengambil data TikTok!*\n\n` +
        `📋 *Detail Error:*\n${err.message}\n\n` +
        `💡 *Tips:*\n` +
        `• Pastikan link valid\n` +
        `• Coba gunakan link pendek (vt.tiktok.com)\n` +
        `• Pastikan video tidak privat/dihapus`,
      edit: loadms.key
    });
  }
};

handler.cmd = "tiktokv2";
handler.alias = ["ttv2", "ttdlv2"];
handler.tags = ["tiktok"];
handler.desc = "Download video atau slideshow dari TikTok (tanpa watermark)";

module.exports = handler;