const more = String.fromCharCode(8206)
const readmore = more.repeat(4001)

let handler = async (conn, { m, from, args, pmd }) => {
  const text = q = args.join(" ");
  if (!q) return m.reply(`*Format:*\n> ${pmd} _<teks>|<teks>_`);
  let [l, r] = text.split`|`
  if (!l) l = ''
  if (!r) r = ''
  m.reply(l + readmore + r)
}

handler.cmd = 'readmore'
handler.alias = ['selengkapnya', 'rm']
handler.tags = ['tools']
handler.desc = 'membuat pesan baca selengkapnya'

module.exports = handler