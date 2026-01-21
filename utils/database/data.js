const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require('uuid')
const moment = require('moment-timezone')

function readJSON(dir, file) {
  const full = path.join(process.cwd(), "database", dir, `${file}.json`);
  if (!fs.existsSync(full)) return [];
  try {
    return JSON.parse(fs.readFileSync(full));
  } catch {
    return [];
  }
}

function generateDateCode() {
    const now = new Date();
    const tgl = String(now.getDate()).padStart(2, '0');       // DD
    const bln = String(now.getMonth() + 1).padStart(2, '0');  // MM
    const thn = String(now.getFullYear()).slice(-2);          // YY
    const uniqueCode = Math.floor(100 + Math.random() * 900); // 3 digit random
    return `${tgl}${bln}${thn}${uniqueCode}`;
}

function formatDate(idTimezone = "Asia/Jakarta") {
  const s = moment().tz(idTimezone).locale('id').format('dddd, DD-MM-YYYY')
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function normalizeJid(jid = "") {
  return jid.replace(/[^0-9A-Za-z@.\-_]/g, "").trim();
}

function normalizePhone(phone = "") {
  return phone.replace(/[^0-9]/g, "").trim();
}

const data = {
  readAll() { 
    return readJSON("options", "users");
  },

  // ======================================================
  // 🔍 CARI BERDASARKAN senderJid / senderLid
  // ======================================================
  findBySender(senderJid) {
    if (!senderJid) return null;
    const list = this.readAll();
    const normalized = normalizeJid(senderJid);
    return (
      list.find(
        (u) =>
          normalizeJid(u.senderJid) === normalized ||
          normalizeJid(u.senderLid) === normalized
      ) || null
    );
  },

  // ======================================================
  // 🔍 CARI BERDASARKAN username
  // ======================================================
  findByUser(username) {
    if (!username) return null;
    const list = this.readAll();
    return list.find((u) => u.username === username) || null;
  },

  // ======================================================
  // 🔍 CARI BERDASARKAN nomor HP
  // ======================================================
  findByPhone(phone) {
    if (!phone) return null;
    const list = this.readAll();
    const normalized = normalizePhone(phone);
    return (list.find((u) => normalizePhone(u.phone || "") === normalized) || null );
  },

  // ======================================================
  // 🔍 CARI BERDASARKAN UUID
  // ======================================================
  findByUuid(uuid) {
    if (!uuid) return null;
    const list = this.readAll();
    return list.find((u) => u.uuid === uuid) || null;
  },

  findByTelegramId(tid) {
    if (!tid) return null;
    const list = this.readAll();
    const normalized = String(tid).replace(/[^0-9]/g, "").trim();
    return (list.find((u) => String(u.telegram || "").trim() === normalized) || null );
  },

  item(username, senderLid, {
    timezone = "Asia/Jakarta",
    senderJid = "",
    phone = "",
    telegram = ""
  } = {}) {

    return {
      uuid: generateDateCode(),
      username,
      phone,
      senderJid,
      senderLid,
      telegram,
      
      isReseller: false,
      isOwner: false,

      saldo: 0,
      usePrefix: true,
      isBanned: false,

      create: formatDate(timezone),
    };
  },
};


module.exports = data;