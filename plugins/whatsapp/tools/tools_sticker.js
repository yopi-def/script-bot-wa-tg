let handler = async (conn, { m, from, args, pmd }) => {
  try {
      const quoted = m.quoted || m;
      const mime = (quoted.msg || quoted).mimetype || "";
      let [packname, author] = args.join(' ').split(',').map(str => str?.trim() || "");
      if (!packname) packname = db.cg().get("whatsapp.sticker").p
      if (!author) author = db.cg().get("whatsapp.sticker").a
      if (/image/.test(mime)) {
          const media = await quoted.download();
          await conn.sendImageAsSticker(from, media, m, { packname, author });
      } else if (/video/.test(mime)) {
          if ((quoted.msg || quoted).seconds > 8) {
              return await m.reply('Durasi video maksimal 8 detik!');
          }
          const media = await quoted.download();
          await conn.sendVideoAsSticker(from, media, m, { packname, author });
      } else {
          return await m.reply(`Balas gambar atau video dengan caption *${pmd}*`);
      }
  } catch (error) {
      console.error('[Sticker Error]', error);
  }
}

handler.cmd = 'sticker'
handler.alias = ['s']
handler.tags = ['tools']
handler.desc = 'Membuat stiker dari gambar atau video'

module.exports = handler