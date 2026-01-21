const { search } = db.func('youtube');

const handler = async (conn, { m, args, prefix, command }) => {
  try {
    const query = args.join(' ');
    if (!query) {
      return m.reply(
`📝 *YOUTUBE SEARCH - TEXT MODE*

📝 *Cara Pakai:*
> ${prefix + command} <judul video>

📘 *Contoh:*
> ${prefix + command} lathi weird genius
> ${prefix + command} tutorial javascript

✨ Tampilan simple text list!`
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

    const results = res.results.slice(0, 15);

    let text = `╭━━━〔 *YOUTUBE SEARCH* 〕━━━╮\n\n`;
    text += `📝 *Query:* ${query}\n`;
    text += `📊 *Hasil:* ${results.length} video\n\n`;
    text += `────────────────────\n\n`;

    results.forEach((v, i) => {
      const duration = v.timestamp || '—';
      const views = v.views ? Number(v.views).toLocaleString() : '—';
      const channel = v.author?.name || 'Unknown';
      const videoUrl = `https://youtu.be/${v.videoId}`;

      text += `🎬 *${i + 1}.* ${v.title}\n`;
      text += `👤 *Channel:* ${channel}\n`;
      text += `⏱️ *Durasi:* ${duration}\n`;
      text += `👁️ *Views:* ${views}\n`;
      text += `🔗 ${videoUrl}\n\n`;
    });

    text += `────────────────────\n\n`;
    text += `💡 *Cara Download:*\n\n`;
    text += `🎵 Audio:\n`;
    text += `• ${prefix}ytmp3 <link>\n\n`;
    text += `🎥 Video:\n`;
    text += `• ${prefix}ytmp4 <link> 360\n`;
    text += `• ${prefix}ytmp4 <link> 720\n\n`;
    text += `⚡ Quick Download:\n`;
    text += `• ${prefix}playmp3 <query>\n`;
    text += `• ${prefix}playmp4 <query>\n\n`;
    text += `╰━━━━━━━━━━━━━━━━━━━━╯`;

    await conn.sendMessage(m.chat, {
      text: text,
      edit: loadms.key
    });

  } catch (err) {
    console.error('[YTSTEXT Error]', err);
    await m.reply(`❌ Terjadi kesalahan!\n\n${err.message}`);
  }
};

handler.cmd = 'ytstext';
handler.alias = ['ytsearchtext', 'ytst', 'yts'];
handler.tags = ['youtube'];
handler.desc = 'Cari video YouTube dengan tampilan text simple';

module.exports = handler;