let handler = async (conn, { m, text, pmd }) => {
    try {
        if (!text) return m.reply(`*Format:*\n> ${pmd} https://whatsapp.com/channel/xxx`);
        if (!text.includes("https://whatsapp.com/channel/")) return m.reply("Link channel tidak valid");
        let idInvite = text.split("https://whatsapp.com/channel/")[1].trim();
        let res = await conn.newsletterMetadata("invite", idInvite);
        if (!res || !res.id)
            return m.reply("Gagal mengambil ID channel.");
        return m.reply(res.id);
    } catch (err) {
        console.error('[cekidch Error]', err);
        return m.reply("Terjadi kesalahan saat mengambil ID channel");
    }
};

handler.cmd = 'cekidch';
handler.alias = ['cekidch', 'idch'];
handler.tags = ['tools'];

module.exports = handler;