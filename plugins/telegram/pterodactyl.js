const db = require("../../utils/database");
const ptero = db.func('pterodactyl');

function tg(tgid) {
  const id = String(tgid);
  const configOwners = (db.cg().get("telegram").owner || []).map(String);
  const user = db.data.findByTelegramId(id);

  let isDev = false;
  let isOwner = false;
  let isReseller = false;

  if (configOwners.includes(id)) {
    isDev = true;
    isOwner = true;
    isReseller = true;
  } else if (user) {
    isOwner = user.isOwner;
    isReseller = user.isReseller;
  }

  return { id, user, isDev, isOwner, isReseller };
}

async function showMainMenu(ctx, isEdit = false) {
  const stats = ptero.getPanelStats();
  
  let text = '🦖 Pterodactyl Panel Manager\n\n';
  text += `📋 Total Panels: ${stats.total}\n`;
  
  if (stats.default) {
    const defaultPanel = ptero.getPanelByOptions(stats.default);
    text += `✅ Default: ${defaultPanel ? defaultPanel.name : 'N/A'} (${stats.default})\n`;
  }

  const keyboard = new InlineKeyboard()
    .text('📋 List Panel', 'ptero:list').row()
    .text('📝 Add New', 'ptero:add:start').row()
    .text('✏️ Edit Panel', 'ptero:edit:select').row()
    .text('🗑️ Delete Panel', 'ptero:delete:select').row()
    .text('🔄 Switch Default', 'ptero:switch:select').row()
    .text('❌ Close', 'ptero:close');

  if (isEdit) {
    await ctx.editMessageText(text, { reply_markup: keyboard });
  } else {
    await ctx.reply(text, { reply_markup: keyboard });
  }
}

function backToMainMenu() {
  return new InlineKeyboard().text('🔙 Back to Menu', 'ptero:main');
}


async function showLocationSelection(ctx, session) {
  const locResult = await ptero.getLocations2(session.data);
  
  if (!locResult.success) {
    await ctx.reply(
      `❌ Failed to fetch locations: ${locResult.error}\n\n` +
      'Please enter Location ID manually:',
      { reply_markup: new InlineKeyboard().text('❌ Cancel', 'ptero:add:cancel') }
    );
    session.step = 6;
    return;
  }
  
  const keyboard = new InlineKeyboard();
  
  locResult.data.forEach(loc => {
    keyboard.text(
      `📍 ${loc.short} - ${loc.long}`,
      `ptero:add:location:${loc.id}`
    ).row();
  });
  
  keyboard.text('❌ Cancel', 'ptero:add:cancel');
  
  await ctx.reply(
    '📝 Add New Panel - Step 6/10\n\n' +
    '📍 Select Location:',
    { reply_markup: keyboard }
  );
}

async function showNestSelection(ctx, session) {
  const nestResult = await ptero.getNests2(session.data);
  
  if (!nestResult.success) {
    await ctx.editMessageText(
      `❌ Failed to fetch nests: ${nestResult.error}\n\n` +
      'Please enter Nest ID manually:',
      { reply_markup: new InlineKeyboard().text('❌ Cancel', 'ptero:add:cancel') }
    );
    session.step = 7;
    return;
  }
  
  const keyboard = new InlineKeyboard();
  
  nestResult.data.forEach(nest => {
    keyboard.text(
      `🪺 ${nest.name}`,
      `ptero:add:nest:${nest.id}`
    ).row();
  });
  
  keyboard.text('❌ Cancel', 'ptero:add:cancel');
  
  await ctx.editMessageText(
    '📝 Add New Panel - Step 7/10\n\n' +
    '🪺 Select Nest:',
    { reply_markup: keyboard }
  );
}

async function showEggSelection(ctx, session) {
  const eggResult = await ptero.getEggs2(session.nestId, session.data);
  
  if (!eggResult.success) {
    await ctx.editMessageText(
      `❌ Failed to fetch eggs: ${eggResult.error}\n\n` +
      'Please enter Egg ID manually:',
      { reply_markup: new InlineKeyboard().text('❌ Cancel', 'ptero:add:cancel') }
    );
    return;
  }
  
  const keyboard = new InlineKeyboard();
  
  eggResult.data.forEach(egg => {
    keyboard.text(
      `🥚 ${egg.name}`,
      `ptero:add:egg:${egg.id}`
    ).row();
  });
  
  keyboard.text('❌ Cancel', 'ptero:add:cancel');
  
  await ctx.editMessageText(
    '📝 Add New Panel - Step 7/10 (continued)\n\n' +
    '🥚 Select Egg:',
    { reply_markup: keyboard }
  );
}


// Helper functions
async function showLocationEdit(ctx, options, panel) {
  const locResult = await ptero.getLocations(options);
  
  if (!locResult.success) {
    return ctx.editMessageText(
      `❌ Failed to fetch locations: ${locResult.error}\n\n` +
      `Current Location ID: ${panel.location}`,
      { reply_markup: new InlineKeyboard().text('🔙 Back', `ptero:edit:menu:${options}`) }
    );
  }
  
  const keyboard = new InlineKeyboard();
  
  locResult.data.forEach(loc => {
    const current = loc.id === panel.location ? '✅ ' : '';
    keyboard.text(
      `${current}📍 ${loc.short} - ${loc.long}`,
      `ptero:edit:location:${options}:${loc.id}`
    ).row();
  });
  
  keyboard.text('🔙 Back', `ptero:edit:menu:${options}`);
  
  await ctx.editMessageText(
    `📍 Select new Location:\n\nCurrent: ${panel.location}`,
    { reply_markup: keyboard }
  );
}

async function showNestEdit(ctx, options, panel) {
  const nestResult = await ptero.getNests(options);
  
  if (!nestResult.success) {
    return ctx.editMessageText(
      `❌ Failed to fetch nests: ${nestResult.error}\n\n` +
      `Current Nest ID: ${panel.nests}`,
      { reply_markup: new InlineKeyboard().text('🔙 Back', `ptero:edit:menu:${options}`) }
    );
  }
  
  const keyboard = new InlineKeyboard();
  
  nestResult.data.forEach(nest => {
    const current = nest.id === panel.nests ? '✅ ' : '';
    keyboard.text(
      `${current}🪺 ${nest.name}`,
      `ptero:edit:nest:${options}:${nest.id}`
    ).row();
  });
  
  keyboard.text('🔙 Back', `ptero:edit:menu:${options}`);
  
  await ctx.editMessageText(
    `🪺 Select new Nest:\n\nCurrent: ${panel.nests}`,
    { reply_markup: keyboard }
  );
}

async function showEggEdit(ctx, options, panel) {
  const eggResult = await ptero.getEggs(panel.nests, options);
  
  if (!eggResult.success) {
    return ctx.editMessageText(
      `❌ Failed to fetch eggs: ${eggResult.error}\n\n` +
      `Current Egg ID: ${panel.eggs}`,
      { reply_markup: new InlineKeyboard().text('🔙 Back', `ptero:edit:menu:${options}`) }
    );
  }
  
  const keyboard = new InlineKeyboard();
  
  eggResult.data.forEach(egg => {
    const current = egg.id === panel.eggs ? '✅ ' : '';
    keyboard.text(
      `${current}🥚 ${egg.name}`,
      `ptero:edit:egg:${options}:${egg.id}`
    ).row();
  });
  
  keyboard.text('🔙 Back', `ptero:edit:menu:${options}`);
  
  await ctx.editMessageText(
    `🥚 Select new Egg:\n\nCurrent: ${panel.eggs}`,
    { reply_markup: keyboard }
  );
}

function showSettingsEdit(ctx, options, panel) {
  const keyboard = new InlineKeyboard()
    .text(`🌐 Allocation (${panel.setting.allocation})`, `ptero:edit:setting:${options}:allocation`).row()
    .text(`🗄️ Database (${panel.setting.database})`, `ptero:edit:setting:${options}:database`).row()
    .text(`📦 Backup (${panel.setting.backup})`, `ptero:edit:setting:${options}:backup`).row()
    .text('🔙 Back', `ptero:edit:menu:${options}`);
  
  ctx.editMessageText(
    `⚙️ Edit Settings for: ${panel.name}\n\n` +
    'Select setting to edit:',
    { reply_markup: keyboard }
  );
}

function showEnvironmentEdit(ctx, options, panel) {
  const keyboard = new InlineKeyboard();
  
  Object.entries(panel.environment).forEach(([key, value]) => {
    keyboard.text(
      `${key}: ${value}`,
      `ptero:edit:env:${options}:${key}`
    ).row();
  });
  
  keyboard.text('🔙 Back', `ptero:edit:menu:${options}`);
  
  ctx.editMessageText(
    `🌍 Edit Environment for: ${panel.name}\n\n` +
    'Select variable to edit:',
    { reply_markup: keyboard }
  );
}

module.exports = (bot) => {
  // Command handler
  bot.command('ptero', async (ctx) => {
    const userId = ctx.from.id;
    const user = tg(userId);

    // Check authorization
    if (!user || (!user.isOwner && !user.isReseller)) {
      return ctx.reply('❌ You do not have permission to access Pterodactyl settings.');
    }

    await showMainMenu(ctx);
  });


  // Close menu
  bot.callbackQuery(/^ptero:close$/, async (ctx) => {
    await ctx.answerCallbackQuery('Menu closed');
    await ctx.deleteMessage();
  });

  // Callback handler for main menu
  bot.callbackQuery(/^ptero:main$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    await showMainMenu(ctx, true);
  });

  // Show list of panels
  bot.callbackQuery(/^ptero:list$/, async (ctx) => {-
    await ctx.answerCallbackQuery();
    const stats = ptero.getPanelStats();

    if (stats.total === 0) {
      return ctx.editMessageText(
        '📋 No panels configured yet.\n\nUse "Add New Panel" to get started.',
        { reply_markup: backToMainMenu() }
      );
    }

    let text = `📋 Panel List (${stats.total} panel${stats.total > 1 ? 's' : ''})\n\n`;
    
    stats.list.forEach((panel, index) => {
      const icon = panel.isDefault ? '✅' : '📦';
      const tag = panel.isDefault ? ' (default)' : '';
      text += `${icon} ${panel.options} - ${panel.name}${tag}\n`;
    });

    const keyboard = new InlineKeyboard();
    
    stats.list.forEach(panel => {
      keyboard.text(
        `${panel.isDefault ? '✅' : '📦'} ${panel.name}`,
        `ptero:view:${panel.options}`
      ).row();
    });
    
    keyboard.text('🔙 Back', 'ptero:main');

    await ctx.editMessageText(text, { reply_markup: keyboard });
  });

  bot.callbackQuery(/^ptero:add:start$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    
    const chatId = ctx.chat.id;
    const userId = ctx.from.id;
    
    // Initialize session
    db.session.panel[chatId].set({
      action: 'add_panel',
      step: 1,
      userId,
      data: ptero.createDefaultPanelStructure(),
      timestamp: Date.now()
    });

    await ctx.editMessageText(
      '📝 Add New Panel - Step 1/10\n\n' +
      '📛 Enter the panel name:\n' +
      '(e.g., "NodeJS Server", "Minecraft Panel")',
      { reply_markup: new InlineKeyboard().text('❌ Cancel', 'ptero:add:cancel') }
    );
  });

  // Handle text inputs for add panel
  bot.on('message:text', async (ctx, next) => {
    const chatId = ctx.chat.id;
    const session = db.session.panel[chatId].get();

    if (!session || session.action !== 'add_panel') return next()

    const step = session.step;
    const text = ctx.message.text.trim();

    try {
      switch (step) {
        case 1: // Panel Name
          session.data.name = text;
          session.step = 2;
          db.session.panel[chatId].update(session);
          
          await ctx.reply(
            '📝 Add New Panel - Step 2/10\n\n' +
            '🆔 Enter Options ID:\n' +
            '(e.g., "v1", "v2", "prod", "dev")\n' +
            'Or type "auto" to generate automatically',
            { reply_markup: new InlineKeyboard().text('❌ Cancel', 'ptero:add:cancel') }
          );
          break;

        case 2: // Options ID
          if (text.toLowerCase() === 'auto') {
            session.data.options = ptero.generateOptionsId();
          } else {
            if (!ptero.validateOptionsId(text)) {
              return ctx.reply('❌ Invalid Options ID. Use only letters, numbers, dash, or underscore.');
            }
            if (ptero.isOptionsExists(text)) {
              return ctx.reply('❌ Options ID already exists. Please use another ID.');
            }
            session.data.options = text;
          }
          
          session.step = 3;
          db.session.panel[chatId].update(session);
          
          await ctx.reply(
            `✅ Options ID: ${session.data.options}\n\n` +
            '📝 Add New Panel - Step 3/10\n\n' +
            '🔗 Enter Panel URL:\n' +
            '(e.g., "https://panel.example.com")\n' +
            '⚠️ Must include http:// or https://',
            { reply_markup: new InlineKeyboard().text('❌ Cancel', 'ptero:add:cancel') }
          );
          break;

        case 3: // URL
          if (!ptero.validateURL(text)) {
            return ctx.reply('❌ Invalid URL format. Must start with http:// or https://');
          }
          session.data.url = text.replace(/\/$/, ''); // Remove trailing slash
          session.step = 4;
          db.session.panel[chatId].update(session);
          
          await ctx.reply(
            '📝 Add New Panel - Step 4/10\n\n' +
            '🔑 Enter PTLA API Key:\n' +
            '(Must start with "ptla_")\n\n' +
            '💡 Find it in: Panel → Account → API Keys',
            { reply_markup: new InlineKeyboard().text('❌ Cancel', 'ptero:add:cancel') }
          );
          break;

        case 4: // PTLA Token
          if (!ptero.validatePTLA(text)) {
            return ctx.reply('❌ Invalid PTLA token format. Must start with "ptla_"');
          }
          session.data.ptla = text;
          
          // Test connection
          await ctx.reply('🔄 Testing connection...');
          const testResult = await ptero.testConnection(session.data.url, session.data.ptla);
          
          if (!testResult.success) {
            return ctx.reply(
              `❌ Connection failed: ${testResult.error}\n\n` +
              'Please check your URL and API key, then try again.'
            );
          }
          
          session.step = 5;
          db.session.panel[chatId].update(session);
          
          await ctx.reply(
            '✅ Connection successful!\n\n' +
            '📝 Add New Panel - Step 5/10\n\n' +
            '📧 Enter Email Format:\n' +
            '(e.g., "@gmail.com", "@company.com")',
            { reply_markup: new InlineKeyboard().text('❌ Cancel', 'ptero:add:cancel') }
          );
          break;

        case 5: // Email Format
          session.data.format_email = text.startsWith('@') ? text : '@' + text;
          session.step = 6;
          db.session.panel[chatId].update(session);
          
          // Fetch and show locations
          await ctx.reply('🔄 Fetching locations...');
          await showLocationSelection(ctx, session);
          break;

        case 8: // Allocation
          if (!/^\d+$/.test(text)) {
            return ctx.reply('❌ Please enter a valid number');
          }
          session.data.setting.allocation = parseInt(text);
          session.step = 9;
          db.session.panel[chatId].update(session);
          
          await ctx.reply(
            '📝 Add New Panel - Step 9/10\n\n' +
            '🗄️ Enter Database limit:\n' +
            '(Number of databases allowed)',
            { reply_markup: new InlineKeyboard().text('❌ Cancel', 'ptero:add:cancel') }
          );
          break;

        case 9: // Database
          if (!/^\d+$/.test(text)) {
            return ctx.reply('❌ Please enter a valid number');
          }
          session.data.setting.database = parseInt(text);
          session.step = 10;
          db.session.panel[chatId].update(session);
          
          await ctx.reply(
            '📝 Add New Panel - Step 10/10\n\n' +
            '📦 Enter Backup limit:\n' +
            '(Number of backups allowed)',
            { reply_markup: new InlineKeyboard().text('❌ Cancel', 'ptero:add:cancel') }
          );
          break;

        case 10: // Backup (Final step)
          if (!/^\d+$/.test(text)) {
            return ctx.reply('❌ Please enter a valid number');
          }
          session.data.setting.backup = parseInt(text);
          
          // Save panel
          const result = ptero.addPanel(session.data);
          
          if (!result.success) {
            await ctx.reply(`❌ Failed to add panel: ${result.error}`);
          } else {
            await ctx.reply(
              '✅ Panel added successfully!\n\n' +
              ptero.formatPanelInfo(session.data),
              { 
                reply_markup: new InlineKeyboard()
                  .text('🔄 Set as Default', `ptero:switch:confirm:${session.data.options}`)
                  .row()
                  .text('🔙 Back to Menu', 'ptero:main')
              }
            );
          }
          
          // Clear session
          db.session.panel[chatId].delete();
          break;
      }
    } catch (error) {
      await ctx.reply(`❌ Error: ${error.message}`);
      db.session.panel[chatId].delete();
    }
  });

  // Cancel add panel
  bot.callbackQuery(/^ptero:add:cancel$/, async (ctx) => {
    await ctx.answerCallbackQuery('Operation cancelled');
    const chatId = ctx.chat.id;
    db.session.panel[chatId].delete();
    
    await ctx.editMessageText(
      '❌ Add panel operation cancelled.',
      { reply_markup: new InlineKeyboard().text('🔙 Back to Menu', 'ptero:main') }
    );
  });

  // Location selection
  bot.callbackQuery(/^ptero:add:location:(.+)$/, async (ctx) => {
    const locationId = parseInt(ctx.match[1]);
    await ctx.answerCallbackQuery(`Location ${locationId} selected`);
    
    const chatId = ctx.chat.id;
    const session = db.session.panel[chatId].get();
    
    if (!session || session.action !== 'add_panel') return;
    
    session.data.location = locationId;
    session.step = 7;
    db.session.panel[chatId].update(session);
    
    // Fetch and show nests
    await ctx.editMessageText('🔄 Fetching nests...');
    await showNestSelection(ctx, session);
  });

  // Nest selection
  bot.callbackQuery(/^ptero:add:nest:(.+)$/, async (ctx) => {
    const nestId = parseInt(ctx.match[1]);
    await ctx.answerCallbackQuery(`Nest ${nestId} selected`);
    
    const chatId = ctx.chat.id;
    const session = db.session.panel[chatId].get();
    
    if (!session || session.action !== 'add_panel') return;
    
    session.data.nests = nestId;
    session.nestId = nestId; // Store for egg fetching
    session.step = 8; // Will show eggs
    db.session.panel[chatId].update(session);
    
    // Fetch and show eggs
    await ctx.editMessageText('🔄 Fetching eggs...');
    await showEggSelection(ctx, session);
  });

  // Egg selection
  bot.callbackQuery(/^ptero:add:egg:(.+)$/, async (ctx) => {
    const eggId = parseInt(ctx.match[1]);
    await ctx.answerCallbackQuery(`Egg ${eggId} selected`);
    
    const chatId = ctx.chat.id;
    const session = db.session.panel[chatId].get();
    
    if (!session || session.action !== 'add_panel') return;
    
    session.data.eggs = eggId;
    session.step = 8; // Move to allocation input
    db.session.panel[chatId].update(session);
    
    await ctx.editMessageText(
      '📝 Add New Panel - Step 8/10\n\n' +
      '🌐 Enter Allocation limit:\n' +
      '(Number of ports allowed)',
      { reply_markup: new InlineKeyboard().text('❌ Cancel', 'ptero:add:cancel') }
    );
  });
  // Select panel to delete
  bot.callbackQuery(/^ptero:delete:select$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    
    const stats = ptero.getPanelStats();
    
    if (stats.total === 0) {
      return ctx.editMessageText(
        '❌ No panels available to delete.',
        { reply_markup: new InlineKeyboard().text('🔙 Back', 'ptero:main') }
      );
    }
    
    if (stats.total === 1) {
      return ctx.editMessageText(
        '⚠️ Cannot delete the only panel.\n\n' +
        'You must have at least one panel configured.',
        { reply_markup: new InlineKeyboard().text('🔙 Back', 'ptero:main') }
      );
    }
    
    const keyboard = new InlineKeyboard();
    
    stats.list.forEach(panel => {
      // Show warning icon for default panel
      const icon = panel.isDefault ? '⚠️' : '📦';
      keyboard.text(
        `${icon} ${panel.name}`,
        `ptero:delete:confirm:${panel.options}`
      ).row();
    });
    
    keyboard.text('🔙 Back', 'ptero:main');
    
    await ctx.editMessageText(
      '🗑️ Select panel to delete:\n\n' +
      '⚠️ Warning icon indicates default panel',
      { reply_markup: keyboard }
    );
  });

  // Show delete confirmation
  bot.callbackQuery(/^ptero:delete:confirm:(.+)$/, async (ctx) => {
    const options = ctx.match[1];
    await ctx.answerCallbackQuery();
    
    const panel = ptero.getPanelByOptions(options);
    if (!panel) {
      return ctx.editMessageText(
        '❌ Panel not found.',
        { reply_markup: new InlineKeyboard().text('🔙 Back', 'ptero:main') }
      );
    }
    
    const defaultOptions = ptero.getDefaultOptions();
    const isDefault = options === defaultOptions;
    
    let warningText = '';
    if (isDefault) {
      warningText = '\n\n⚠️ THIS IS THE DEFAULT PANEL!\n' +
                    'You must switch to another default panel first.';
    }
    
    const keyboard = new InlineKeyboard();
    
    if (isDefault) {
      keyboard
        .text('🔄 Switch Default First', 'ptero:switch:select')
        .row()
        .text('🔙 Cancel', 'ptero:delete:select');
    } else {
      keyboard
        .text('✅ Yes, Delete', `ptero:delete:execute:${options}`)
        .row()
        .text('❌ Cancel', 'ptero:delete:select');
    }
    
    await ctx.editMessageText(
      '⚠️ Delete Panel Confirmation\n\n' +
      `Panel: ${panel.name} (${panel.options})\n` +
      `URL: ${panel.url}\n` +
      warningText +
      '\n\n⚠️ Warning: This action cannot be undone!\n\n' +
      'Are you sure you want to delete this panel?',
      { reply_markup: keyboard }
    );
  });

  // Execute delete
  bot.callbackQuery(/^ptero:delete:execute:(.+)$/, async (ctx) => {
    const options = ctx.match[1];
    await ctx.answerCallbackQuery('Deleting panel...');
    
    const panel = ptero.getPanelByOptions(options);
    if (!panel) {
      return ctx.editMessageText(
        '❌ Panel not found.',
        { reply_markup: new InlineKeyboard().text('🔙 Back', 'ptero:main') }
      );
    }
    
    const result = ptero.deletePanel(options);
    
    if (!result.success) {
      return ctx.editMessageText(
        `❌ Failed to delete panel: ${result.error}`,
        { 
          reply_markup: new InlineKeyboard()
            .text('🔙 Back', 'ptero:delete:select')
        }
      );
    }
    
    await ctx.editMessageText(
      `✅ Panel deleted successfully!\n\n` +
      `Deleted: ${panel.name} (${options})\n\n` +
      `Remaining panels: ${ptero.getPanelStats().total}`,
      { 
        reply_markup: new InlineKeyboard()
          .text('🗑️ Delete Another', 'ptero:delete:select')
          .row()
          .text('🔙 Back to Menu', 'ptero:main')
      }
    );
  });
    
  // Select panel to edit
  bot.callbackQuery(/^ptero:edit:select$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    
    const stats = ptero.getPanelStats();
    
    if (stats.total === 0) {
      return ctx.editMessageText(
        '❌ No panels available to edit.',
        { reply_markup: new InlineKeyboard().text('🔙 Back', 'ptero:main') }
      );
    }
    
    const keyboard = new InlineKeyboard();
    
    stats.list.forEach(panel => {
      keyboard.text(
        `${panel.isDefault ? '✅' : '📦'} ${panel.name}`,
        `ptero:edit:menu:${panel.options}`
      ).row();
    });
    
    keyboard.text('🔙 Back', 'ptero:main');
    
    await ctx.editMessageText(
      '✏️ Select panel to edit:',
      { reply_markup: keyboard }
    );
  });

  // Show edit menu for selected panel
  bot.callbackQuery(/^ptero:edit:menu:(.+)$/, async (ctx) => {
    const options = ctx.match[1];
    await ctx.answerCallbackQuery();
    
    const panel = ptero.getPanelByOptions(options);
    if (!panel) {
      return ctx.editMessageText(
        '❌ Panel not found.',
        { reply_markup: new InlineKeyboard().text('🔙 Back', 'ptero:main') }
      );
    }
    
    const keyboard = new InlineKeyboard()
      .text('📝 Panel Name', `ptero:edit:field:${options}:name`)
      .text('📧 Email Format', `ptero:edit:field:${options}:email`).row()
      .text('🔗 URL', `ptero:edit:field:${options}:url`)
      .text('🔑 API Key (PTLA)', `ptero:edit:field:${options}:ptla`).row()
      .text('📍 Location', `ptero:edit:field:${options}:location`).row()
      .text('🪺 Nest', `ptero:edit:field:${options}:nest`)
      .text('🥚 Egg', `ptero:edit:field:${options}:egg`).row()
      .text('⚙️ Settings', `ptero:edit:field:${options}:settings`).row()
      .text('🌍 Environment', `ptero:edit:field:${options}:environment`).row()
      .text('🔙 Back', 'ptero:edit:select');
    
    await ctx.editMessageText(
      `✏️ Edit Panel: ${panel.name}\n\n` +
      'What would you like to edit?',
      { reply_markup: keyboard }
    );
  });

  // Handle field editing
  bot.callbackQuery(/^ptero:edit:field:(.+):(.+)$/, async (ctx) => {
    const [options, field] = [ctx.match[1], ctx.match[2]];
    await ctx.answerCallbackQuery();
    
    const chatId = ctx.chat.id;
    const userId = ctx.from.id;
    
    const panel = ptero.getPanelByOptions(options);
    if (!panel) {
      return ctx.editMessageText('❌ Panel not found.');
    }
    
    // For location, nest, egg - show button selection
    if (field === 'location') {
      return showLocationEdit(ctx, options, panel);
    }
    
    if (field === 'nest') {
      return showNestEdit(ctx, options, panel);
    }
    
    if (field === 'egg') {
      // Need to store current nest for egg fetching
      db.session.panel[chatId].set({
        action: 'edit_panel_egg',
        options,
        nestId: panel.nests,
        userId,
        timestamp: Date.now()
      });
      return showEggEdit(ctx, options, panel);
    }
    
    if (field === 'settings') {
      return showSettingsEdit(ctx, options, panel);
    }
    
    if (field === 'environment') {
      return showEnvironmentEdit(ctx, options, panel);
    }
    
    // For text fields, initialize session
    db.session.panel[chatId].set({
      action: 'edit_panel',
      field,
      options,
      userId,
      timestamp: Date.now()
    });
    
    let promptText = '';
    let currentValue = '';
    
    switch (field) {
      case 'name':
        promptText = '📝 Enter new panel name:';
        currentValue = panel.name;
        break;
      case 'url':
        promptText = '🔗 Enter new panel URL:\n(Must include http:// or https://)';
        currentValue = panel.url;
        break;
      case 'ptla':
        promptText = '🔑 Enter new PTLA API key:\n(Must start with "ptla_")';
        currentValue = panel.ptla.substring(0, 15) + '...';
        break;
      case 'email':
        promptText = '📧 Enter new email format:';
        currentValue = panel.format_email;
        break;
    }
    
    await ctx.editMessageText(
      `✏️ Edit ${panel.name}\n\n` +
      `Current value: ${currentValue}\n\n` +
      promptText,
      { reply_markup: new InlineKeyboard().text('❌ Cancel', `ptero:edit:menu:${options}`) }
    );
  });

  // Handle text input for editing
  bot.on('message:text', async (ctx, next) => {
    const chatId = ctx.chat.id;
    const session = db.session.panel[chatId].get();
    
    if (!session || session.action !== 'edit_panel') return next()
    
    const text = ctx.message.text.trim();
    const { field, options } = session;
    
    let updates = {};
    let errorMsg = null;
    
    switch (field) {
      case 'name':
        updates.name = text;
        break;
      case 'url':
        if (!ptero.validateURL(text)) {
          errorMsg = '❌ Invalid URL format. Must start with http:// or https://';
        } else {
          updates.url = text.replace(/\/$/, '');
        }
        break;
      case 'ptla':
        if (!ptero.validatePTLA(text)) {
          errorMsg = '❌ Invalid PTLA token format. Must start with "ptla_"';
        } else {
          // Test connection if both URL and PTLA are being updated
          const panel = ptero.getPanelByOptions(options);
          await ctx.reply('🔄 Testing connection...');
          const testResult = await ptero.testConnection(panel.url, text);
          
          if (!testResult.success) {
            errorMsg = `❌ Connection failed: ${testResult.error}`;
          } else {
            updates.ptla = text;
            await ctx.reply('✅ Connection successful!');
          }
        }
        break;
      case 'email':
        updates.format_email = text.startsWith('@') ? text : '@' + text;
        break;
    }
    
    if (errorMsg) {
      return ctx.reply(errorMsg);
    }
    
    const result = ptero.updatePanel(options, updates);
    
    if (!result.success) {
      await ctx.reply(`❌ Failed to update: ${result.error}`);
    } else {
      await ctx.reply(
        `✅ ${field} updated successfully!`,
        { 
          reply_markup: new InlineKeyboard()
            .text('✏️ Edit More', `ptero:edit:menu:${options}`)
            .row()
            .text('🔙 Back to Menu', 'ptero:main')
        }
      );
    }
    
    db.session.panel[chatId].delete();
  });

  // Location selection for edit
  bot.callbackQuery(/^ptero:edit:location:(.+):(.+)$/, async (ctx) => {
    const [options, locationId] = [ctx.match[1], parseInt(ctx.match[2])];
    await ctx.answerCallbackQuery(`Location ${locationId} selected`);
    
    const result = ptero.updatePanel(options, { location: locationId });
    
    if (!result.success) {
      return ctx.editMessageText(`❌ Failed to update: ${result.error}`);
    }
    
    await ctx.editMessageText(
      `✅ Location updated to ${locationId}`,
      { 
        reply_markup: new InlineKeyboard()
          .text('✏️ Edit More', `ptero:edit:menu:${options}`)
          .row()
          .text('🔙 Back to Menu', 'ptero:main')
      }
    );
  });

  // Nest selection for edit
  bot.callbackQuery(/^ptero:edit:nest:(.+):(.+)$/, async (ctx) => {
    const [options, nestId] = [ctx.match[1], parseInt(ctx.match[2])];
    await ctx.answerCallbackQuery(`Nest ${nestId} selected`);
    
    const result = ptero.updatePanel(options, { nests: nestId });
    
    if (!result.success) {
      return ctx.editMessageText(`❌ Failed to update: ${result.error}`);
    }
    
    await ctx.editMessageText(
      `✅ Nest updated to ${nestId}\n\n` +
      '⚠️ Note: You may need to update the Egg ID as well.',
      { 
        reply_markup: new InlineKeyboard()
          .text('🥚 Update Egg', `ptero:edit:field:${options}:egg`)
          .row()
          .text('✏️ Edit More', `ptero:edit:menu:${options}`)
          .row()
          .text('🔙 Back to Menu', 'ptero:main')
      }
    );
  });

  // Egg selection for edit
  bot.callbackQuery(/^ptero:edit:egg:(.+):(.+)$/, async (ctx) => {
    const [options, eggId] = [ctx.match[1], parseInt(ctx.match[2])];
    await ctx.answerCallbackQuery(`Egg ${eggId} selected`);
    
    const result = ptero.updatePanel(options, { eggs: eggId });
    
    if (!result.success) {
      return ctx.editMessageText(`❌ Failed to update: ${result.error}`);
    }
    
    await ctx.editMessageText(
      `✅ Egg updated to ${eggId}`,
      { 
        reply_markup: new InlineKeyboard()
          .text('✏️ Edit More', `ptero:edit:menu:${options}`)
          .row()
          .text('🔙 Back to Menu', 'ptero:main')
      }
    );
  });

  // Settings edit handlers
  bot.callbackQuery(/^ptero:edit:setting:(.+):(.+)$/, async (ctx) => {
    const [options, settingField] = [ctx.match[1], ctx.match[2]];
    await ctx.answerCallbackQuery();
    
    const chatId = ctx.chat.id;
    const userId = ctx.from.id;
    const panel = ptero.getPanelByOptions(options);
    
    db.session.panel[chatId].set({
      action: 'edit_setting',
      options,
      field: settingField,
      userId,
      timestamp: Date.now()
    });
    
    const currentValue = panel.setting[settingField];
    const fieldNames = {
      allocation: 'Allocation',
      database: 'Database',
      backup: 'Backup'
    };
    
    await ctx.editMessageText(
      `⚙️ Edit ${fieldNames[settingField]}\n\n` +
      `Current value: ${currentValue}\n\n` +
      'Enter new value (number):',
      { reply_markup: new InlineKeyboard().text('❌ Cancel', `ptero:edit:menu:${options}`) }
    );
  });

  // Handle setting value input
  bot.on('message:text', async (ctx, next) => {
    const chatId = ctx.chat.id;
    const session = db.session.panel[chatId].get();
    
    if (!session || session.action !== 'edit_setting') return next()
    
    const text = ctx.message.text.trim();
    
    if (!/^\d+$/.test(text)) {
      return ctx.reply('❌ Please enter a valid number');
    }
    
    const panel = ptero.getPanelByOptions(session.options);
    const newSettings = { ...panel.setting };
    newSettings[session.field] = parseInt(text);
    
    const result = ptero.updatePanel(session.options, { setting: newSettings });
    
    if (!result.success) {
      await ctx.reply(`❌ Failed to update: ${result.error}`);
    } else {
      await ctx.reply(
        `✅ ${session.field} updated to ${text}`,
        { 
          reply_markup: new InlineKeyboard()
            .text('⚙️ Edit More Settings', `ptero:edit:field:${session.options}:settings`)
            .row()
            .text('🔙 Back to Menu', 'ptero:main')
        }
      );
    }
    
    db.session.panel[chatId].delete();
  });

  // Environment edit handlers
  bot.callbackQuery(/^ptero:edit:env:(.+):(.+)$/, async (ctx) => {
    const [options, envKey] = [ctx.match[1], ctx.match[2]];
    await ctx.answerCallbackQuery();
    
    const chatId = ctx.chat.id;
    const userId = ctx.from.id;
    const panel = ptero.getPanelByOptions(options);
    
    db.session.panel[chatId].set({
      action: 'edit_environment',
      options,
      envKey,
      userId,
      timestamp: Date.now()
    });
    
    const currentValue = panel.environment[envKey];
    
    await ctx.editMessageText(
      `🌍 Edit Environment: ${envKey}\n\n` +
      `Current value: ${currentValue}\n\n` +
      'Enter new value:',
      { reply_markup: new InlineKeyboard().text('❌ Cancel', `ptero:edit:menu:${options}`) }
    );
  });

  // Handle environment value input
  bot.on('message:text', async (ctx, next) => {
    const chatId = ctx.chat.id;
    const session = db.session.panel[chatId].get();
    
    if (!session || session.action !== 'edit_environment') return next();
    
    const text = ctx.message.text.trim();
    const panel = ptero.getPanelByOptions(session.options);
    const newEnv = { ...panel.environment };
    newEnv[session.envKey] = text;
    
    const result = ptero.updatePanel(session.options, { environment: newEnv });
    
    if (!result.success) {
      await ctx.reply(`❌ Failed to update: ${result.error}`);
    } else {
      await ctx.reply(
        `✅ ${session.envKey} updated to: ${text}`,
        { 
          reply_markup: new InlineKeyboard()
            .text('🌍 Edit More Env', `ptero:edit:field:${session.options}:environment`)
            .row()
            .text('🔙 Back to Menu', 'ptero:main')
        }
      );
    }
    
    db.session.panel[chatId].delete();
  });

  // Select new default panel
  bot.callbackQuery(/^ptero:switch:select$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    
    const stats = ptero.getPanelStats();
    
    if (stats.total === 0) {
      return ctx.editMessageText(
        '❌ No panels available.',
        { reply_markup: new InlineKeyboard().text('🔙 Back', 'ptero:main') }
      );
    }
    
    if (stats.total === 1) {
      return ctx.editMessageText(
        'ℹ️ Only one panel is configured.\n\n' +
        'It is already set as default.',
        { reply_markup: new InlineKeyboard().text('🔙 Back', 'ptero:main') }
      );
    }
    
    const currentDefault = ptero.getDefaultOptions();
    const keyboard = new InlineKeyboard();
    
    stats.list.forEach(panel => {
      if (panel.options === currentDefault) {
        // Skip current default
        return;
      }
      
      keyboard.text(
        `📦 ${panel.name}`,
        `ptero:switch:confirm:${panel.options}`
      ).row();
    });
    
    keyboard.text('🔙 Back', 'ptero:main');
    
    const currentPanel = ptero.getPanelByOptions(currentDefault);
    
    await ctx.editMessageText(
      '🔄 Switch Default Panel\n\n' +
      `Current Default: ${currentPanel ? currentPanel.name : 'N/A'} (${currentDefault})\n\n` +
      'Select new default panel:',
      { reply_markup: keyboard }
    );
  });

  // Show switch confirmation
  bot.callbackQuery(/^ptero:switch:confirm:(.+)$/, async (ctx) => {
    const options = ctx.match[1];
    await ctx.answerCallbackQuery();
    
    const panel = ptero.getPanelByOptions(options);
    if (!panel) {
      return ctx.editMessageText(
        '❌ Panel not found.',
        { reply_markup: new InlineKeyboard().text('🔙 Back', 'ptero:main') }
      );
    }
    
    const currentDefault = ptero.getDefaultOptions();
    const currentPanel = ptero.getPanelByOptions(currentDefault);
    
    const keyboard = new InlineKeyboard()
      .text('✅ Yes, Switch', `ptero:switch:execute:${options}`)
      .row()
      .text('❌ Cancel', 'ptero:switch:select');
    
    await ctx.editMessageText(
      '🔄 Switch Default Panel Confirmation\n\n' +
      `Current Default:\n` +
      `├─ ${currentPanel ? currentPanel.name : 'N/A'} (${currentDefault})\n\n` +
      `New Default:\n` +
      `├─ ${panel.name} (${options})\n\n` +
      'Switch default panel?',
      { reply_markup: keyboard }
    );
  });

  // Execute switch
  bot.callbackQuery(/^ptero:switch:execute:(.+)$/, async (ctx) => {
    const options = ctx.match[1];
    await ctx.answerCallbackQuery('Switching default panel...');
    
    const panel = ptero.getPanelByOptions(options);
    if (!panel) {
      return ctx.editMessageText(
        '❌ Panel not found.',
        { reply_markup: new InlineKeyboard().text('🔙 Back', 'ptero:main') }
      );
    }
    
    const result = ptero.setDefaultPanel(options);
    
    if (!result.success) {
      return ctx.editMessageText(
        `❌ Failed to switch default: ${result.error}`,
        { 
          reply_markup: new InlineKeyboard()
            .text('🔙 Back', 'ptero:switch:select')
        }
      );
    }
    
    await ctx.editMessageText(
      `✅ Default panel switched successfully!\n\n` +
      `New Default: ${panel.name} (${options})\n\n` +
      `This panel will now be used by default for all pterodactyl operations.`,
      { 
        reply_markup: new InlineKeyboard()
          .text('📊 View Panel Details', `ptero:view:${options}`)
          .row()
          .text('🔙 Back to Menu', 'ptero:main')
      }
    );
  });

  // View panel details
  bot.callbackQuery(/^ptero:view:(.+)$/, async (ctx) => {
    const options = ctx.match[1];
    await ctx.answerCallbackQuery();
    
    const panel = ptero.getPanelByOptions(options);
    if (!panel) {
      return ctx.editMessageText(
        '❌ Panel not found.',
        { reply_markup: new InlineKeyboard().text('🔙 Back', 'ptero:main') }
      );
    }
    
    const defaultOptions = ptero.getDefaultOptions();
    const isDefault = options === defaultOptions;
    
    const infoText = ptero.formatPanelInfo(panel, isDefault);
    
    const keyboard = new InlineKeyboard()
      .text('✏️ Edit', `ptero:edit:menu:${options}`)
      .text('🗑️ Delete', `ptero:delete:confirm:${options}`)
      .row();
    
    if (!isDefault) {
      keyboard.text('🔄 Set as Default', `ptero:switch:confirm:${options}`).row();
    }
    
    keyboard
      .text('🧪 Test Connection', `ptero:test:${options}`)
      .row()
      .text('📋 View List', 'ptero:list')
      .row()
      .text('🔙 Back to Menu', 'ptero:main');
    
    await ctx.editMessageText(infoText, { reply_markup: keyboard });
  });

  // Test connection
  bot.callbackQuery(/^ptero:test:(.+)$/, async (ctx) => {
    const options = ctx.match[1];
    await ctx.answerCallbackQuery('Testing connection...');
    
    const panel = ptero.getPanelByOptions(options);
    if (!panel) {
      return ctx.editMessageText('❌ Panel not found.');
    }
    
    // Show testing message
    await ctx.editMessageText(
      `🧪 Testing Connection...\n\n` +
      `Panel: ${panel.name}\n` +
      `URL: ${panel.url}\n\n` +
      `Please wait...`,
      { reply_markup: null }
    );
    
    const result = await ptero.testConnection(panel.url, panel.ptla);
    
    let statusIcon = result.success ? '✅' : '❌';
    let statusText = result.success ? 'Connection Successful' : 'Connection Failed';
    let detailText = result.success ? result.message : result.error;
    
    // Try to fetch additional info on success
    let additionalInfo = '';
    if (result.success) {
      const locResult = await ptero.getLocations(options);
      const nestResult = await ptero.getNests(options);
      
      if (locResult.success) {
        additionalInfo += `\n📍 Locations: ${locResult.data.length} found`;
      }
      if (nestResult.success) {
        additionalInfo += `\n🪺 Nests: ${nestResult.data.length} found`;
      }
    }
    
    const keyboard = new InlineKeyboard()
      .text('🔄 Test Again', `ptero:test:${options}`)
      .row()
      .text('📊 View Details', `ptero:view:${options}`)
      .row()
      .text('🔙 Back to Menu', 'ptero:main');
    
    await ctx.editMessageText(
      `${statusIcon} ${statusText}\n\n` +
      `Panel: ${panel.name}\n` +
      `URL: ${panel.url}\n\n` +
      `Result: ${detailText}${additionalInfo}`,
      { reply_markup: keyboard }
    );
  });
};