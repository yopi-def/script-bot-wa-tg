const fs = require("fs");
const path = require("path");

// ===================================================================
// 1. FILE HANDLER (I/O Disk)
// ===================================================================
const file = {
  ensureDir(dir) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  },

  read(dir, fileId) {
    const fullDir = path.join(process.cwd(), dir);
    const fullPath = path.join(fullDir, fileId + ".json");

    this.ensureDir(fullDir);
    if (!fs.existsSync(fullPath)) return null;

    try {
      return JSON.parse(fs.readFileSync(fullPath));
    } catch (e) {
      console.error(`[Config] File corrupt (${fileId}.json), using defaults.`);
      return null;
    }
  },

  write(dir, fileId, data) {
    const fullDir = path.join(process.cwd(), dir);
    const fullPath = path.join(fullDir, fileId + ".json");
    this.ensureDir(fullDir);
    fs.writeFileSync(fullPath, JSON.stringify(data, null, 2));
  }
};

// ===================================================================
// 2. CACHE HANDLER (Penyimpanan Sementara di Memori)
// ===================================================================
const cache = {
  store: {},
  get(id) { return this.store[id] ? this.store[id].data : null },
  set(id, data) { this.store[id] = { data, time: Date.now() }},
  delete(id) { delete this.store[id] }
};


// ===================================================================
// 3. PATH PARSER (Mendukung notasi dot dan array)
// ===================================================================
function parsePath(pathStr) {
  return pathStr
    .replace(/\]/g, "")
    .split(/\[|\./)
    .filter(Boolean);
}

function getByPath(obj, pathStr) {
  let parts = parsePath(pathStr);
  return parts.reduce((o, k) => (o || {})[k], obj);
}

function setByPath(obj, pathStr, value) {
  let parts = parsePath(pathStr);
  let cursor = obj;

  while (parts.length > 1) {
    let key = parts.shift();

    if (!cursor[key] || typeof cursor[key] !== "object") {
      // Jika kunci belum ada, cek apakah kunci berikutnya adalah angka -> buat Array
      cursor[key] = /^\d+$/.test(parts[0]) ? [] : {};
    }
    
    cursor = cursor[key];
  }

  cursor[parts[0]] = value;
  return obj;
}

function deleteByPath(obj, pathStr) {
  let parts = parsePath(pathStr);
  let cursor = obj;

  while (parts.length > 1) {
    let key = parts.shift();
    if (!cursor[key]) return obj;
    cursor = cursor[key];
  }

  delete cursor[parts[0]];
  return obj;
}

// ===================================================================
// 4. AUTO RELOAD (Memonitor Perubahan Berkas)
// ===================================================================
function watchFile(dir, fileId, onChange) {
  const fullPath = path.join(process.cwd(), dir, fileId + ".json");

  if (fs.existsSync(fullPath)) {
    fs.watch(fullPath, { persistent: false }, () => {
      onChange();
    });
  }
}

// ===================================================================
// 5. CONFIG FACTORY (Pembuat API Konfigurasi)
// ===================================================================
function createConfig(dir, fileId, schema = null) {
  const cacheId = `${dir}/${fileId}`;

  function load() {
    let cached = cache.get(cacheId);
    if (cached) return cached;

    let data = file.read(dir, fileId) || {}; 

    cache.set(cacheId, data);
    return data;
  }

  function save(data) {
    cache.set(cacheId, data);
    file.write(dir, fileId, data);
    return data;
  }

  watchFile(dir, fileId, () => {
    console.log(`[Config] Reloaded: ${fileId}.json`);
    cache.delete(cacheId);
  });

  // RETURN API
  return function dbAPI() { // Nama fungsi API diubah menjadi dbAPI
    return {
      get(path = null) {
        return path ? getByPath(load(), path) : load();
      },

      set(path, value) {
        let data = load();
        if (schema && !schema(path, value)) {
          console.log(`[Config] Blocked invalid value for: ${path}`);
          return;
        }
        save(setByPath(data, path, value));
      },

      edit(path, fn) {
        let data = load();
        let oldValue = getByPath(data, path);
        let newValue = fn(oldValue);
        
        if (schema && !schema(path, newValue)) {
            console.log(`[Config] Blocked invalid edited value for: ${path}`);
            return;
        }
        
        save(setByPath(data, path, newValue));
      },

      delete(path) {
        let data = load();
        save(deleteByPath(data, path));
      },

      has(path) {
        if (!path || typeof path !== "string" || path.trim() === "") {
          return false;
        }
        return getByPath(load(), path) !== undefined;
      },

      all() {
        return load();
      },

      addArray(path, value) {
        let data = load();
        let arr = getByPath(data, path);
        if (!Array.isArray(arr)) arr = [];
        if (!arr.includes(value)) arr.push(value);
        save(setByPath(data, path, arr));
        return arr;
      },

      removeArray(path, value) {
        let data = load();
        let arr = getByPath(data, path);
        if (!Array.isArray(arr)) return [];
        arr = arr.filter(v => v !== value);
        save(setByPath(data, path, arr));
        return arr;
      },

      toggleArray(path, value) {
        let data = load();
        let arr = getByPath(data, path);
        if (!Array.isArray(arr)) arr = [];
        if (arr.includes(value)) {
          arr = arr.filter(v => v !== value);
        } else {
          arr.push(value);
        }
        save(setByPath(data, path, arr));
        return arr;
      }
    };
  };
}


// ===================================================================
// 6. MULTI FILE SUPPORT (Registry dan Ekspor)
// ===================================================================

const registry = {
  settings: createConfig("settings", "settings"),
  api: createConfig("settings", "api")
};

/**
 * Fungsi utama untuk mengakses konfigurasi/database.
 * Menggantikan 'config' menjadi 'db'.
 * @param {string} file - ID berkas yang terdaftar ('settings', 'api', dll).
 * @returns {Function} API untuk berinteraksi dengan berkas.
 */
module.exports = function db(file = "settings") {
  if (!registry[file]) {
    throw new Error(`[Config Manager] File ID "${file}" is not registered.`);
  }
  return registry[file]();
};
