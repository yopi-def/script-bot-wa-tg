const FormData = require('form-data');
const { fromBuffer } = require('file-type');

async function uploadCatbox(buffer) {
    const fetchModule = await import("node-fetch");
    const fetch = fetchModule.default;
    let { ext } = await fromBuffer(buffer);
    let form = new FormData();
    form.append("fileToUpload", buffer, "file." + ext);
    form.append("reqtype", "fileupload");
    let res = await fetch("https://catbox.moe/user/api.php", {
        method: "POST",
        body: form,
    });
    return await res.text();
}

let handler = async (conn, { m, args, pmd }) => {
    try {

        const quoted = m.quoted ? m.quoted : m;
        const mime = (quoted.msg || quoted).mimetype || "";

        if (!/image|video|audio|application/.test(mime)) {
            return m.reply(`Media tidak ditemukan!\nKetik *${pmd}* dengan reply/kirim media`);
        }

        let buffer = m.quoted ? await quoted.download() : await m.download();
        let url = await uploadCatbox(buffer);
        await m.reply(url);
    } catch (e) {
        console.error("[Tourl Error]", e);
        m.reply("Terjadi error saat upload media.");
    }
};

handler.cmd = "tourl";
handler.tags = ["tools"];
handler.desc = "Membuat URL dari media";

module.exports = handler;