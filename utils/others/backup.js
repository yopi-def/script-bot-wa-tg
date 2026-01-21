const fs = require("fs");
const path = require("path");
const chalk = require("chalk");
const axios = require("axios");
const moment = require("moment-timezone");
const db = require("../database");

const now = moment().tz("Asia/Jakarta");
const formatted = now.format("dddd, DD/MM/YYYY HH:mm");

const GITHUB_OWNER = db.cg().get("backup.github").username;
const GITHUB_REPO = db.cg().get("backup.github").repositories;
const GITHUB_TOKEN = db.cg().get("backup.github").github_token;

const API_BASE = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents`;

// ==============================
// GET SHA IF FILE EXISTS
// ==============================
async function getSha(repoPath) {
  try {
    const url = `${API_BASE}/${repoPath}`;
    const res = await axios.get(url, {
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`,
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });
    return res.data.sha;
  } catch (err) {
    console.error(err.response?.data || err);
    return null;
  }
}

// ==============================
// CREATE FOLDER (if not exists)
// ==============================
async function ensureFolder(folderPath) {
  const parts = folderPath.split("/");

  let currentPath = "";
  for (const part of parts) {
    currentPath = currentPath ? `${currentPath}/${part}` : part;

    try {
      await axios.get(`${API_BASE}/${currentPath}`, {
        headers: { Authorization: `token ${GITHUB_TOKEN}` },
      });
    } catch (err) {
      await axios.put(
        `${API_BASE}/${currentPath}/.keep`,
        {
          message: `Create folder ${currentPath}`,
          content: Buffer.from("").toString("base64"),
        },
        {
          headers: { Authorization: `token ${GITHUB_TOKEN}` },
        }
      );
    }
  }
}

// ==============================
// BACKUP SINGLE FILE
// ==============================
async function backupFile(localFile, repoPath) {
  try {
    const content = fs.readFileSync(localFile);
    const encoded = Buffer.from(content).toString("base64");

    const folder = path.dirname(repoPath);
    if (folder !== ".") {
      await ensureFolder(folder);
    }

    const sha = await getSha(repoPath);

    await axios.put(
      `${API_BASE}/${repoPath}`,
      {
        message: `Backup update: ${formatted}`,
        content: encoded,
        sha: sha || undefined,
        committer: {
          name: "Backup Bot",
          email: "bot@backup.com",
        },
        author: {
          name: "Backup Bot",
          email: "bot@backup.com",
        },
      },
      {
        headers: {
          Authorization: `token ${GITHUB_TOKEN}`,
          "X-GitHub-Api-Version": "2022-11-28",
        },
      }
    );

    console.log(chalk.yellowBright(`[INFO] 📤 Mengunggah`), localFile);
    return true;
  } catch (err) {
    return false;
  }
}

// ==============================
// RESTORE FILE
// ==============================
async function restoreFile(repoPath, localFile) {
  try {
    const res = await axios.get(`${API_BASE}/${repoPath}`, {
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`,
        "X-GGitHub-Api-Version": "2022-11-28",
      },
    });

    const data = Buffer.from(res.data.content, "base64").toString();
    fs.writeFileSync(localFile, data);
    console.log(chalk.yellowBright(`[INFO] 📥 Memulihkan`), localFile);
    return true;
  } catch {
    return false;
  }
}

// ==============================
// MULTI
// ==============================
async function backupMultiple(files = []) {
  for (const f of files) await backupFile(f.local, f.repo);
}

async function restoreMultiple(files = []) {
  for (const f of files) await restoreFile(f.repo, f.local);
}

async function checkRateLimit() {
  const res = await axios.get("https://api.github.com/rate_limit", {
    headers: { Authorization: `Bearer ${db.cg().get("backup.github").github_token}` }
  });

  const core = res.data.resources.core;

  const total = core.limit;
  const used = core.used;
  const remaining = core.remaining;
  const resetEpoch = core.reset;

  // hitungan
  const usedPercent = ((used / total) * 100).toFixed(2);
  const remainingPercent = ((remaining / total) * 100).toFixed(2);

  // waktu reset
  const resetTime = moment.unix(resetEpoch).tz("Asia/Jakarta").format("HH:mm:ss");

  const nowEpoch = Math.floor(Date.now() / 1000);
  const diffSeconds = resetEpoch - nowEpoch;
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = (diffMinutes / 60).toFixed(2);

  // versi teks siap dibaca
  const text = `
📊 **GitHub Rate Limit Report**
━━━━━━━━━━━━━━━━━━━━━━
🔹 Total Limit: ${total}
🔹 Used: ${used} (${usedPercent}%)
🔹 Remaining: ${remaining} (${remainingPercent}%)

⏳ **Reset Info**
🔹 Reset Time: ${resetTime}
🔹 Sisa waktu reset ${diffMinutes} menit

━━━━━━━━━━━━━━━━━━━━━━
`;

  return { total, used, remaining, resetTime, diffSeconds, diffMinutes, diffHours, text };
}

module.exports = {
  backupMultiple,
  restoreMultiple,
  checkRateLimit
};