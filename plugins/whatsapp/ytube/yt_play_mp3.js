const { search, ytmp3, apimp3 } = db.func('youtube');

const handler = async (conn, { m, args, prefix, command }) => {
  try {
    const query = args.join(' ');
    if (!query) {
      return m.reply(
`🎵 *YOUTUBE PLAY AUDIO*

📝 *Cara Pakai:*
> ${prefix + command} <judul lagu>

📘 *Contoh:*
> ${prefix + command} lathi weird genius
> ${prefix + command} dj tiktok viral

🎧 Langsung cari & download audio!`
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
        `🎵 *${video.title}*\n` +
        `📺 ${video.author?.name || 'Unknown'}\n` +
        `⏱️ ${video.timestamp}\n\n` +
        `⏳ Mendownload audio...`,
      edit: loadms.key
    });

    let audioRes = await ytmp3(videoUrl, 128);
    
    // Fallback
    if (!audioRes.status) {
      await conn.sendMessage(m.chat, {
        text: "⚠️ Mencoba metode alternatif...",
        edit: loadms.key
      });
      audioRes = await apimp3(videoUrl, 128);
    }

    if (!audioRes.status) {
      return await conn.sendMessage(m.chat, {
        text: `❌ Gagal mendownload audio!\n\n${audioRes.message || ''}`,
        edit: loadms.key
      });
    }

    const { metadata, download } = audioRes;
    const captionText = 
      `╭━━━〔 *YOUTUBE PLAY* 〕━━━╮\n\n` +
      `🎵 *Judul:* ${metadata.title}\n` +
      `📺 *Channel:* ${metadata.author.name}\n` +
      `⏱️ *Durasi:* ${metadata.timestamp}\n` +
      `🎧 *Kualitas:* ${download.quality}\n\n` +
      `🔗 ${metadata.url}\n\n` +
      `╰━━━━━━━━━━━━━━━━━━━━╯`;

    await conn.sendMessage(m.chat, { 
      text: `✅ Audio berhasil!\n📤 Mengirim...`, 
      edit: loadms.key 
    });

    await conn.sendMessage(
      m.chat, 
      { 
        document: { url: download.url }, 
        mimetype: 'audio/mpeg', 
        fileName: download.filename || `${metadata.title}.mp3`,
        caption: captionText
      }, 
      { quoted: db.quted("🎵 YouTube Play") }
    );

  } catch (err) {
    console.error('[PLAYMP3 Error]', err);
    await m.reply(`❌ Terjadi kesalahan!\n\n${err.message}`);
  }
};

handler.cmd = 'playmp3';
handler.alias = ['play', 'song'];
handler.tags = ['youtube'];
handler.desc = 'Cari dan download audio dari YouTube langsung';

module.exports = handler;