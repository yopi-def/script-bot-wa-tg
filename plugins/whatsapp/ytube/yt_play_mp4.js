const { search, ytmp4, apimp4 } = db.func('youtube');

const handler = async (conn, { m, args, prefix, command }) => {
  try {
    const query = args.join(' ');
    if (!query) {
      return m.reply(
`🎥 *YOUTUBE PLAY VIDEO*

📝 *Cara Pakai:*
> ${prefix + command} <judul video>

📘 *Contoh:*
> ${prefix + command} minecraft gameplay
> ${prefix + command} tutorial coding

🎬 Langsung cari & download video 360p!`
      );
    }

    const loadms = await conn.sendMessage(m.chat, { 
      text: `🔎 Mencari: *${query}*\n⏳ Mohon tunggu...` 
    });

    const res = await search(query);
    if (!res.status || !res.results?.length) {
      return await conn.sendMessage(m.chat, {
        text: '❌ Tidak ada hasil ditemukan, coba kata kunci lain.',
        edit: loadms.key
      });
    }

    const video = res.results[0];
    const videoUrl = `https://youtu.be/${video.videoId}`;

    await conn.sendMessage(m.chat, {
      text: 
        `✅ Ditemukan!\n\n` +
        `🎬 *${video.title}*\n` +
        `📺 ${video.author?.name || 'Unknown'}\n` +
        `⏱️ ${video.timestamp}\n` +
        `👁️ ${video.views.toLocaleString()} views\n\n` +
        `⏳ Mendownload video 360p...`,
      edit: loadms.key
    });

    let videoRes = await ytmp4(videoUrl, 360);
    
    // Fallback
    if (!videoRes.status) {
      await conn.sendMessage(m.chat, {
        text: "⚠️ Mencoba metode alternatif...",
        edit: loadms.key
      });
      videoRes = await apimp4(videoUrl, 360);
    }

    if (!videoRes.status) {
      return await conn.sendMessage(m.chat, {
        text: `❌ Gagal mendownload video!\n\n${videoRes.message || ''}`,
        edit: loadms.key
      });
    }

    const { metadata, download } = videoRes;
    const captionText = 
      `╭━━━〔 *YOUTUBE PLAY* 〕━━━╮\n\n` +
      `🎬 *Judul:* ${metadata.title}\n` +
      `📺 *Channel:* ${metadata.author.name}\n` +
      `⏱️ *Durasi:* ${metadata.timestamp}\n` +
      `📐 *Kualitas:* ${download.quality}\n\n` +
      `🔗 ${metadata.url}\n\n` +
      `╰━━━━━━━━━━━━━━━━━━━━╯`;

    await conn.sendMessage(m.chat, { 
      text: `✅ Video berhasil!\n📤 Mengirim...`, 
      edit: loadms.key 
    });

    await conn.sendMessage(
      m.chat, 
      { 
        video: { url: download.url }, 
        caption: captionText
      }, 
      { quoted: db.quted("🎥 YouTube Play") }
    );

  } catch (err) {
    console.error('[PLAYMP4 Error]', err);
    await m.reply(`❌ Terjadi kesalahan!\n\n${err.message}`);
  }
};

handler.cmd = 'playmp4';
handler.alias = ['playvid'];
handler.tags = ['youtube'];
handler.desc = 'Cari dan download video dari YouTube langsung';

module.exports = handler;