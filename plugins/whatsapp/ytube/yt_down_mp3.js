const { ytmp3, apimp3 } = db.func('youtube');

const handler = async (conn, { m, args, prefix, command }) => {
  try {
    const url = args[0];
    if (!url) {
      return m.reply(
`🎧 *YOUTUBE AUDIO DOWNLOADER*

📝 *Cara Pakai:*
> ${prefix + command} <link video>

📘 *Contoh:*
> ${prefix + command} https://youtu.be/xxxxx

🎵 *Kualitas Audio:*
• 128kbps (Default)
• Format: MP3 Document`
      );
    }

    const loadms = await conn.sendMessage(m.chat, { 
      text: "⏳ Mengambil audio dari YouTube...\n⏱️ Mohon tunggu sebentar..." 
    });

    let res = await ytmp3(url, 128);
    
    // Fallback ke API alternatif jika gagal
    if (!res.status) {
      await conn.sendMessage(m.chat, {
        text: "⚠️ Mencoba metode alternatif...",
        edit: loadms.key
      });
      res = await apimp3(url, 128);
    }

    if (!res.status) {
      return await conn.sendMessage(m.chat, {
        text: `❌ Gagal mengambil audio!\n\n${res.message || 'Pastikan link valid.'}`,
        edit: loadms.key
      });
    }

    const { metadata, download } = res;
    const captionText = 
      `╭━━━〔 *YOUTUBE MP3* 〕━━━╮\n\n` +
      `🎵 *Judul:* ${metadata.title}\n` +
      `📺 *Channel:* ${metadata.author.name}\n` +
      `⏱️ *Durasi:* ${metadata.timestamp}\n` +
      `🎧 *Kualitas:* ${download.quality}\n\n` +
      `🔗 ${metadata.url}\n\n` +
      `╰━━━━━━━━━━━━━━━━━━━━╯`;

    await conn.sendMessage(m.chat, { 
      text: `✅ Audio berhasil diambil!\n📤 Mengirim file...`, 
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
      { quoted: db.quted("🎵 YouTube Audio") }
    );

  } catch (err) {
    console.error('[YTMP3 Error]', err);
    await m.reply(`❌ Terjadi kesalahan!\n\n${err.message}`);
  }
};

handler.cmd = 'ytmp3';
handler.alias = ['yta', 'ytaudio'];
handler.tags = ['youtube', 'down'];
handler.desc = 'Download audio dari YouTube dalam format MP3';

module.exports = handler;