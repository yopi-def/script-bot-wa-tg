const fs = require('fs');
const os = require('os');
const path = require('path');
const chalk = require('chalk');
const crypto = require('crypto');
const FileType = require('file-type');
const ffmpeg = require('fluent-ffmpeg');
const webp = require('node-webpmux');
const color = (t, c) => (!c ? chalk.green(t) : chalk.keyword(c)(t));
const { proto, jidDecode, getContentType, downloadContentFromMessage, generateWAMessage, generateWAMessageFromContent } = require('@fhynella/baileys');


async function imageToWebp (media) {
    const tmpFileOut = path.join(os.tmpdir(), `${crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.webp`)
    const tmpFileIn = path.join(os.tmpdir(), `${crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.jpg`)
    fs.writeFileSync(tmpFileIn, media)
    await new Promise((resolve, reject) => {
        ffmpeg(tmpFileIn)
            .on("error", reject)
            .on("end", () => resolve(true))
            .addOutputOptions([
                "-vcodec",
                "libwebp",
                "-vf",
                "scale='min(320,iw)':min'(320,ih)':force_original_aspect_ratio=decrease,fps=15, pad=320:320:-1:-1:color=white@0.0, split [a][b]; [a] palettegen=reserve_transparent=on:transparency_color=ffffff [p]; [b][p] paletteuse"
            ])
            .toFormat("webp")
            .save(tmpFileOut)
    })
    const buff = fs.readFileSync(tmpFileOut)
    fs.unlinkSync(tmpFileOut)
    fs.unlinkSync(tmpFileIn)
    return buff
}

async function videoToWebp (media) {
    const tmpFileOut = path.join(os.tmpdir(), `${crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.webp`)
    const tmpFileIn = path.join(os.tmpdir(), `${crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.mp4`)
    fs.writeFileSync(tmpFileIn, media)
    await new Promise((resolve, reject) => {
        ffmpeg(tmpFileIn)
            .on("error", reject)
            .on("end", () => resolve(true))
            .addOutputOptions([
                "-vcodec",
                "libwebp",
                "-vf",
                "scale='min(320,iw)':min'(320,ih)':force_original_aspect_ratio=decrease,fps=15, pad=320:320:-1:-1:color=white@0.0, split [a][b]; [a] palettegen=reserve_transparent=on:transparency_color=ffffff [p]; [b][p] paletteuse",
                "-loop",
                "0",
                "-ss",
                "00:00:00",
                "-t",
                "00:00:05",
                "-preset",
                "default",
                "-an",
                "-vsync",
                "0"
            ])
            .toFormat("webp")
            .save(tmpFileOut)
    })
    const buff = fs.readFileSync(tmpFileOut)
    fs.unlinkSync(tmpFileOut)
    fs.unlinkSync(tmpFileIn)
    return buff
}

async function writeExifImg (media, metadata) {
    let wMedia = await imageToWebp(media)
    const tmpFileIn = path.join(os.tmpdir(), `${crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.webp`)
    const tmpFileOut = path.join(os.tmpdir(), `${crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.webp`)
    fs.writeFileSync(tmpFileIn, wMedia)
    if (metadata.packname || metadata.author) {
        const img = new webp.Image()
        const json = { "sticker-pack-id": `https://github.com/KirBotz`, "sticker-pack-name": metadata.packname, "sticker-pack-publisher": metadata.author, "emojis": metadata.categories ? metadata.categories : [""] }
        const exifAttr = Buffer.from([0x49, 0x49, 0x2A, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00])
        const jsonBuff = Buffer.from(JSON.stringify(json), "utf-8")
        const exif = Buffer.concat([exifAttr, jsonBuff])
        exif.writeUIntLE(jsonBuff.length, 14, 4)
        await img.load(tmpFileIn)
        fs.unlinkSync(tmpFileIn)
        img.exif = exif
        await img.save(tmpFileOut)
        return tmpFileOut
    }
}

async function writeExifVid (media, metadata) {
    let wMedia = await videoToWebp(media)
    const tmpFileIn = path.join(os.tmpdir(), `${crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.webp`)
    const tmpFileOut = path.join(os.tmpdir(), `${crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.webp`)
    fs.writeFileSync(tmpFileIn, wMedia)
    if (metadata.packname || metadata.author) {
        const img = new webp.Image()
        const json = { "sticker-pack-id": `https://github.com/KirBotz`, "sticker-pack-name": metadata.packname, "sticker-pack-publisher": metadata.author, "emojis": metadata.categories ? metadata.categories : [""] }
        const exifAttr = Buffer.from([0x49, 0x49, 0x2A, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00])
        const jsonBuff = Buffer.from(JSON.stringify(json), "utf-8")
        const exif = Buffer.concat([exifAttr, jsonBuff])
        exif.writeUIntLE(jsonBuff.length, 14, 4)
        await img.load(tmpFileIn)
        fs.unlinkSync(tmpFileIn)
        img.exif = exif
        await img.save(tmpFileOut)
        return tmpFileOut
    }
}

async function writeExif (media, metadata) {
    let wMedia = /webp/.test(media.mimetype) ? media.data : /image/.test(media.mimetype) ? await imageToWebp(media.data) : /video/.test(media.mimetype) ? await videoToWebp(media.data) : ""
    const tmpFileIn = path.join(os.tmpdir(), `${crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.webp`)
    const tmpFileOut = path.join(os.tmpdir(), `${crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.webp`)
    fs.writeFileSync(tmpFileIn, wMedia)
    if (metadata.packname || metadata.author) {
        const img = new webp.Image()
        const json = { "sticker-pack-id": `https://github.com/KirBotz`, "sticker-pack-name": metadata.packname, "sticker-pack-publisher": metadata.author, "emojis": metadata.categories ? metadata.categories : [""] }
        const exifAttr = Buffer.from([0x49, 0x49, 0x2A, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00])
        const jsonBuff = Buffer.from(JSON.stringify(json), "utf-8")
        const exif = Buffer.concat([exifAttr, jsonBuff])
        exif.writeUIntLE(jsonBuff.length, 14, 4)
        await img.load(tmpFileIn)
        fs.unlinkSync(tmpFileIn)
        img.exif = exif
        await img.save(tmpFileOut)
        return tmpFileOut
    }
}

exports.plugins = (conn) => {
  const basePath = path.join(process.cwd(), 'plugins', "whatsapp");
  if (!fs.existsSync(basePath)) {
    console.error(color('[EROR]', 'red'), 'Folder plugin tidak ditemukan:', basePath);
    return;
  }
  conn.plugins = new Map();
  console.log(color('[INFO]', 'yellow'), '🔍 Memindai folder plugin...');

  const findJsFiles = (dir) => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    let files = [];
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files = files.concat(findJsFiles(fullPath));
      } else if (entry.isFile() && entry.name.endsWith('.js')) {
        files.push(fullPath);
      }
    }
    return files;
  };

  const pluginFiles = findJsFiles(basePath);
  console.log(color('[INFO]', 'yellow'), `📦 Ditemukan ${pluginFiles.length} file plugin.`);
  let loaded = 0, skipped = 0, failed = 0;
  for (const filePath of pluginFiles) {
    const pluginName = path.relative(basePath, filePath).replace(/\\/g, '/');
    const shortName = pluginName.split('/').pop();

    try {
      delete require.cache[require.resolve(filePath)];
      const plugin = require(filePath);
      if (typeof plugin !== 'function' || !plugin.cmd) {
        console.warn(color('[SKIP]', 'gray'), `*️⃣  ${shortName}`);
        skipped++;
        continue;
      }
      if (conn.plugins.has(plugin.cmd)) {
        console.warn(color('[DUPL]', 'magenta'), `⚠️  Command "${plugin.cmd}" sudah ada. Plugin: ${shortName}`);
        skipped++;
        continue;
      }
      conn.plugins.set(plugin.cmd, plugin);
      if (plugin.alias && Array.isArray(plugin.alias)) {
        for (const alias of plugin.alias) conn.plugins.set(alias, plugin);
      }
      console.log(color('[PLUG]', 'cyan'), `✅  ${shortName}`);
      loaded++;
    } catch (error) {
      console.error(color('[EROR]', 'red'), `❎  ${shortName}`, error.message);
      failed++;
    }
  }

  console.log(color('[INFO]', 'yellow'), `🎯 ${loaded} aktif, ${skipped} dilewati, ${failed} gagal.`);

  return conn.plugins;
};

exports.bridge = (conn, m) => {
    if (!m) return m;
    let M = proto.WebMessageInfo;
    
    let senderJid = conn.decodeJid(m.fromMe && conn.user.id || m.participantAlt || m.key.participantAlt || m.key.remoteJidAlt);
    let senderLid = conn.decodeJid(m.fromMe && conn.user.id || m.participant || m.key.participant || m.key.remoteJid);

    if (m.key) {
        m.id = m.key.id;
        m.isBaileys = m.id.startsWith('BAE5') && m.id.length === 16;
        m.chat = m.key.remoteJid;
        m.fromMe = m.key.fromMe;
        m.isGroup = m.chat.endsWith('@g.us');
        m.senderJid = senderJid
        m.senderLid = senderLid
        m.sender = senderJid || senderLid
        if (m.isGroup) m.participant = conn.decodeJid(m.key.participant) || '';
    }

    if (m.message) {
        m.mtype = getContentType(m.message);
        m.msg = (m.mtype == 'viewOnceMessage' ? m.message[m.mtype].message[getContentType(m.message[m.mtype].message)] : m.message[m.mtype]);
        m.body = (
            m.mtype === "conversation" ? m.message.conversation :
            m.mtype === "imageMessage" ? m.message.imageMessage.caption :
            m.mtype === "videoMessage" ? m.message.videoMessage.caption :
            m.mtype === "extendedTextMessage" ? m.message.extendedTextMessage.text :
            m.mtype === "buttonsResponseMessage" ? m.message.buttonsResponseMessage.selectedButtonId :
            m.mtype === "listResponseMessage" ? m.message.listResponseMessage.singleSelectReply.selectedRowId :
            m.mtype === "templateButtonReplyMessage" ? m.message.templateButtonReplyMessage.selectedId :
            m.mtype === "interactiveResponseMessage" ? JSON.parse(m.msg.nativeFlowResponseMessage.paramsJson).id :
            m.mtype === "templateButtonReplyMessage" ? m.msg.selectedId :
            m.mtype === "messageContextInfo" ? m.message.buttonsResponseMessage?.selectedButtonId || m.message.listResponseMessage?.singleSelectReply.selectedRowId || m.text : "");
        m.text = m.body;
        m.pushName = m.pushName || m.name || '';

        let quoted = m.quoted = m.msg.contextInfo ? m.msg.contextInfo.quotedMessage : null;
        if (m.quoted) {
            let type = Object.keys(m.quoted)[0];
            m.quoted = m.quoted[type];
            if (['productMessage'].includes(type)) {
                type = Object.keys(m.quoted)[0];
                m.quoted = m.quoted[type];
            }
            if (typeof m.quoted === 'string') m.quoted = { text: m.quoted };
            
            m.quoted.mtype = type;
            m.quoted.id = m.msg.contextInfo.stanzaId;
            m.quoted.chat = m.msg.contextInfo.remoteJid || m.chat;
            m.quoted.isBaileys = m.quoted.id ? m.quoted.id.startsWith('BAE5') && m.quoted.id.length === 16 : false;
            m.quoted.sender = conn.decodeJid(m.msg.contextInfo.participant);
            m.quoted.fromMe = m.quoted.sender === conn.decodeJid(conn.user.id);
            m.quoted.text = m.quoted.text || m.quoted.caption || m.quoted.conversation || m.quoted.contentText || m.quoted.selectedDisplayText || m.quoted.title || '';
            m.quoted.mentionedJid = m.msg.contextInfo ? m.msg.contextInfo.mentionedJid : [];
            
            m.quoted.delete = () => conn.sendMessage(m.quoted.chat, { delete: m.quoted.key });
            m.quoted.copyNForward = (jid, forceForward = false, options = {}) => conn.copyNForward(jid, m.quoted.fakeObj, forceForward, options);
            m.quoted.download = () => conn.downloadMediaMessage(m.quoted);
            
            m.quoted.fakeObj = M.fromObject({
                key: { remoteJid: m.quoted.chat, fromMe: m.quoted.fromMe, id: m.quoted.id },
                message: quoted,
                ...(m.isGroup ? { participant: m.quoted.sender } : {})
            });
        }
    }

    m.reply = (text, chatId = m.chat, options = {}) => {
        return Buffer.isBuffer(text) 
            ? conn.sendMessage(chatId, { document: text, ...options }, { ...options })
            : conn.sendMessage(chatId, { text, ...options }, { ...options });
    };
    m.download = () => conn.downloadMediaMessage(m.msg);
    m.copy = () => M.fromObject(M.toObject(m));
    m.copyNForward = (jid = m.chat, forceForward = false, options = {}) => conn.copyNForward(jid, m, forceForward, options);

    return m;
};

exports.event = async (conn) => {
  conn.decodeJid = (jid) => {
    if (!jid) return jid;
    if (/:\d+@/gi.test(jid)) {
      const decoded = jidDecode(jid) || {};
      return decoded.user && decoded.server ? `${decoded.user}@${decoded.server}` : jid;
    }
    return jid;
  };

  conn.sendText = async (jid, text, quoted = '', options = {}) =>
    conn.sendMessage(jid, { text, ...options }, { quoted });

  conn.downloadMediaMessage = async (message) => {
    const mediaType = /image/.test(message.mimetype)
      ? 'image'
      : /video/.test(message.mimetype)
      ? 'video'
      : null;
    const stream = await downloadContentFromMessage(message, mediaType);
    let buffer = Buffer.from([]);
    for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
    return buffer;
  };

  conn.downloadAndSaveMediaMessage = async (message, filename, saveWithExt = true) => {
    const buffer = await conn.downloadMediaMessage(message);
    const fileType = await FileType.fromBuffer(buffer);
    const filepath = saveWithExt ? `${filename}.${fileType.ext}` : filename;
    fs.writeFileSync(filepath, buffer);
    return filepath;
  };

  conn.sendImageAsSticker = async (jid, image, quoted, stickerOptions = {}) => {
    let imageBuffer = Buffer.isBuffer(image)
      ? image
      : /^data:.*?\/.*?;base64,/i.test(image)
      ? Buffer.from(image.split(',')[1], 'base64')
      : /^https?:\/\//.test(image)
      ? await getBuffer(image)
      : fs.existsSync(image)
      ? fs.readFileSync(image)
      : Buffer.alloc(0);

    const stickerPath = stickerOptions.packname || stickerOptions.author
      ? await writeExifImg(imageBuffer, stickerOptions)
      : await writeExif(imageBuffer);

    await conn.sendMessage(jid, { sticker: { url: stickerPath } }, { quoted });
    return stickerPath;
  };

  conn.sendVideoAsSticker = async (jid, video, quoted, stickerOptions = {}) => {
    let videoBuffer = Buffer.isBuffer(video)
      ? video
      : /^data:.*?\/.*?;base64,/i.test(video)
      ? Buffer.from(video.split(',')[1], 'base64')
      : /^https?:\/\//.test(video)
      ? await getBuffer(video)
      : fs.existsSync(video)
      ? fs.readFileSync(video)
      : Buffer.alloc(0);

    const stickerPath = stickerOptions.packname || stickerOptions.author
      ? await writeExifVid(videoBuffer, stickerOptions)
      : await videoToWebp(videoBuffer);

    await conn.sendMessage(jid, { sticker: { url: stickerPath } }, { quoted });
    return stickerPath;
  };
  
  conn.albumMessage = async (jid, messages, quoted) => {
    const albumMessage = generateWAMessageFromContent(jid, {
      'messageContextInfo': {
        'messageSecret': crypto.randomBytes(32)
      },
      'albumMessage': {
        'expectedImageCount': messages.filter(msg => msg.hasOwnProperty('image')).length,
        'expectedVideoCount': messages.filter(msg => msg.hasOwnProperty("video")).length
      }
    }, {
      'userJid': conn.user.jid,
      'quoted': quoted,
      'upload': conn.waUploadToServer
    });
    await conn.relayMessage(jid, albumMessage.message, {
      'messageId': albumMessage.key.id
    });
    for (let msg of messages) {
      const waMessage = await generateWAMessage(jid, msg, {
        'upload': conn.waUploadToServer
      });
      waMessage.message.messageContextInfo = {
        'messageSecret': crypto.randomBytes(32),
        'messageAssociation': {
          'associationType': 1,
          'parentMessageKey': albumMessage.key
        },
        'participant': "0@s.whatsapp.net",
        'remoteJid': "status@broadcast",
        'forwardingScore': 99999,
        'isForwarded': true,
        'mentionedJid': [jid],
        'starred': true,
        'labels': ['Y', "Important"],
        'isHighlighted': true,
        'businessMessageForwardInfo': {
          'businessOwnerJid': jid
        },
        'dataSharingContext': {
          'showMmDisclosure': true
        }
      };
      waMessage.message.forwardedNewsletterMessageInfo = {
        'newsletterJid': "0@newsletter",
        'serverMessageId': 1,
        'newsletterName': "WhatsApp",
        'contentType': 1,
        'timestamp': new Date().toISOString(),
        'senderName': "✧ Dittsans",
        'content': "Text Message",
        'priority': "high",
        'status': "sent"
      };
      waMessage.message.disappearingMode = {
        'initiator': 3,
        'trigger': 4,
        'initiatorDeviceJid': jid,
        'initiatedByExternalService': true,
        'initiatedByUserDevice': true,
        'initiatedBySystem': true,
        'initiatedByServer': true,
        'initiatedByAdmin': true,
        'initiatedByUser': true,
        'initiatedByApp': true,
        'initiatedByBot': true,
        'initiatedByMe': true
      };
      await conn.relayMessage(jid, waMessage.message, {
        'messageId': waMessage.key.id,
        'quoted': {
          'key': {
            'remoteJid': albumMessage.key.remoteJid,
            'id': albumMessage.key.id,
            'fromMe': true,
            'participant': conn.user.jid
          },
          'message': albumMessage.message
        }
      });
    }
    return albumMessage;
  };

  return conn;
}