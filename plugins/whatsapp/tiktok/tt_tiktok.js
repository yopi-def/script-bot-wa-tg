const axios = require("axios");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const tiktokDlV2 = async (url) => {
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

      result.caption = `╭━〔 *TIKTOK DOWNLOADER* 〕━╮\n\n📌 *Judul:* ${result.title}\n🧑‍🎤 *Author:* ${result.author.nickname}\n      (@${result.author.username})\n📀 *Musik:* ${result.music.title}\n      By: ${result.music.author}\n\n🎬 *Durasi:* ${result.duration}\n📅 *Diupload:* ${result.created_at}\n🌍 *Region:* ${result.region}\n\n📊 *Statistik:*\n  ❤️ ${result.stats.likes} Suka\n  💬 ${result.stats.comments} Komentar\n  🔁 ${result.stats.shares} Dibagikan\n  👀 ${result.stats.views} Penonton\n  ⬇️ ${result.stats.downloads} Unduhan\n\n╰━━━━━━━━━━━━━━━━━━━━╯`;

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
}

let handler = async (conn, { m, args, prefix }) => {
  if (!args[0]) return m.reply("❌ Kirim link TikTok yang valid.\n\nContoh: .tiktok https://vt.tiktok.com/xxxxx");

  const url = args[0];
  const loadms = await conn.sendMessage(m.chat, { text: "⏳ Tunggu sebentar...\nSedang mengambil data TikTok 🎬" });

  try {
    const data = await tiktokDlV2(url);
    const { media, music, caption, cover, author } = data;

    if (!media || !media.length) {
      return await conn.sendMessage(m.chat, { 
        text: `❌ Failed...\nTidak ditemukan media pada link tersebut..`, 
        edit: loadms.key 
      });
    }

    const firstType = media[0].type;
    const hasMusic = music?.url ? true : false;

    // Kirim preview dengan interactive buttons
    const interactiveMessage = {
      image: { url: cover },
      caption: caption,
      title: '🎬 TikTok Downloader',
      subtitle: `@${author.username}`,
      footer: '⚡ Pilih opsi download di bawah',
      interactiveButtons: []
    };

    // Button untuk video/gambar
    if (firstType === "photo") {
      interactiveMessage.interactiveButtons.push({
        name: 'quick_reply',
        buttonParamsJson: JSON.stringify({
          display_text: '📸 Download Semua Gambar',
          id: `${prefix}ttslide ${url}`
        })
      });
    } else {
      interactiveMessage.interactiveButtons.push({
        name: 'quick_reply',
        buttonParamsJson: JSON.stringify({
          display_text: '🎥 Download Video HD',
          id: `${prefix}tthdmp4 ${url}`
        })
      });
      
      interactiveMessage.interactiveButtons.push({
        name: 'quick_reply',
        buttonParamsJson: JSON.stringify({
          display_text: '📹 Download Video SD',
          id: `${prefix}ttsdmp4 ${url}`
        })
      });
    }

    // Button untuk audio jika ada
    if (hasMusic) {
      interactiveMessage.interactiveButtons.push({
        name: 'quick_reply',
        buttonParamsJson: JSON.stringify({
          display_text: '🎵 Download Audio Only',
          id: `${prefix}ttmp3 ${url}`
        })
      });
    }

    // Button tambahan
    interactiveMessage.interactiveButtons.push({
      name: 'cta_url',
      buttonParamsJson: JSON.stringify({
        display_text: '👤 Lihat Profil Author',
        url: `https://www.tiktok.com/@${author.username}`,
        merchant_url: `https://www.tiktok.com/@${author.username}`
      })
    });

    interactiveMessage.interactiveButtons.push({
      name: 'cta_copy',
      buttonParamsJson: JSON.stringify({
        display_text: '🔗 Salin Link Video',
        copy_code: url
      })
    });

    // Hapus loading message
    await conn.sendMessage(m.chat, { delete: loadms.key });

    // Kirim interactive message
    await conn.sendMessage(m.chat, interactiveMessage);

    // Simpan data untuk callback button
    global.tiktokData = global.tiktokData || {};
    global.tiktokData[m.chat] = { data, url };

  } catch (err) {
    console.error("Error sendTiktok:", err);
    await conn.sendMessage(m.chat, { 
      text: `❌ Failed...\nTerjadi kesalahan saat mengambil data TikTok.\n\nError: ${err.message}`, 
      edit: loadms.key 
    });
  }
};

// Handler untuk button callback
let buttonHandler = async (conn, { m }) => {
  const buttonId = m.message?.buttonsResponseMessage?.selectedButtonId || 
                   m.message?.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson;
  
  if (!buttonId || !buttonId.startsWith('ttdl_')) return;

  const [, action, quality, chat] = buttonId.split('_');
  const savedData = global.tiktokData?.[m.chat];

  if (!savedData) {
    return m.reply("❌ Data tidak ditemukan. Silakan kirim link TikTok lagi.");
  }

  const { data } = savedData;
  const { media, music } = data;

  const loadms = await m.reply("⏳ Sedang memproses download...");

  try {
    if (action === 'photo') {
      // Download gambar
      const albumMsgs = media.map((img) => ({
        image: { url: img.url },
        caption: null,
      }));
      await conn.sendMessage(m.chat, { text: `✅ Berhasil mendownload ${media.length} gambar!`, edit: loadms.key });
      await conn.albumMessage(m.chat, albumMsgs, m);
      
    } else if (action === 'video') {
      // Download video
      const videoUrl = quality === 'hd' 
        ? media.find(v => v.type === 'nowatermark_hd')?.url || media[0].url
        : media.find(v => v.type === 'nowatermark')?.url || media[0].url;
        
      await conn.sendMessage(m.chat, { text: `✅ Berhasil mendownload video ${quality.toUpperCase()}!`, edit: loadms.key });
      await conn.sendMessage(
        m.chat,
        { 
          video: { url: videoUrl },
          caption: `🎥 TikTok Video (${quality.toUpperCase()})\n\n${data.title}`
        },
        { quoted: m }
      );
      
    } else if (action === 'audio' && music?.url) {
      // Download audio
      const now = new Date();
      const pad = (n) => String(n).padStart(2, "0");
      const datePart = `${pad(now.getDate())}${pad(now.getMonth() + 1)}${now.getFullYear()}${pad(now.getHours())}${pad(now.getMinutes())}`;
      const randomPart = crypto.randomBytes(3).toString("hex");
      const filename = `tiktok_${datePart}_${randomPart}.mp3`;
      const filePath = path.join(__dirname, "../../../database/media", filename);

      if (!fs.existsSync(path.dirname(filePath))) {
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
      }

      const response = await axios.get(music.url, { responseType: "arraybuffer" });
      fs.writeFileSync(filePath, response.data);

      const captionText = `🎵 *TIKTOK MUSIC*\n\n🎼 *Judul:* ${music.title}\n👤 *Artis:* ${music.author}\n💿 *Album:* ${music.album}\n🆔 *ID:* ${music.id}`;
      
      await conn.sendMessage(m.chat, { text: `✅ Berhasil mendownload audio!`, edit: loadms.key });
      await conn.sendMessage(
        m.chat,
        {
          document: fs.readFileSync(filePath),
          mimetype: "audio/mpeg",
          fileName: filename,
          caption: captionText,
        },
        { quoted: m }
      );

      fs.unlinkSync(filePath);
    }
  } catch (err) {
    console.error("Error button callback:", err);
    await conn.sendMessage(m.chat, { 
      text: `❌ Gagal memproses download.\n\nError: ${err.message}`, 
      edit: loadms.key 
    });
  }
};

handler.cmd = "tiktok";
handler.alias = ["tt", "ttdl"];
handler.tags = ["tiktok"];
handler.desc = "Download video atau audio dari TikTok tanpa watermark";

// Export kedua handler
module.exports = handler;
module.exports.buttonHandler = buttonHandler;