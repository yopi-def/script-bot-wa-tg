const { search } = db.func('youtube');

const handler = async (conn, { m, args, prefix, command }) => {
  try {
    const query = args.join(' ');
    if (!query) {
      return m.reply(
`📱 *YOUTUBE SEARCH - CARDS MODE*

📝 *Cara Pakai:*
> ${prefix + command} <judul video>

📘 *Contoh:*
> ${prefix + command} lathi weird genius
> ${prefix + command} dj viral tiktok

✨ Tampilan visual dengan thumbnail!`
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

    const results = res.results.slice(0, 10);

    await conn.sendMessage(m.chat, {
      text: `✅ Ditemukan ${results.length} video!\n📤 Memuat cards...`,
      edit: loadms.key
    });

    // Buat cards dengan thumbnail
    const cards = results.map((v, i) => {
      const duration = v.timestamp || '—';
      const views = v.views ? Number(v.views).toLocaleString() : '—';
      const channel = v.author?.name || 'Unknown';

      return {
        image: { url: v.thumbnail },
        title: `${i + 1}. ${v.title.substring(0, 60)}${v.title.length > 60 ? '...' : ''}`,
        body: `👤 ${channel}\n⏱️ ${duration} | 👁️ ${views}`,
        footer: '🎬 YouTube Downloader',
        buttons: [
          {
            name: 'quick_reply',
            buttonParamsJson: JSON.stringify({
              display_text: '🎵 Audio',
              id: `.ytdlaudio https://youtu.be/${v.videoId}`
            })
          },
          {
            name: 'quick_reply',
            buttonParamsJson: JSON.stringify({
              display_text: '🎥 Video 360p',
              id: `.ytdlvideo https://youtu.be/${v.videoId} 360`
            })
          },
          {
            name: 'quick_reply',
            buttonParamsJson: JSON.stringify({
              display_text: '🎬 Video 720p',
              id: `.ytdlvideo https://youtu.be/${v.videoId} 720`
            })
          },
          {
            name: 'cta_url',
            buttonParamsJson: JSON.stringify({
              display_text: '🌐 Buka',
              url: `https://youtu.be/${v.videoId}`
            })
          }
        ]
      };
    });

    await conn.sendMessage(m.chat, {
      delete: loadms.key
    });

    await conn.sendMessage(m.chat, {
      text: `📱 *Mode: Cards Visual*\n\n🔍 Hasil pencarian untuk: *${query}*\n\nKlik button untuk download!`,
      title: `YouTube Search Results`,
      subtitle: `${results.length} video ditemukan`,
      footer: '⚡ Powered by YouTube Downloader',
      cards: cards
    });

  } catch (err) {
    console.error('[YTCARDS Error]', err);
    await m.reply(`❌ Terjadi kesalahan!\n\n${err.message}`);
  }
};

handler.cmd = 'ytcards';
handler.alias = ['ytsearchcards', 'ytsc'];
handler.tags = ['youtube'];
handler.desc = 'Cari video YouTube dengan tampilan cards visual';

module.exports = handler;