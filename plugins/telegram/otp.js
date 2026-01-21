module.exports = (bot) => {
  const fs = require("fs");
  const path = require("path");

  const OTP_PATH = path.join(process.cwd(), "database/others/tg_otp.json");
  const INPUT_PATH = path.join(process.cwd(), "database/others/tg_input.json");

  /* ===================== DB HELPER ===================== */
  const load = file => {
    if (!fs.existsSync(file)) fs.writeFileSync(file, "{}");
    return JSON.parse(fs.readFileSync(file));
  };
  const save = (file, data) => fs.writeFileSync(file, JSON.stringify(data, null, 2));

  /* ===================== UTIL ===================== */
  const nowTag = () => {
    const d = new Date();
    return [
      d.getDate(),
      d.getMonth() + 1,
      d.getHours(),
      d.getMinutes(),
      d.getSeconds()
    ].map(v => String(v).padStart(2, "0")).join("");
  };

  const waExists = async jid => {
    try {
      const r = await conn.onWhatsApp(jid);
      return r[0] || { exists: false, jid, lid: "" };
    } catch {
      return { exists: false, jid, lid: "" };
    }
  };

  const keypad = (phone, cur = "") => ({
    text:
      `🔐 Verifikasi OTP WhatsApp\n\n` +
      `📱 Nomor: \`+${phone}\`\n` +
      `🔑 OTP:  \`${cur.padEnd(4, "••").split("").join(" ")}\`\n\n` +
      `Masukkan kode OTP.`,
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        ["1","2","3"],
        ["4","5","6"],
        ["7","8","9"],
        ["ok","0","del"]
      ].map(r =>
        r.map(v => ({
          text: v.toUpperCase(),
          callback_data: `otp_key:${v}`
        }))
      )
    }
  });

  /* ===================== /OTP /UNREGISTER COMMAND ===================== */
  bot.command("unregister", async ctx => {
    const ses = db.data.findByTelegramId(ctx.from.id)
    if (!ses) return ctx.reply("ℹ️ Kamu belum terdaftar");
    if (db.users[ses.senderLid].exists()) {
      db.users[ses.senderLid].updatePath("telegram", "")
      ctx.reply("✅ Kamu berhasil melakukan unregister.");
    }
  })

  bot.command("otp", async ctx => {
    const phone = (ctx.message.text.split(" ")[1] || "").replace(/\D/g, "");
    const wa = await waExists(phone);
    const whatsapp = db.data.findByTelegramId(ctx.from.id)

    if (whatsapp)
      return ctx.reply(`ℹ️ Telegram kamu sudah terdaftar dan terkait\n      dengan WhatsApp: \`+${whatsapp.phone}\`\n      Klik /unregister untuk /otp ulang`, { parse_mode: "Markdown" });
    if (!phone)
      return ctx.reply("Cara pakai:\n/otp 628xxxx");
    if (!stateWhatsApp)
      return ctx.reply("ℹ️ Sistem WhatsApp sedang offline.");
    if (!wa.exists)
      return ctx.reply("ℹ️ Nomor WhatsApp tidak aktif.");

    const otp = String(Math.floor(1000 + Math.random() * 9000));
    const otpDB = load(OTP_PATH);
    const inputDB = load(INPUT_PATH);

    otpDB[phone] = {
      otp,
      exp: Date.now() + 5 * 60 * 1000,
      tg: ctx.chat.id
    };

    inputDB[ctx.chat.id] = {
      tgid: ctx.from.id,
      phone,
      senderJid: phone + "@s.whatsapp.net",
      senderLid: wa.lid || "",
      current: ""
    };

    save(OTP_PATH, otpDB);
    save(INPUT_PATH, inputDB);

    try {
      await conn.sendMessage(phone + "@s.whatsapp.net", {
        text: `🔐 Kode OTP kamu: *${otp}*\nBerlaku 5 menit`
      });
    } catch {
      return ctx.reply("❌ Gagal mengirim OTP ke WhatsApp.");
    }

    const ui = keypad(phone);
    return ctx.reply(ui.text, ui);
  });


  /* ===================== OTP KEYPAD ===================== */
  bot.callbackQuery(/^otp_key:/, async ctx => {
    const key = ctx.callbackQuery.data.split(":")[1];
    const chatId = ctx.chat.id;

    const otpDB = load(OTP_PATH);
    const inputDB = load(INPUT_PATH);
    const ses = inputDB[chatId];

    if (!ses)
      return ctx.answerCallbackQuery({ text: "Sesi OTP tidak ada." });

    let cur = ses.current || "";
    const otpInfo = otpDB[ses.phone];
    if (!otpInfo)
      return ctx.answerCallbackQuery({ text: "OTP expired." });

    if (/^\d$/.test(key) && cur.length < 4) cur += key;
    if (key === "del") cur = cur.slice(0, -1);

    if (key === "ok") {
      if (cur !== otpInfo.otp)
        cur = "";

      else {
        delete otpDB[ses.phone];
        delete inputDB[chatId];
        save(OTP_PATH, otpDB);
        save(INPUT_PATH, inputDB);

        const uname = `user${nowTag()}`;
        const item = db.data.item(uname, ses.senderLid, {
          phone: ses.phone,
          senderJid: ses.senderJid,
          telegram: ses.tgid
        });
        
        await (!db.users[ses.senderLid].exists())
          ? db.users[ses.senderLid].ensure(db.data.item(uname, ses.senderLid, item))
          : db.users[ses.senderLid].updatePath("telegram", ses.tgid)
          
        const user = await db.users[ses.senderLid].get()
        await ctx.editMessageText(
          `✅ *Verifikasi Berhasil!*\n\n` +
          `👤 *Username:* ` +
          `\`${user.username}\`\n` +
          `📱 *WhatsApp:* ` +
          `\`+${user.phone}\`\n\n` +
          `Akun Telegram kamu sekarang sudah terhubung dan siap digunakan.`,
        { parse_mode: "Markdown" });

        return ctx.answerCallbackQuery({ text: "OTP benar!" });
      }
    }

    ses.current = cur;
    save(INPUT_PATH, inputDB);

    const ui = keypad(ses.phone, cur);
    await ctx.editMessageText(ui.text, ui);
    ctx.answerCallbackQuery();
  });
};