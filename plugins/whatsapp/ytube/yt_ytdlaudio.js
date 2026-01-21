const { ytmp3, apimp3 } = db.func('youtube');

const handler = async (conn, { m, args }) => {
  try {
    // Command ini dipanggil dari button
    const url = args[0];
    if (!url) return;

    const loadms = await conn.sendMessage(m.chat, { 
      text: "⏳ Mendownload audio...\n🎵 Mohon tunggu sebentar..." 
    });

    let res = await ytmp3(url, 128);
    
    if (!res.status) {
      await conn.sendMessage(m.chat, {
        text: "⚠️ Mencoba metode alternatif...",
        edit: loadms.key
      });
      res = await apimp3(url, 128);
    }

    if (!res.status) {
      return await conn.sendMessage(m.chat, {
        text: `❌ Gagal mendownload audio!`,
        edit: loadms.key
      });
    }

    const { metadata, download } = res;

    await conn.sendMessage(m.chat, { 
      text: `✅ Audio berhasil!\n📤 Mengirim file...`, 
      edit: loadms.key 
    });

    const captionText = 
      `🎵 *${metadata.title}*\n\n` +
      `📺 ${metadata.author.name}\n` +
      `⏱️ ${metadata.timestamp}\n` +
      `🎧 ${download.quality}`;

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
    console.error('[YTDLAUDIO Error]', err);
    await m.reply(`❌ Gagal download: ${err.message}`);
  }
};

handler.cmd = 'ytdlaudio';
handler.tags = ['youtube'];
handler.desc = 'Internal command untuk download audio dari button';

module.exports = handler;