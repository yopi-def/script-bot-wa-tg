const { search, metadata } = db.func('youtube');

const handler = async (conn, { m, args, prefix, command }) => {
  try {
    if (!args[0]) {
      return m.reply(
`🎬 *YOUTUBE DOWNLOADER*

📝 *Cara Pakai:*
• ${prefix + command} <link> - Info video
• ${prefix + command} <query> - Cari video

📘 *Contoh:*
• ${prefix + command} https://youtu.be/xxxxx
• ${prefix + command} lathi weird genius

💡 *Command Lain:*
• ${prefix}ytmp3 <link> - Download audio
• ${prefix}ytmp4 <link> <kualitas> - Download video
• ${prefix}playmp3 <query> - Search & download audio
• ${prefix}playmp4 <query> - Search & download video
• ${prefix}ytcards <query> - Cari mode cards
• ${prefix}ytstext <query> - Cari mode text`
      );
    }

    const input = args.join(' ');
    const isLink = /(?:youtube\.com|youtu\.be)/.test(input);

    if (isLink) {
      // Mode: Detail Video dengan Buttons
      const loadms = await conn.sendMessage(m.chat, { 
        text: "⏳ Mengambil informasi video..." 
      });

      const info = await metadata(input);
      if (!info || info.status === false) {
        return await conn.sendMessage(m.chat, {
          text: `❌ Gagal mengambil info video!\n${info.message || ''}`,
          edit: loadms.key
        });
      }

      const videoUrl = `https://youtu.be/${info.id}`;
      const thumbnail = info.thumbnails.find(t => t.quality === 'high')?.url || info.thumbnails[0].url;

      const captionText = 
        `╭━━━〔 *YOUTUBE INFO* 〕━━━╮\n\n` +
        `🎬 *Judul:* ${info.title}\n` +
        `📺 *Channel:* ${info.channel_title}\n` +
        `📅 *Upload:* ${info.published_format}\n\n` +
        `📊 *Statistik:*\n` +
        `  👁️ ${Number(info.statistics.view).toLocaleString()} views\n` +
        `  ❤️ ${Number(info.statistics.like).toLocaleString()} likes\n` +
        `  💬 ${Number(info.statistics.comment).toLocaleString()} comments\n\n` +
        `🔗 *Link:* ${videoUrl}\n\n` +
        `╰━━━━━━━━━━━━━━━━━━━━╯`;

      await conn.sendMessage(m.chat, {
        text: captionText,
        edit: loadms.key
      });

      // Kirim dengan interactive buttons menggunakan command
      await conn.sendMessage(m.chat, {
        image: { url: thumbnail },
        caption: `🎯 *Pilih Format Download:*`,
        title: info.title,
        footer: '⚡ Powered by YouTube Downloader',
        interactiveButtons: [
          {
            name: 'quick_reply',
            buttonParamsJson: JSON.stringify({
              display_text: '🎵 Download Audio (128kbps)',
              id: `.ytmp3 ${videoUrl}`
            })
          },
          {
            name: 'quick_reply',
            buttonParamsJson: JSON.stringify({
              display_text: '🎥 Download Video 360p',
              id: `.ytmp4 ${videoUrl} 360`
            })
          },
          {
            name: 'quick_reply',
            buttonParamsJson: JSON.stringify({
              display_text: '🎬 Download Video 720p',
              id: `.ytmp4 ${videoUrl} 720`
            })
          },
          {
            name: 'cta_url',
            buttonParamsJson: JSON.stringify({
              display_text: '🌐 Buka di YouTube',
              url: videoUrl,
              merchant_url: videoUrl
            })
          },
          {
            name: 'cta_copy',
            buttonParamsJson: JSON.stringify({
              display_text: '📋 Salin Link',
              copy_code: videoUrl
            })
          }
        ]
      });

    } else {
      // Mode: Search - Redirect ke mode pilihan
      await m.reply(
        `🔎 *Pilih Mode Pencarian:*\n\n` +
        `📱 Mode Cards (Visual):\n` +
        `> ${prefix}ytcards ${input}\n\n` +
        `📝 Mode Text (Simple):\n` +
        `> ${prefix}ytstext ${input}`
      );
    }

  } catch (err) {
    console.error('[YOUTUBE Error]', err);
    await m.reply(`❌ Terjadi kesalahan!\n\n${err.message}`);
  }
};

handler.cmd = 'youtube';
handler.alias = ['yt'];
handler.tags = ['youtube'];
handler.desc = 'Cari atau download video/audio dari YouTube';

module.exports = handler;