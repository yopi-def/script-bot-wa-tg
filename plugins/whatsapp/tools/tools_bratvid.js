const fs = require("fs");
const path = require("path");
const axios = require("axios");
const { exec } = require("child_process");

let handler = async (conn, { m, args, pmd }) => {
  try {
    if (!args.length) {
      return m.reply(
        `*Format:*\n> ${pmd} Halo dunia brat style\n\n` +
        `💡 Mode kecepatan:\n` +
        `> ${pmd} slow Halo dunia\n` +
        `> ${pmd} fast Halo dunia`);
    }

    let speed = 0.5;
    const first = args[0]?.toLowerCase();

    if (first === "slow") {
      speed = 1.0;
      args.shift();
    } else if (first === "fast") {
      speed = 0.3;
      args.shift();
    }

    const text = args.join(" ");
    if (!text) return m.reply("⚠️ Teks tidak boleh kosong.");
    if (text.length > 250) return m.reply("⚠️ Maksimal 250 karakter.");
    const words = text.split(/\s+/);
    const tempDir = path.join(process.cwd(), "database/media/brat");
    fs.mkdirSync(tempDir, { recursive: true });

    const framePaths = await Promise.all(
      words.map(async (_, i) => {
        const currentText = words.slice(0, i + 1).join(" ");
        const url = `https://aqul-brat.hf.space/?text=${encodeURIComponent(currentText)}`;
        const res = await axios.get(url, {
          responseType: "arraybuffer",
          timeout: 15000
        });
        const framePath = path.join(tempDir, `frame_${i}.mp4`);
        await fs.promises.writeFile(framePath, res.data);
        return framePath;
      })
    );

    const lastFrame = framePaths[framePaths.length - 1];
    const fileListContent = [
      ...framePaths.map((file) => (
        `file '${file}'\nduration ${speed}`
      )),
      `file '${lastFrame}'`,
      `duration 1.5`
    ].join("\n");

    const fileListPath = path.join(tempDir, "filelist.txt");
    await fs.promises.writeFile(fileListPath, fileListContent);
    const outputVideo = path.join(tempDir, "brat_output.mp4");
    await new Promise((resolve, reject) => {
      exec(
        `ffmpeg -y -f concat -safe 0 -i "${fileListPath}" ` +
        `-vsync vfr ` +
        `-vf "fps=30,scale=512:512:force_original_aspect_ratio=decrease,format=yuv420p" ` +
        `-movflags +faststart -preset ultrafast "${outputVideo}"`,
        (err) => err ? reject(err) : resolve()
      );
    });

    await conn.sendImageAsSticker(m.chat, outputVideo, m, {
      packname: db.cg().get("whatsapp.sticker").p,
      author: db.cg().get("whatsapp.sticker").a
    });

    for (const f of [...framePaths, fileListPath, outputVideo]) {
      if (fs.existsSync(f)) fs.unlinkSync(f);
    }
  } catch (err) {
    console.error("[BRAT VIDEO ERROR]", err);
    m.reply("⚠️ Gagal membuat stiker video brat.");
  }
};

handler.cmd = "bratvid";
handler.alias = ["bratv", "bratvideo"];
handler.tags = ["tools"];
handler.desc = "Membuat stiker video brat dengan hold frame akhir 1.5 detik.";

module.exports = handler;