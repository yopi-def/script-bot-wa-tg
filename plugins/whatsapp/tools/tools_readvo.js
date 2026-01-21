const { downloadContentFromMessage } = require('@fhynella/baileys');


let handler = async (conn, { m, from }) => {

    if (!m.quoted) return m.reply('Reply pesan sekali lihat yang ingin dibuka!');
    const msg = m.quoted.message?.imageMessage || m.quoted.message?.videoMessage || m.quoted.message?.audioMessage || m.quoted;
    if (!msg.viewOnce && m.quoted.mtype !== 'viewOnceMessageV2') {
      return m.reply('Pesan tersebut bukan sekali lihat!');
    }

    try {
      const mediaType = /image/.test(msg.mimetype) ? 'image' : /video/.test(msg.mimetype) ? 'video' : /audio/.test(msg.mimetype) ? 'audio' : null;
      if (!mediaType) return m.reply('Tipe media tidak didukung!');
      const media = await downloadContentFromMessage(msg, mediaType);
      let buffer = Buffer.from([]);
      for await (const chunk of media) {
        buffer = Buffer.concat([buffer, chunk]);
      }

      let message;

      if (mediaType === 'image') {
        message = { image: buffer, caption: msg.caption || '' };
      } else if (mediaType === 'video') {
        message = { video: buffer, caption: msg.caption || '' };
      } else if (mediaType === 'audio') {
        message = { audio: buffer, mimetype: 'audio/ogg; codecs=opus', ptt: false };
      }

      const pesan = await conn.sendMessage(m.sender, message);
      await conn.sendMessage(from, { react: { text: "✅", key: pesan.key } });
      await conn.sendMessage(from, { react: { text: "✅", key: m.key } });
    } catch (error) {
      console.error('[readvo] Gagal memproses pesan viewOnce:', error);
    }
}

handler.cmd = 'readvo'
handler.alias = ['see', 'buka']
handler.tags = ['owner', "tools"]
handler.desc = 'Membaca pesan sekali lihat'

module.exports = handler