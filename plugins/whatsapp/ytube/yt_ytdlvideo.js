const { ytmp4, apimp4 } = db.func('youtube');

const handler = async (conn, { m, args }) => {
  try {
    // Command ini dipanggil dari button
    const url = args[0];
    const quality = args[1] || '360';
    if (!url) return;

    const loadms = await conn.sendMessage(m.chat, { 
      text: `⏳ Mendownload video ${quality}p...\n🎥 Mohon tunggu sebentar...` 
    });

    let res = await ytmp4(url, Number(quality));
    
    if (!res.status) {
      await conn.sendMessage(m.chat, {
        text: "⚠️ Mencoba metode alternatif...",
        edit: loadms.key
      });
      res = await apimp4(url, Number(quality));
    }

    if (!res.status) {
      return await conn.sendMessage(m.chat, {
        text: `❌ Gagal mendownload video!`,
        edit: loadms.key
      });
    }

    const { metadata, download } = res;

    await conn.sendMessage(m.chat, { 
      text: `✅ Video ${download.quality} berhasil!\n📤 Mengirim file...`, 
      edit: loadms.key 
    });

    const captionText = 
      `🎬 *${metadata.title}*\n\n` +
      `📺 ${metadata.author.name}\n` +
      `⏱️ ${metadata.timestamp}\n` +
      `📐 ${download.quality}`;

    await conn.sendMessage(
      m.chat, 
      { 
        video: { url: download.url }, 
        caption: captionText
      }, 
      { quoted: db.quted("🎥 YouTube Video") }
    );

  } catch (err) {
    console.error('[YTDLVIDEO Error]', err);
    await m.reply(`❌ Gagal download: ${err.message}`);
  }
};

handler.cmd = 'ytdlvideo';
handler.tags = ['youtube'];
handler.desc = 'Internal command untuk download video dari button';

module.exports = handler;