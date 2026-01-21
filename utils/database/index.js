const fs = require("fs");
const path = require("path");

// === HELPER UNTUK PATH BERSARANG (NESTED DATA) ===
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
      cursor[key] = /^\d+$/.test(parts[0]) ? [] : {};
    }
    cursor = cursor[key];
  }

  cursor[parts[0]] = value;
  return obj;
}

let paths = {
  base(dir = "") {
    return path.join(process.cwd(), "database", dir); 
  },

  file(dir, file) {
    return path.join(this.base(dir), `${file}.json`);
  },

  ensure(dir) {
    const p = this.base(dir);
    if (!fs.existsSync(p)) {
      fs.mkdirSync(p, { recursive: true });
    }
  }
};

let file = {
  read(dir, file) {
    paths.ensure(dir);
    const p = paths.file(dir, file);
    if (!fs.existsSync(p)) return null;
    try {
      let raw = fs.readFileSync(p);
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },
  write(dir, file, data) {
    paths.ensure(dir);
    const p = paths.file(dir, file);
    fs.writeFileSync(p, JSON.stringify(data, null, 2));
    return true;
  },
  exists(dir, file) {
    return fs.existsSync(paths.file(dir, file));
  },
  delete(dir, file) {
    const p = paths.file(dir, file);
    if (fs.existsSync(p)) fs.unlinkSync(p);
  },
  list(dir) {
    paths.ensure(dir);
    return fs.readdirSync(paths.base(dir))
      .filter(f => f.endsWith(".json"))
      .map(f => f.replace(".json", ""));
  }
};

const cache = {
  data: {},
  get(id) {
    return this.data[id] ? this.data[id].data : null;
  },
  set(id, value) {
    this.data[id] = { data: value, time: Date.now() };
  },
  delete(id) {
    delete this.data[id];
  }
};

// =====================================================
// Array Database Factory
// =====================================================
function createArrayDB(dir, fileId) {
  const cacheId = `${dir}/${fileId}`;
  const defaults = [];

  const baseAPI = {
    _load() {
      let cached = cache.get(cacheId);
      if (cached) return cached;

      let data = file.read(dir, fileId);
      if (!data) data = defaults;

      cache.set(cacheId, data);
      return data;
    },

    _save(data) {
      cache.set(cacheId, data);
      file.write(dir, fileId, data);
      return data;
    },

    all() {
      return this._load();
    },

    push(obj) {
      let arr = this._load();
      arr.push(obj);
      return this._save(arr);
    }
  };

  const handler = {
    get(_, userId) {
      if (userId === 'all') return baseAPI.all.bind(baseAPI);

      const id = String(userId); 

      return {
        id: id,

        exists() {
          return baseAPI.all().some(x => String(x.id) === id);
        },

        get() {
          return baseAPI.all().find(x => String(x.id) === id) || null;
        },

        ensure(defaults) {
          let list = baseAPI._load();
          let found = list.find(x => String(x.id) === id);

          if (!found) {
            found = { id: id, ...(defaults || data.item(id, id)) }; 
            list.push(found);
            baseAPI._save(list);
          }

          return found;
        },

        getPath(pathStr) {
            const item = this.get();
            if (!item) return null;
            return getByPath(item, pathStr);
        },

        set(data) {
          let list = baseAPI._load();
          let idx = list.findIndex(x => String(x.id) === id);

          if (idx === -1) {
            list.push({ id: id, ...data });
          } else {
            list[idx] = { ...list[idx], ...data }; 
          }

          baseAPI._save(list);
        },
        
        update(fn) {
          let list = baseAPI._load();
          let changed = false;

          list = list.map(item => {
            if (String(item.id) === id) {
              changed = true;
              return fn(item) || item;
            }
            return item;
          });

          if(changed) baseAPI._save(list);
        },
        
        updatePath(pathStr, valueOrFn) {
            let list = baseAPI._load();
            
            list = list.map(item => {
                if (String(item.id) === id) {
                    let newValue = valueOrFn;
                    
                    if (typeof valueOrFn === 'function') {
                        let oldValue = getByPath(item, pathStr);
                        newValue = valueOrFn(oldValue);
                    }
                    
                    return setByPath(item, pathStr, newValue) || item;
                }
                return item;
            });
            
            baseAPI._save(list);
        },

        delete() {
          let list = baseAPI._load();
          list = list.filter(x => String(x.id) !== id);
          baseAPI._save(list);
        }
      };
    }
  };

  return new Proxy({}, handler);
}

// =====================================================
// Game Session Manager (In-Memory)
// =====================================================
const gameSession = {
  data: {},
  
  get(chatId) {
    return this.data[chatId] || null;
  },
  
  set(chatId, sessionData) {
    this.data[chatId] = {
      ...sessionData,
      startTime: Date.now()
    };
  },
  
  delete(chatId) {
    delete this.data[chatId];
  },
  
  exists(chatId) {
    return !!this.data[chatId];
  },
  
  update(chatId, updates) {
    if (this.data[chatId]) {
      this.data[chatId] = {
        ...this.data[chatId],
        ...updates
      };
    }
  },
  
  all() {
    return this.data;
  },
  
  clear() {
    this.data = {};
  }
};

// Proxy untuk akses session dengan bracket notation
const sessionProxy = new Proxy(gameSession, {
  get(target, prop) {
    const dataReq = ['game', 'panel', 'admin']
    if (dataReq.includes(prop)) {
      return new Proxy({}, {
        get(_, chatId) {
          return {
            get: () => target.get(chatId),
            set: (data) => target.set(chatId, data),
            delete: () => target.delete(chatId),
            exists: () => target.exists(chatId),
            update: (updates) => target.update(chatId, updates)
          };
        }
      });
    }
    return target[prop];
  }
});

function createPteroAccessor() {
    const cgs = require("./config");
    const api = cgs("api");
    const pteroArray = api.get("pterodactyl");
    const defaultOptions = api.get("pterodactyl_options");
    function getPanel(identifier = null) {
        if (!Array.isArray(pteroArray)) return null;
        if (identifier && typeof identifier === 'string' && identifier.startsWith('http')) {
            return pteroArray.find(p => p.url === identifier) || null;
        }
        if (identifier && typeof identifier === 'string') {
            return pteroArray.find(p => p.options === identifier) || null;
        }
        return pteroArray.find(p => p.options === defaultOptions) || null;
    }
    return new Proxy(getPanel, {
        get(target, prop) {
            const defaultPanel = getPanel();
            if (!defaultPanel) return undefined;
            return defaultPanel[prop]; 
        },
        apply(target, thisArg, args) {
            return getPanel(...args);
        }
    });
}

// =====================================================
// REGISTER KOLEKSI DAN EKSPOR
// =====================================================
module.exports = {
  users: createArrayDB("options", "users"),
  group: createArrayDB("options", "group"),
  game: createArrayDB("options", "game"),
  session: sessionProxy,
  data: require("./data"),
  func: require("./func"),
  cg: require("./config"),
  panel: createPteroAccessor(),
  quted: (teks) => ({ key:{remoteJid:'0@s.whatsapp.net',fromMe:false,id:'FHIYA_FRINELLA'}, pushName:'whatsapp', broadcast:true, message:{extendedTextMessage:{ text:teks, contextInfo:{ mentionedJid:['0@s.whatsapp.net'], remoteJid:'0@s.whatsapp.net' }}}}),
};