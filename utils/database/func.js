const fs = require("fs");
const path = require("path");

const moduleRegistry = {};

/**
 * Fungsi utama untuk mengakses Modul JavaScript yang diekspor (export).
 * @param {string} moduleId - Nama file module (misalnya 'pterodactyl').
 * @returns {any} Export dari module JS yang diminta.
 */
module.exports = function func(moduleId) {
    if (!moduleId || typeof moduleId !== 'string' || moduleId.trim() === "") {
        try {
            if (!fs.existsSync("./utils/others")) {
                return [];
            }
            const files = fs.readdirSync("./utils/others");
            const moduleList = files
                .filter(file => file.endsWith('.js'))
                .map(file => file.replace('.js', ''));
            return moduleList;
        } catch (error) {
            return [];
        }
    }

    if (typeof moduleId !== 'string' || moduleId.trim() === "") {
        throw new Error("[Module Manager] Module ID tidak boleh kosong.");
    }
    if (moduleRegistry[moduleId]) {
        return moduleRegistry[moduleId];
    }
    const modulePath = path.join(process.cwd(), "utils/others", moduleId);
    try {
        const moduleContent = require(modulePath);
        moduleRegistry[moduleId] = moduleContent;
        return moduleContent;
    } catch (error) {
        console.error(`[Module Manager] Gagal memuat module "${moduleId}":`, error.message);
        throw new Error(`Module JS tidak ditemukan atau error di: ${moduleId}.js. Pastikan file ada di folder utils/others/.`);
    }
};
