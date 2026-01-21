const QRCode = require('qrcode');

let handler = async (conn, { m, from, args, pmd }) => {

        const text = args.join(' ');
        if (!text) {
            await m.reply(`*Format:*\n> ${pmd} https://github.com\n> ${pmd} Akan ada masa indah`);
            return;
        }
        try {
            const buffer = await QRCode.toBuffer(text, {
                errorCorrectionLevel: 'H',
                type: 'png',
                quality: 0.92,
                margin: 1,
                color: {
                    dark: '#000000', // Warna dot
                    light: '#FFFFFF'  // Warna background
                },
                width: 256 * 4 // Lebar QR Code dalam pixel
            });

            await conn.sendMessage(from, { image: buffer, caption: `"${text}"` });

        } catch (error) {
            console.error('[QR Code Error]', error);
        }
}

handler.cmd = 'qrcode'
handler.alias = ['qr']
handler.tags = ['tools']
handler.desc = 'Membuat QR Code dari teks atau URL'

module.exports = handler