const { ytmp4, apimp4 } = db.func('youtube');
const handler = async (conn, { m, args, prefix, command }) => {
  try {
    const url = args[0];
    const quality = args[1] || '360';

    if (!url) {
      return m.reply(
`🎥 *YOUTUBE VIDEO DOWNLOADER*

📝 *Cara Pakai:*
> ${prefix + command} <link> <kualitas>

📘 *Contoh:*
> ${prefix + command} https://youtu.be/xxxxx 360
> ${prefix + command} https://youtu.be/xxxxx 720

🎬 *Kualitas Tersedia:*
• 144p, 360p (Default), 480p, 720p, 1080p`
      );
    }

    const validQualities = [144, 360, 480, 720, 1080];
    const selectedQuality = validQualities.includes(Number(quality)) ? Number(quality) : 360;

    const loadms = await conn.sendMessage(m.chat, { 
      text: `⏳ Mengambil video ${selectedQuality}p dari YouTube...\n⏱️ Mohon tunggu sebentar...` 
    });

    let res = await ytmp4(url, selectedQuality);
    
    // Fallback ke API alternatif jika gagal
    if (!res.status) {
      await conn.sendMessage(m.chat, {
        text: "⚠️ Mencoba metode alternatif...",
        edit: loadms.key
      });
      res = await apimp4(url, selectedQuality);
    }

    if (!res.status) {
      return await conn.sendMessage(m.chat, {
        text: `❌ Gagal mengambil video!\n\n${res.message || 'Pastikan link valid atau coba kualitas lebih rendah.'}`,
        edit: loadms.key
      });
    }

    const { metadata, download } = res;
    const captionText = 
      `╭━━━〔 *YOUTUBE MP4* 〕━━━╮\n\n` +
      `🎬 *Judul:* ${metadata.title}\n` +
      `📺 *Channel:* ${metadata.author.name}\n` +
      `⏱️ *Durasi:* ${metadata.timestamp}\n` +
      `📐 *Kualitas:* ${download.quality}\n\n` +
      `🔗 ${metadata.url}\n\n` +
      `╰━━━━━━━━━━━━━━━━━━━━╯`;

    await conn.sendMessage(m.chat, { 
      text: `✅ Video ${download.quality} berhasil diambil!\n📤 Mengirim file...`, 
      edit: loadms.key 
    });

    await conn.sendMessage(
      m.chat, 
      { 
        video: { url: download.url }, 
        caption: captionText
      }, 
      { quoted: db.quted("🎥 YouTube Video") }
    );

  } catch (err) {
    console.error('[YTMP4 Error]', err);
    await m.reply(`❌ Terjadi kesalahan!\n\n${err.message}`);
  }
};

handler.cmd = 'ytmp4';
handler.alias = ['ytv', 'ytvideo'];
handler.tags = ['youtube', 'down'];
handler.desc = 'Download video dari YouTube dalam format MP4';

module.exports = handler;