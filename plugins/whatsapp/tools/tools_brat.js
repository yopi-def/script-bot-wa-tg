const fetch = require("node-fetch");

let handler = async (conn, { m, from, text, pmd }) => {
  try {
    if (!text) return m.reply(`*Format:*\n> ${pmd} aku suka brat`);
    if (text.length > 250) return m.reply(`⚠️ Karakter terlalu panjang! Max 250 ya 😵‍💫`);
    await conn.sendMessage(m.chat, {react: { text: "⌛", key: m.key }})
    const res = await fetch(`https://aqul-brat.hf.space/?text=${encodeURIComponent(text)}`);
    if (!res.ok) {
    conn.sendMessage(m.chat, {react: { text: "❌", key: m.key }})
    return m.reply("❌ Gagal mengambil data dari server brat.");
    }
    const buffer = await res.buffer();
    await conn.sendImageAsSticker(from, buffer, m, {
      packname: db.cg().get("whatsapp.sticker").p,
      author: db.cg().get("whatsapp.sticker").a,
    });
    await conn.sendMessage(m.chat, {react: { text: "✅", key: m.key }})
  } catch (error) {
    console.error("[Brat Error]", error);
    conn.sendMessage(m.chat, {react: { text: "❌", key: m.key }})
    m.reply("⚠️ Terjadi kesalahan saat membuat stiker brat.");
  }
};

handler.cmd = "brat";
handler.tags = ["tools"];
handler.desc = "Buat stiker brat dari teks";

module.exports = handler;