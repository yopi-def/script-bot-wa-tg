const otakuDesu = db.func("otakudesu")
const axios = require('axios');
const { InputFile } = require('grammy');

const sendPhotoSafe = async (ctx, imageUrl, options) => {
  if (!imageUrl) {
    // Jika tidak ada gambar, kirim text saja
    return await ctx.reply(options.caption, {
      parse_mode: options.parse_mode,
      reply_markup: options.reply_markup
    });
  }

  try {
    // Coba kirim langsung
    return await ctx.replyWithPhoto(imageUrl, options);
  } catch (error) {
    if (error.description?.includes('failed to get HTTP URL content')) {
      console.log('🔄 Direct URL failed, downloading image...');
      
      try {
        // Download gambar dengan headers yang proper
        const response = await axios.get(imageUrl, {
          responseType: 'arraybuffer',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Referer': 'https://otakudesu.best/',
            'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
          },
          timeout: 15000,
          maxRedirects: 5
        });
        
        const buffer = Buffer.from(response.data, 'binary');
        
        // Kirim dari buffer
        return await ctx.replyWithPhoto(new InputFile(buffer), options);
        
      } catch (downloadError) {
        console.error('❌ Failed to download image:', downloadError.message);
      }
    }
    
    // Fallback: kirim tanpa gambar
    console.log('⚠️ Sending without image...');
    return await ctx.reply(options.caption, {
      parse_mode: options.parse_mode,
      reply_markup: options.reply_markup
    });
  }
};

const safeReply = async (ctx, message, options = {}) => {
  try {
    // Cek apakah message sebelumnya ada foto/media
    const hasMedia = ctx.callbackQuery?.message?.photo || 
                     ctx.callbackQuery?.message?.video ||
                     ctx.callbackQuery?.message?.document;
    
    if (hasMedia || ctx.callbackQuery) {
      // Delete message lama dan kirim baru
      try {
        await ctx.deleteMessage();
      } catch (e) {
        // Ignore jika gagal delete
      }
      return await ctx.reply(message, options);
    } else {
      // Edit message yang ada
      return await ctx.editMessageText(message, options);
    }
  } catch (error) {
    // Jika edit gagal, delete dan kirim baru
    if (error.description?.includes('there is no text in the message to edit') ||
        error.description?.includes('message to edit not found') ||
        error.description?.includes('message is not modified')) {
      try {
        await ctx.deleteMessage();
      } catch (e) {
        // Ignore
      }
      return await ctx.reply(message, options);
    }
    throw error;
  }
};

/**
 * Helper untuk safely reply dengan foto
 */
const safeReplyWithPhoto = async (ctx, imageUrl, options = {}) => {
  try {
    await ctx.deleteMessage();
  } catch (e) {
    // Ignore jika gagal delete
  }
  
  if (!imageUrl) {
    return await ctx.reply(options.caption || 'No image available', {
      parse_mode: options.parse_mode,
      reply_markup: options.reply_markup
    });
  }

  try {
    return await ctx.replyWithPhoto(imageUrl, options);
  } catch (error) {
    if (error.description?.includes('failed to get HTTP URL content')) {
      console.log('🔄 Downloading image...');
      
      try {
        const response = await axios.get(imageUrl, {
          responseType: 'arraybuffer',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Referer': 'https://otakudesu.best/'
          },
          timeout: 15000
        });
        
        const buffer = Buffer.from(response.data, 'binary');
        return await ctx.replyWithPhoto(new InputFile(buffer), options);
        
      } catch (downloadError) {
        console.error('❌ Failed to download image:', downloadError.message);
      }
    }
    
    // Fallback: kirim tanpa gambar
    return await ctx.reply(options.caption, {
      parse_mode: options.parse_mode,
      reply_markup: options.reply_markup
    });
  }
};

// Session storage
let session_otakudesu = {};

// Helper function untuk format pesan
const formatAnimeList = (animeList, page = 0, itemsPerPage = 5) => {
  const start = page * itemsPerPage;
  const end = start + itemsPerPage;
  const paginatedList = animeList.slice(start, end);
  
  let message = '🎬 <b>Hasil Pencarian Anime</b>\n\n';
  
  paginatedList.forEach((anime, index) => {
    message += `${start + index + 1}. <b>${anime.title}</b>\n`;
    message += `   📊 Status: ${anime.status}\n`;
    message += `   🎭 Genre: ${anime.genres}\n`;
    message += `   ⭐ Rating: ${anime.rating}\n\n`;
  });
  
  message += `📄 Halaman ${page + 1}/${Math.ceil(animeList.length / itemsPerPage)}`;
  
  return message;
};

const formatOngoingList = (ongoingList, page = 0, itemsPerPage = 5) => {
  const start = page * itemsPerPage;
  const end = start + itemsPerPage;
  const paginatedList = ongoingList.slice(start, end);
  
  let message = '🔥 <b>Anime Ongoing Terbaru</b>\n\n';
  
  paginatedList.forEach((anime, index) => {
    message += `${start + index + 1}. <b>${anime.title}</b>\n`;
    message += `   📺 ${anime.episode}\n`;
    message += `   🏷️ ${anime.type}\n`;
    message += `   📅 ${anime.date}\n\n`;
  });
  
  message += `📄 Halaman ${page + 1}/${Math.ceil(ongoingList.length / itemsPerPage)}`;
  
  return message;
};

const formatAnimeDetail = (detail) => {
  const { animeInfo, episodes } = detail;
  
  let message = `🎬 <b>${animeInfo.title}</b>\n`;
  message += `🇯🇵 ${animeInfo.japaneseTitle}\n\n`;
  message += `⭐ Score: ${animeInfo.score}\n`;
  message += `📊 Status: ${animeInfo.status}\n`;
  message += `🎭 Type: ${animeInfo.type}\n`;
  message += `📺 Total Episode: ${animeInfo.totalEpisodes}\n`;
  message += `⏱️ Durasi: ${animeInfo.duration}\n`;
  message += `📅 Rilis: ${animeInfo.releaseDate}\n`;
  message += `🏢 Studio: ${animeInfo.studio}\n`;
  message += `🎨 Producer: ${animeInfo.producer}\n`;
  message += `🏷️ Genre: ${animeInfo.genres}\n\n`;
  message += `📝 Total ${episodes.length} episode tersedia`;
  
  return message;
};

const formatEpisodeList = (episodes, page = 0, itemsPerPage = 10) => {
  const start = page * itemsPerPage;
  const end = start + itemsPerPage;
  const paginatedEpisodes = episodes.slice(start, end);
  
  let message = '📺 <b>Daftar Episode</b>\n\n';
  
  paginatedEpisodes.forEach((ep, index) => {
    message += `${start + index + 1}. ${ep.title}\n   📅 ${ep.date}\n\n`;
  });
  
  message += `📄 Halaman ${page + 1}/${Math.ceil(episodes.length / itemsPerPage)}`;
  
  return message;
};

const formatDownloadLinks = (downloadInfo) => {
  let message = `📥 <b>${downloadInfo.title}</b>\n\n`;
  
  const groupedByQuality = {};
  downloadInfo.downloads.forEach(dl => {
    if (!groupedByQuality[dl.quality]) {
      groupedByQuality[dl.quality] = [];
    }
    groupedByQuality[dl.quality].push(dl);
  });
  
  Object.keys(groupedByQuality).forEach(quality => {
    message += `\n<b>${quality}</b>\n`;
    groupedByQuality[quality].forEach(dl => {
      message += `• ${dl.host}\n`;
    });
  });
  
  return message;
};

// Main plugin function
module.exports = (bot) => {
  
  // Command: /otakudesu - Menu utama
  bot.command('otakudesu', async (ctx) => {
    const chatId = ctx.chat.id;
    
    // Reset session
    session_otakudesu[chatId] = {
      state: 'main_menu',
      data: null,
      page: 0
    };
    
    const keyboard = new InlineKeyboard()
      .text('🔥 Anime Ongoing', 'otaku:ongoing')
      .row()
      .text('🔍 Cari Anime', 'otaku:search')
      .row()
      .text('❓ Bantuan', 'otaku:help');
    
    await ctx.reply(
      '🎌 <b>Selamat datang di OtakuDesu Bot!</b>\n\n' +
      'Pilih menu di bawah untuk memulai:\n' +
      '• <b>Anime Ongoing</b>: Lihat anime yang sedang tayang\n' +
      '• <b>Cari Anime</b>: Cari anime favorit kamu\n' +
      '• <b>Bantuan</b>: Panduan menggunakan bot',
      { 
        parse_mode: 'HTML',
        reply_markup: keyboard 
      }
    );
  });
  
  // Callback: ongoing
  bot.callbackQuery('otaku:ongoing', async (ctx) => {
    await ctx.answerCallbackQuery('⏳ Mengambil data anime ongoing...');
    
    const chatId = ctx.chat.id;
    
    try {
      const ongoingList = await otakuDesu.ongoing();
      
      if (!ongoingList || ongoingList.length === 0) {
        await ctx.editMessageText('❌ Tidak ada anime ongoing saat ini.');
        return;
      }
      
      session_otakudesu[chatId] = {
        state: 'ongoing_list',
        data: ongoingList,
        page: 0
      };
      
      const message = formatOngoingList(ongoingList, 0);
      const keyboard = new InlineKeyboard();
      
      // Pagination buttons
      if (ongoingList.length > 5) {
        keyboard.text('➡️ Next', 'otaku:ongoing_next');
      }
      keyboard.row().text('🏠 Menu Utama', 'otaku:main_menu');
      
      // Item selection buttons
      const itemsOnPage = ongoingList.slice(0, 5);
      itemsOnPage.forEach((anime, index) => {
        if (index % 2 === 0) keyboard.row();
        keyboard.text(`${index + 1}`, `otaku:ongoing_select:${index}`);
      });
      
      await safeReply(ctx, message, {
        parse_mode: 'HTML',
        reply_markup: keyboard
      });
      
    } catch (error) {
      await ctx.editMessageText('❌ Terjadi kesalahan saat mengambil data.');
      console.error(error);
    }
  });
  
  // Callback: ongoing pagination
bot.callbackQuery(/otaku:ongoing_(next|prev)/, async (ctx) => {
  await ctx.answerCallbackQuery();
  
  const chatId = ctx.chat.id;
  const session = session_otakudesu[chatId];
  
  if (!session || session.state !== 'ongoing_list') {
    await ctx.answerCallbackQuery('⚠️ Session expired, gunakan /otakudesu');
    return;
  }
  
  const action = ctx.match[1];
  const maxPages = Math.ceil(session.data.length / 5);
  
  if (action === 'next' && session.page < maxPages - 1) {
    session.page++;
  } else if (action === 'prev' && session.page > 0) {
    session.page--;
  }
  
  const message = formatOngoingList(session.data, session.page);
  const keyboard = new InlineKeyboard();
  
  if (session.page > 0) {
    keyboard.text('⬅️ Prev', 'otaku:ongoing_prev');
  }
  if (session.page < maxPages - 1) {
    keyboard.text('➡️ Next', 'otaku:ongoing_next');
  }
  keyboard.row().text('🏠 Menu Utama', 'otaku:main_menu');
  
  const start = session.page * 5;
  const itemsOnPage = session.data.slice(start, start + 5);
  itemsOnPage.forEach((anime, index) => {
    if (index % 2 === 0) keyboard.row();
    keyboard.text(`${start + index + 1}`, `otaku:ongoing_select:${start + index}`);
  });
  
  // ✅ Gunakan safeReply
  await safeReply(ctx, message, {
    parse_mode: 'HTML',
    reply_markup: keyboard
  });
});
  
  // Callback: select ongoing anime
bot.callbackQuery(/otaku:ongoing_select:(\d+)/, async (ctx) => {
  await ctx.answerCallbackQuery('⏳ Mengambil detail anime...');
  
  const chatId = ctx.chat.id;
  const session = session_otakudesu[chatId];
  const index = parseInt(ctx.match[1]);
  
  if (!session || !session.data || !session.data[index]) {
    await ctx.answerCallbackQuery('⚠️ Data tidak ditemukan');
    return;
  }
  
  const anime = session.data[index];
  
  try {
    const detail = await otakuDesu.detail(anime.link);
    
    session.state = 'anime_detail';
    session.currentAnime = detail;
    session.currentAnimeLink = anime.link;
    
    const message = formatAnimeDetail(detail);
    const keyboard = new InlineKeyboard()
      .text('📺 Lihat Episode', 'otaku:episodes')
      .row()
      .text('🔙 Kembali', 'otaku:ongoing')
      .text('🏠 Menu Utama', 'otaku:main_menu');
    
    // ✅ Gunakan safeReplyWithPhoto
    await safeReplyWithPhoto(ctx, anime.image, {
      caption: message,
      parse_mode: 'HTML',
      reply_markup: keyboard
    });
    
  } catch (error) {
    await ctx.answerCallbackQuery('❌ Gagal mengambil detail anime');
    console.error(error);
  }
});
  
  // Callback: search
  bot.callbackQuery('otaku:search', async (ctx) => {
    await ctx.answerCallbackQuery();
    
    const chatId = ctx.chat.id;
    
    session_otakudesu[chatId] = {
      state: 'waiting_search',
      data: null,
      page: 0
    };
    
    const keyboard = new InlineKeyboard()
      .text('🔙 Kembali', 'otaku:main_menu');
    
    await ctx.editMessageText(
      '🔍 <b>Pencarian Anime</b>\n\n' +
      'Kirim nama anime yang ingin kamu cari.\n' +
      'Contoh: <code>Naruto</code>',
      {
        parse_mode: 'HTML',
        reply_markup: keyboard
      }
    );
  });
  
  // Handle search text
bot.on('message:text', async (ctx, next) => {
    const chatId = ctx.chat.id;
    const session = session_otakudesu[chatId];
    
    // Cek apakah ini untuk otakudesu
    if (!session || session.state !== 'waiting_search') {
      // Bukan untuk otakudesu, lanjut ke handler berikutnya
      return next();
    }
    
    const query = ctx.message.text;
    
    const loadingMsg = await ctx.reply('⏳ Mencari anime...');
    
    try {
      const searchResults = await otakuDesu.search(query);
      
      if (!searchResults || searchResults.length === 0) {
        await ctx.api.editMessageText(
          chatId,
          loadingMsg.message_id,
          '❌ Anime tidak ditemukan. Coba kata kunci lain.'
        );
        return;
      }
      
      session.state = 'search_results';
      session.data = searchResults;
      session.query = query;
      session.page = 0;
      
      const message = formatAnimeList(searchResults, 0);
      const keyboard = new InlineKeyboard();
      
      if (searchResults.length > 5) {
        keyboard.text('➡️ Next', 'otaku:search_next');
      }
      keyboard.row().text('🔍 Cari Lagi', 'otaku:search')
        .text('🏠 Menu Utama', 'otaku:main_menu');
      
      const itemsOnPage = searchResults.slice(0, 5);
      itemsOnPage.forEach((anime, index) => {
        if (index % 2 === 0) keyboard.row();
        keyboard.text(`${index + 1}`, `otaku:search_select:${index}`);
      });
      
      await ctx.api.editMessageText(
        chatId,
        loadingMsg.message_id,
        message,
        {
          parse_mode: 'HTML',
          reply_markup: keyboard
        }
      );
      
    } catch (error) {
      await ctx.api.editMessageText(
        chatId,
        loadingMsg.message_id,
        '❌ Terjadi kesalahan saat mencari anime.'
      );
      console.error(error);
    }
  });
  
  // Callback: search pagination
  bot.callbackQuery(/otaku:search_(next|prev)/, async (ctx) => {
    await ctx.answerCallbackQuery();
    
    const chatId = ctx.chat.id;
    const session = session_otakudesu[chatId];
    
    if (!session || session.state !== 'search_results') {
      await ctx.answerCallbackQuery('⚠️ Session expired');
      return;
    }
    
    const action = ctx.match[1];
    const maxPages = Math.ceil(session.data.length / 5);
    
    if (action === 'next' && session.page < maxPages - 1) {
      session.page++;
    } else if (action === 'prev' && session.page > 0) {
      session.page--;
    }
    
    const message = formatAnimeList(session.data, session.page);
    const keyboard = new InlineKeyboard();
    
    if (session.page > 0) {
      keyboard.text('⬅️ Prev', 'otaku:search_prev');
    }
    if (session.page < maxPages - 1) {
      keyboard.text('➡️ Next', 'otaku:search_next');
    }
    keyboard.row().text('🔍 Cari Lagi', 'otaku:search')
      .text('🏠 Menu Utama', 'otaku:main_menu');
    
    const start = session.page * 5;
    const itemsOnPage = session.data.slice(start, start + 5);
    itemsOnPage.forEach((anime, index) => {
      if (index % 2 === 0) keyboard.row();
      keyboard.text(`${start + index + 1}`, `otaku:search_select:${start + index}`);
    });
    
    await safeReply(ctx, message, {
      parse_mode: 'HTML',
      reply_markup: keyboard
    });
  });
  
  // Callback: select search result
  bot.callbackQuery(/otaku:search_select:(\d+)/, async (ctx) => {
    await ctx.answerCallbackQuery('⏳ Mengambil detail anime...');
    
    const chatId = ctx.chat.id;
    const session = session_otakudesu[chatId];
    const index = parseInt(ctx.match[1]);
    
    if (!session || !session.data || !session.data[index]) {
      await ctx.answerCallbackQuery('⚠️ Data tidak ditemukan');
      return;
    }
    
    const anime = session.data[index];
    
    try {
      const detail = await otakuDesu.detail(anime.link);
      
      session.state = 'anime_detail';
      session.currentAnime = detail;
      session.currentAnimeLink = anime.link;
      
      const message = formatAnimeDetail(detail);
      const keyboard = new InlineKeyboard()
        .text('📺 Lihat Episode', 'otaku:episodes')
        .row()
        .text('🔙 Hasil Pencarian', 'otaku:back_to_search')
        .text('🏠 Menu Utama', 'otaku:main_menu');
      
      if (anime.imageUrl) {
        await ctx.deleteMessage();
        await sendPhotoSafe(ctx, anime.image, {
          caption: message,
          parse_mode: 'HTML',
          reply_markup: keyboard
        });
      } else {
        await safeReply(ctx, message, {
          parse_mode: 'HTML',
          reply_markup: keyboard
        });
      }
      
    } catch (error) {
      await ctx.answerCallbackQuery('❌ Gagal mengambil detail anime');
      console.error(error);
    }
  });
  
  // Callback: episodes
  bot.callbackQuery('otaku:episodes', async (ctx) => {
    await ctx.answerCallbackQuery();
    
    const chatId = ctx.chat.id;
    const session = session_otakudesu[chatId];
    
    if (!session || !session.currentAnime) {
      await ctx.answerCallbackQuery('⚠️ Data tidak tersedia');
      return;
    }
    
    const episodes = session.currentAnime.episodes;
    session.state = 'episode_list';
    session.episodePage = 0;
    
    const message = formatEpisodeList(episodes, 0);
    const keyboard = new InlineKeyboard();
    
    if (episodes.length > 10) {
      keyboard.text('➡️ Next', 'otaku:episode_next');
    }
    keyboard.row().text('🔙 Detail Anime', 'otaku:back_to_detail')
      .text('🏠 Menu Utama', 'otaku:main_menu');
    
    // Episode selection
    const itemsOnPage = episodes.slice(0, 10);
    let rowCount = 0;
    itemsOnPage.forEach((ep, index) => {
      if (index % 3 === 0) keyboard.row();
      keyboard.text(`${index + 1}`, `otaku:episode_select:${index}`);
    });
    
    await safeReply(ctx, message, {
      parse_mode: 'HTML',
      reply_markup: keyboard
    });
  });
  
  // Callback: episode pagination
  bot.callbackQuery(/otaku:episode_(next|prev)/, async (ctx) => {
    await ctx.answerCallbackQuery();
    
    const chatId = ctx.chat.id;
    const session = session_otakudesu[chatId];
    
    if (!session || session.state !== 'episode_list') return;
    
    const action = ctx.match[1];
    const episodes = session.currentAnime.episodes;
    const maxPages = Math.ceil(episodes.length / 10);
    
    if (action === 'next' && session.episodePage < maxPages - 1) {
      session.episodePage++;
    } else if (action === 'prev' && session.episodePage > 0) {
      session.episodePage--;
    }
    
    const message = formatEpisodeList(episodes, session.episodePage);
    const keyboard = new InlineKeyboard();
    
    if (session.episodePage > 0) {
      keyboard.text('⬅️ Prev', 'otaku:episode_prev');
    }
    if (session.episodePage < maxPages - 1) {
      keyboard.text('➡️ Next', 'otaku:episode_next');
    }
    keyboard.row().text('🔙 Detail Anime', 'otaku:back_to_detail')
      .text('🏠 Menu Utama', 'otaku:main_menu');
    
    const start = session.episodePage * 10;
    const itemsOnPage = episodes.slice(start, start + 10);
    itemsOnPage.forEach((ep, index) => {
      if (index % 3 === 0) keyboard.row();
      keyboard.text(`${start + index + 1}`, `otaku:episode_select:${start + index}`);
    });
    
    await safeReply(ctx, message, {
      parse_mode: 'HTML',
      reply_markup: keyboard
    });
  });
  
  // Callback: select episode
  bot.callbackQuery(/otaku:episode_select:(\d+)/, async (ctx) => {
    await ctx.answerCallbackQuery('⏳ Mengambil link download...');
    
    const chatId = ctx.chat.id;
    const session = session_otakudesu[chatId];
    const index = parseInt(ctx.match[1]);
    
    if (!session || !session.currentAnime) return;
    
    const episode = session.currentAnime.episodes[index];
    
    try {
      const downloadInfo = await otakuDesu.download(episode.link);
      
      const message = formatDownloadLinks(downloadInfo);
      const keyboard = new InlineKeyboard();
      
      // Group download links by quality
      const qualities = {};
      downloadInfo.downloads.forEach(dl => {
        if (!qualities[dl.quality]) {
          qualities[dl.quality] = [];
        }
        qualities[dl.quality].push(dl);
      });
      
      // Create buttons for each quality (max 3 per row)
      let qualityIndex = 0;
      Object.keys(qualities).forEach(quality => {
        if (qualityIndex % 3 === 0) keyboard.row();
        keyboard.text(quality, `otaku:quality:${index}:${quality}`);
        qualityIndex++;
      });
      
      keyboard.row()
        .text('🔙 Daftar Episode', 'otaku:episodes')
        .text('🏠 Menu Utama', 'otaku:main_menu');
      
      session.currentDownload = downloadInfo;
      session.currentEpisodeIndex = index;
      
      await safeReply(ctx, message, {
        parse_mode: 'HTML',
        reply_markup: keyboard
      });
      
    } catch (error) {
      await ctx.answerCallbackQuery('❌ Gagal mengambil link download');
      console.error(error);
    }
  });
  
  // Callback: select quality
  bot.callbackQuery(/otaku:quality:(\d+):(.+)/, async (ctx) => {
    await ctx.answerCallbackQuery();
    
    const chatId = ctx.chat.id;
    const session = session_otakudesu[chatId];
    const episodeIndex = parseInt(ctx.match[1]);
    const quality = ctx.match[2];
    
    if (!session || !session.currentDownload) return;
    
    const links = session.currentDownload.downloads.filter(dl => dl.quality === quality);
    
    let message = `📥 <b>Download ${quality}</b>\n\n`;
    message += `Episode: ${session.currentDownload.title}\n\n`;
    message += `Pilih server download:\n\n`;
    
    const keyboard = new InlineKeyboard();
    
    links.forEach((link, index) => {
      message += `${index + 1}. ${link.host}\n`;
      if (index % 2 === 0) keyboard.row();
      keyboard.text(link.host, `otaku:download:${index}`);
    });
    
    keyboard.row()
      .text('🔙 Kembali', `otaku:episode_select:${episodeIndex}`)
      .text('🏠 Menu Utama', 'otaku:main_menu');
    
    session.currentQualityLinks = links;
    
    await safeReply(ctx, message, {
      parse_mode: 'HTML',
      reply_markup: keyboard
    });
  });
  
  // Callback: download link
  bot.callbackQuery(/otaku:download:(\d+)/, async (ctx) => {
    const chatId = ctx.chat.id;
    const session = session_otakudesu[chatId];
    const index = parseInt(ctx.match[1]);
    
    if (!session || !session.currentQualityLinks) {
      await ctx.answerCallbackQuery('⚠️ Link tidak tersedia');
      return;
    }
    
    const link = session.currentQualityLinks[index];
    
    await ctx.answerCallbackQuery('✅ Link berhasil disalin!');
    
    const message = `📥 <b>Download Link</b>\n\n` +
      `Server: ${link.host}\n` +
      `Quality: ${link.quality}\n\n` +
      `🔗 <a href="${link.link}">Klik di sini untuk download</a>\n\n` +
      `<code>${link.link}</code>`;
    
    await ctx.reply(message, { parse_mode: 'HTML' });
  });
  
// Callback: back to search
  bot.callbackQuery('otaku:back_to_search', async (ctx) => {
    await ctx.answerCallbackQuery();
    
    const chatId = ctx.chat.id;
    const session = session_otakudesu[chatId];
    
    if (!session || session.state !== 'anime_detail') return;
    
    session.state = 'search_results';
    
    const message = formatAnimeList(session.data, session.page);
    const keyboard = new InlineKeyboard();
    
    const maxPages = Math.ceil(session.data.length / 5);
    
    if (session.page > 0) {
      keyboard.text('⬅️ Prev', 'otaku:search_prev');
    }
    if (session.page < maxPages - 1) {
      keyboard.text('➡️ Next', 'otaku:search_next');
    }
    keyboard.row().text('🔍 Cari Lagi', 'otaku:search')
      .text('🏠 Menu Utama', 'otaku:main_menu');
    
    const start = session.page * 5;
    const itemsOnPage = session.data.slice(start, start + 5);
    itemsOnPage.forEach((anime, index) => {
      if (index % 2 === 0) keyboard.row();
      keyboard.text(`${start + index + 1}`, `otaku:search_select:${start + index}`);
    });
    
    await safeReply(ctx, message, {
      parse_mode: 'HTML',
      reply_markup: keyboard
    });
  });
  
  // Callback: back to detail
bot.callbackQuery('otaku:back_to_detail', async (ctx) => {
  await ctx.answerCallbackQuery();
  
  const chatId = ctx.chat.id;
  const session = session_otakudesu[chatId];
  
  if (!session || !session.currentAnime) return;
  
  session.state = 'anime_detail';
  
  const message = formatAnimeDetail(session.currentAnime);
  const keyboard = new InlineKeyboard()
    .text('📺 Lihat Episode', 'otaku:episodes')
    .row()
    .text('🔙 Kembali', 'otaku:back_to_search')
    .text('🏠 Menu Utama', 'otaku:main_menu');
  
  // ✅ Gunakan safeReply (bukan editMessageText)
  await safeReply(ctx, message, {
    parse_mode: 'HTML',
    reply_markup: keyboard
  });
});
  
  // Callback: main menu
  bot.callbackQuery('otaku:main_menu', async (ctx) => {
    await ctx.answerCallbackQuery();
    
    const chatId = ctx.chat.id;
    
    session_otakudesu[chatId] = {
      state: 'main_menu',
      data: null,
      page: 0
    };
    
    const keyboard = new InlineKeyboard()
      .text('🔥 Anime Ongoing', 'otaku:ongoing')
      .row()
      .text('🔍 Cari Anime', 'otaku:search')
      .row()
      .text('❓ Bantuan', 'otaku:help');
    
    await ctx.editMessageText(
      '🎌 <b>Selamat datang di OtakuDesu Bot!</b>\n\n' +
      'Pilih menu di bawah untuk memulai:\n' +
      '• <b>Anime Ongoing</b>: Lihat anime yang sedang tayang\n' +
      '• <b>Cari Anime</b>: Cari anime favorit kamu\n' +
      '• <b>Bantuan</b>: Panduan menggunakan bot',
      { 
        parse_mode: 'HTML',
        reply_markup: keyboard 
      }
    );
  });
  
  // Callback: help
  bot.callbackQuery('otaku:help', async (ctx) => {
    await ctx.answerCallbackQuery();
    
    const helpText = `
📖 <b>Panduan OtakuDesu Bot</b>

<b>Fitur Utama:</b>

🔥 <b>Anime Ongoing</b>
Lihat daftar anime yang sedang tayang. Klik nomor untuk melihat detail dan episode.

🔍 <b>Cari Anime</b>
Cari anime berdasarkan judul. Kirim nama anime setelah memilih menu ini.

📺 <b>Download Episode</b>
1. Pilih anime dari daftar ongoing atau hasil pencarian
2. Lihat detail anime
3. Pilih episode yang ingin didownload
4. Pilih kualitas video
5. Pilih server download

<b>Tips:</b>
• Gunakan tombol navigasi untuk berpindah halaman
• Tombol 🏠 untuk kembali ke menu utama
• Gunakan /otakudesu untuk memulai ulang

<b>Support:</b>
Jika ada masalah, hubungi admin atau buat issue di GitHub.

Selamat menonton! 🍿
    `;
    
    const keyboard = new InlineKeyboard()
      .text('🏠 Menu Utama', 'otaku:main_menu');
    
    await ctx.editMessageText(helpText, {
      parse_mode: 'HTML',
      reply_markup: keyboard
    });
  });
};