const fs = require('fs');
const axios = require('axios');
const chalk = require("chalk");
const jimp = require("jimp")
const util = require("util");


module.exports = async (conn, m, values) => {
try {
//====================================0

    const { botNumber, isOwner } = values
    const body = m.body
    const sender = m.key.fromMe ? conn.user.id.split(":")[0] + "@s.whatsapp.net" || conn.user.id : m.key.participant || m.key.remoteJid;
    
    const senderNumber = sender.split('@')[0];
    const budy = (typeof m.text === 'string' ? m.text : '');

    const prefixRegex = /^[°zZ#$@*+,.?=''():√%!¢£¥€π¤ΠΦ_&><`™©®Δ^βα~¦|/\\©^]/;
    const prefix = prefixRegex.test(body) ? body.match(prefixRegex)[0] : `${values.prefix}`;
    const from = m.key.remoteJid;
    const isGroup = from.endsWith("@g.us");
    const isPrivate = from.endsWith("@s.whatsapp.net");

    const isCmd = body.startsWith(prefix || "" || ".");
    const command = isCmd ? body.slice(prefix.length).trim().split(' ').shift().toLowerCase() : '';
    const args = body.trim().split(/ +/).slice(1);

    const pushname = m.pushName || "No Name";
    const text = q = args.join(" ");
    const quoted = m.quoted ? m.quoted : m;
    const mime = (quoted.msg || quoted).mimetype || '';
    const qmsg = (quoted.msg || quoted);
    const isMedia = /image|video|sticker|audio/.test(mime);

    const groupMetadata = isGroup ? await conn.groupMetadata(m.chat).catch((e) => {}) : "";
    const groupOwner = isGroup ? groupMetadata.owner : "";
    const groupName = isGroup ? groupMetadata.subject : "";
    const participants = isGroup ? await groupMetadata.participants : "";
    const groupAdmins = isGroup ? await participants.filter((v) => v.admin !== null).map((v) => v.id) : "";
    const groupMembers = isGroup ? groupMetadata.participants : "";
    const isGroupAdmins = isGroup ? groupAdmins.includes(m.sender) : false;
    const isBotGroupAdmins = isGroup ? groupAdmins.includes(botNumber) : false;
    const isBotAdmins = isGroup ? groupAdmins.includes(botNumber) : false;
    const isAdmins = isGroup ? groupAdmins.includes(m.sender) : false;
    
    

switch (command) {

case 'idku':
    await conn.sendMessage(from, { text: m.sender });
break;

default:


if (budy.startsWith('<')) {
    if (!isOwner) return;
    const vies = await conn.sendMessage(from, { text: '🔄 Tunggu sebentar...' }, { quoted: m });
    try {
        let evaled = await eval(budy.slice(2));
        if (typeof evaled !== 'string') evaled = require('util').inspect(evaled);
        await conn.sendMessage(from, { text: evaled, edit: vies.key });
    } catch (err) {
        await conn.sendMessage(from, { text: String(err), edit: vies.key }); 
    }
}
        
if (budy.startsWith('=')) {
    if (!isOwner) return
    const vie = await conn.sendMessage(from, { text: '🔄 Tunggu sebentar...' }, { quoted: m });
    let kode = budy.trim().split(/ +/)[0]
    let teks
    try {
        teks = await eval(`(async () => { ${kode == ">>" ? "return" : ""} ${q}})()`)
    } catch (e) {
        teks = e
    } finally {
        await conn.sendMessage(from, { text: require('util').format(teks), edit: vie.key });
    }
}


return;

}} catch (err) {
    console.log(require("util").format(err));
}};