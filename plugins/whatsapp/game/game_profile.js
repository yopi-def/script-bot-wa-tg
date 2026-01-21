let handler = async (conn, { m, sender }) => {
  let targetId = m.quoted ? m.quoted.sender : m.senderLid
  const profile = await db.func("game").formatUserProfile(targetId)
  await m.reply(profile);
};

handler.cmd = "gprofile";
handler.alias = ["gp", "mystats", "gamestats"];
handler.tags = ["game"];
handler.desc = "Lihat profile game kamu atau orang lain (reply pesan)";

module.exports = handler;