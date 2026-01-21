let handler = async (conn, { m, from, sender, args, isOwner, isPremium, isReseller, botNumber, plugins, Prx, prefix, command, func, pmd, quoted, text }) => {
m.reply("Example")
}

handler.cmd = "example";
handler.alias = ["ex"];
handler.tags = ["info"];
handler.desc = "example";

handler.isReseller = false
handler.isOwner = false

module.exports = handler;