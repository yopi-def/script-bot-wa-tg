const axios = require("axios");
const moment = require('moment-timezone');
const db = require("../database");

function Pwd(mode = 1, len = 5) {
  const modes = {
    1: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
    2: "01234567890123456789",
    3: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
  };
  const chars = modes[mode] || modes[1];
  return Array.from({ length: len }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join("");
}

function tanggal() {
  return moment().tz("Asia/Jakarta").locale("id").format("dddd, DD MMMM YYYY");
}

function resolvePanel(webs = null) {
  const panel = webs ? db.panel(webs) : db.panel;
  if (!panel) throw new Error("Panel tidak ditemukan");
  if (!panel.url || !panel.ptla) throw new Error("Panel config tidak valid");
  return panel;
}

async function pteroRequest(method, panel, endpoint, data = {}) {
  try {
    const res = await axios({
      method,
      url: `${panel.url}/api/application${endpoint}`,
      headers: {
        Authorization: `Bearer ${panel.ptla}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      data,
    });

    return res.data;
  } catch (e) {
    return { error: e.response?.data || e.message };
  }
}

async function pteroRequestP(method, panel, endpoint, data = {}) {
  try {
    const res = await axios({
      method,
      url: `${panel.url}/api/application${endpoint}`,
      headers: {
        Authorization: `Bearer ${panel.ptla}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      ...data,
    });

    return res.data;
  } catch (e) {
    return { error: e.response?.data || e.message };
  }
}

async function getAllUsers(webs) {
  const panel = resolvePanel(webs);
  let page = 1;
  let all = [];

  while (true) {
    const res = await pteroRequestP("get", panel, `/users`, { params: { include: "servers", page }});
    if (res.error) break;
    if (!Array.isArray(res.data) || res.data.length === 0) break;
    all.push(...res.data);
    const pagin = res.meta?.pagination;
    if (!pagin || page >= pagin.total_pages) break;
    page++;
  }

  return all;
}

async function validatePanel(webs = null) {
  try {
    const panel = resolvePanel(webs);

    const auth = await pteroRequest("get", panel, "/users");
    if (auth.error) return { ok: false, step: "auth", error: auth.error };

    const egg = await pteroRequest("get", panel, `/nests/${panel.nests}/eggs/${panel.eggs}`);
    if (egg.error) return { ok: false, step: "egg", error: egg.error };

    const loc = await pteroRequest("get", panel, `/locations/${panel.location}`);
    if (loc.error) return { ok: false, step: "location", error: loc.error };

    return {
      ok: true,
      panel: panel.url,
      nest: panel.nests,
      egg: panel.eggs,
      location: panel.location,
    };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

//==============================================================
//==============================================================



async function getnestegg(webs) {
  try {
    const panel = resolvePanel(webs);
    const res = await pteroRequestP("get", panel, `/nests`, { params: { include: 'eggs' }});
    if (res.error) return { ok: false, error: `Error:\n${JSON.stringify(res.error, null, 2)}` };

    if (!Array.isArray(res.data) || res.data.length === 0) {
      return { error: `Tidak ada nests yang ditemukan.` };
    }
  
    let msg = `🥚 *INFO NESTS DAN EGGS*\n\n`;

    res.data.forEach((u, i) => {
      const x = u.attributes;
      const eggs = x.relationships.eggs;
      msg += `(nests: ${x.id} ) ${x.name}\n`

      if (eggs && Array.isArray(eggs.data) && eggs.data.length > 0) {
        eggs.data.map((s, idx) => {
          const a = s.attributes;
          msg += `- --(eggs: ${a.id} ) ${a.name}\n`
        });
      }
      msg += "\n"
    });

    return { ok: true, mess: msg }
  } catch (err) {
    console.error("[ptsrvinfo] error:", err?.message || err);
    return { ok: false, error: `Terjadi kesalahan internal: ${err?.message || err}` }; 
  }
};



async function useradd(webs, users, admin = false) {
  try {
    const panel = resolvePanel(webs);
    let titleCase = (s = "") => s.toLowerCase().replace(/(^|\s)\w/g, (c) => c.toUpperCase());
  
    let website = panel.url
    let username = users.toLowerCase()
    let password = users + Pwd(2, 3)
  
    const data = {
      username,
      email: `${username + panel.format_email}`,
      first_name: titleCase(username),
      last_name: admin ? "Admins" : "Users",
      password,
      root_admin: admin
    };

    const result = await pteroRequest("post", panel, "/users", data);
    if (result.error) return { ok: false, error: `Error:\n${JSON.stringify(result.error, null, 2)}` };

    return { ok: true, website, password, ...result.attributes }
  } catch (err) {
    console.error("[ptsrvinfo] error:", err?.message || err);
    return { ok: false, error: `Terjadi kesalahan internal: ${err?.message || err}` }; 
  }
};



async function userdel(webs, userid) {
  try {
    const panel = resolvePanel(webs);
    if (String(userid) === "1") return { ok: false, error: "User ID *1* tidak boleh dihapus!" }

    const getUser = await pteroRequestP("get", panel, `/users/${userid}`, { params: { include: "servers" }});
    if (getUser.error) return { error: `Error:\n${JSON.stringify(getUser.error, null, 2)}` };

    const u = getUser.attributes;
    const servers = u.relationships?.servers?.data || [];

    // Hapus semua server user
    if (servers.length > 0) {
      for (const s of servers) {
        const a = s.attributes;
        const delSrv = await pteroRequest("delete", panel, `/servers/${a.id}`);
        if (delSrv.error) return { ok: false, error: `Error:\n${JSON.stringify(delSrv.error, null, 2)}` };
      }
    }

    const delUser = await pteroRequest("delete", panel, `/users/${userid}`);
    if (delUser.error) return { ok: false, error: `Error:\n${JSON.stringify(delUser.error, null, 2)}` };
    return { ok: true, mess: `UserID ${userid} berhasil dihapus.` };
  } catch (err) {
    console.error("[ptsrvinfo] error:", err?.message || err);
    return { ok: false, error: `Terjadi kesalahan internal: ${err?.message || err}` }; 
  }
};



async function userdelall(webs) {
  try {
    const panel = resolvePanel(webs);
    const users = await getAllUsers(webs);
    if (!users || users.length === 0) return { ok: false, error: "Tidak ada user yang ditemukan." };

    for (const u of users) {
      const x = u.attributes;
      if (x.root_admin === true) {
        continue;
      }
      const servers = x.relationships?.servers?.data || [];

      // Hapus semua server
      if (servers.length > 0) {
        for (const s of servers) {
          const a = s.attributes;
          const delSrv = await pteroRequest("delete", panel, `/servers/${a.id}`);
          if (delSrv?.error) {
            continue;
          }
        }
      }

      // Hapus user
      const delUser = await pteroRequest("delete", panel, `/users/${x.id}`);
      if (delUser?.error) {
        continue;
      }
    }
    return { ok: true, mess: `Semua user kecuali adp berhasil dihapus.` };
  } catch (err) {
    console.error("[ptsrvinfo] error:", err?.message || err);
    return { ok: false, error: `Terjadi kesalahan internal: ${err?.message || err}` }; 
  }
};



async function usertgadp(webs, id) {
  try {
    const panel = resolvePanel(webs);
    const info = await pteroRequest("get", panel, `/users/${id}`);
    if (info.error) return { ok: false, error: `Error:\n${JSON.stringify(info.error, null, 2)}` };
    const current = info.attributes;
    const now = current.root_admin ? "Users" : "Admins"

    const res = await pteroRequest("patch", panel, `/users/${id}`, {
      email: current.email,
      username: current.username,
      first_name: current.first_name,
      last_name: now,
      root_admin: !current.root_admin,
    });

    if (res.error) return { ok: false, error: `Error:\n${JSON.stringify(res.error, null, 2)}` };

    return { ok: true, mess: `UserID ${id} berhasil update role menjadi ${now}`, now }
  } catch (err) {
    console.error("[ptsrvinfo] error:", err?.message || err);
    return { ok: true, error: `Terjadi kesalahan internal: ${err?.message || err}` }; 
  }
};



async function usertgpwd(webs, id, password) {
  try {
    const panel = resolvePanel(webs);
    if (!/^[A-Za-z0-9]+$/.test(password)) return { ok: false, error: "Password cuma boleh huruf dan angka, tanpa spasi." }
    if (password.length < 3) return { ok: false, error: "Password minimal 3 karakter yaa." };

    const info = await pteroRequest("get", panel, `/users/${id}`);
    if (info.error) return { ok: false, error: `Error:\n${JSON.stringify(info.error, null, 2)}` };
    const current = info.attributes;

    const res = await pteroRequest("patch", panel, `/users/${id}`, {
      email: current.email,
      username: current.username,
      first_name: current.first_name,
      last_name: current.last_name,
      password
    });
    if (res.error) return { ok: false, error: `Error:\n${JSON.stringify(res.error, null, 2)}` };

    return { ok: true, mess: `Berhasil Merubah Password menjadi: ${password}`, id, website: panel.url, username: current.username, password }
  } catch (err) {
    console.error("[ptsrvinfo] error:", err?.message || err);
    return { ok: false, error: `Terjadi kesalahan internal: ${err?.message || err}` }; 
  }
};



async function srvadd(webs, user_id, ram_disk_cpu) {
  try {
    const panel = resolvePanel(webs);
    
    const gb = parseInt(ram_disk_cpu);
    const ram_disk = gb === 0 ? 0 : gb * 1024;
    const cpu = gb === 0 ? 0 : gb * 25 + 10;

    const prefix = Pwd(1, 5);
    const name = gb === 0 ? `${prefix}#Unli` : `${prefix}#${gb}GB`;
    const description = "Create: " + tanggal();

    const nestid = panel.nests
    const egg = panel.eggs
    const loc = panel.location
    
    const databases = parseInt(panel.setting.database)
    const allocations = parseInt(panel.setting.allocation)
    const backups = parseInt(panel.setting.backup)

    const response_egg = await pteroRequest("get", panel, `/nests/${nestid}/eggs/${egg}`);
    if (response_egg.error) return { ok: false, error: `Error:\n${JSON.stringify(response_egg.error, null, 2)}` };    

    const startup_cmd = response_egg.attributes.startup;
    const docker_image = response_egg.attributes.docker_image

    const serverData = {
      name, description, user: parseInt(user_id), egg: parseInt(egg), docker_image, startup: startup_cmd,
      environment: panel.environment,
      limits: { memory: ram_disk, swap: 0, disk: ram_disk, io: 500, cpu },
      feature_limits: { databases, allocations, backups },
      deploy: { locations: [parseInt(loc)], dedicated_ip: false, port_range: [] }
    };
    
    const response_server = await pteroRequest("post", panel, `/servers`, serverData);
    if (response_server.error) return { ok: false, error: `Error:\n${JSON.stringify(response_server.error, null, 2)}` };

    const s = response_server.attributes;

    return {
      ok: true,
      name: s.name,
      srvid: s.id,
      usrid: s.user,
      spec: {
        ram: ram_disk === 0 ? "Unlimited" : (ram_disk / 1024) + " GB",
        disk: ram_disk === 0 ? "Unlimited" : (ram_disk / 1024) + " GB",
        cpu: cpu === 0 ? "Unlimited" : cpu + "%",
        loc: loc
      }
    }
  } catch (err) {
    console.error("[srvadd ERROR]:", err?.response?.data || err);
    return { ok: false, error: `Terjadi kesalahan internal: ${err?.message || err}` }; 
  }
};



async function srvdel(webs, id) {
  try {
    const panel = resolvePanel(webs);
    const res = await pteroRequest("delete", panel, `/servers/${id}`);
    if (res.error) return { ok: false, error: `Error:\n${JSON.stringify(res.error, null, 2)}` };
    return { ok: true, mess: `ServerID ${id} berhasil dihapus.` }
  } catch (err) {
    console.error("[srvdel] error:", err?.message || err);
    return { ok: false, error: `Terjadi kesalahan internal: ${err?.message || err}` }; 
  }
};



// type: suspend / unsuspend / reinstall
async function srvsetts(webs, id, type) {
  try {
    const panel = resolvePanel(webs);
    const res = await pteroRequest("post", panel, `/servers/${id}/${type}`);
    if (res.error) return { ok: false, error: `Error:\n${JSON.stringify(res.error, null, 2)}` };
    return { ok: true, mess: `ServerID ${id} telah ${type == "suspend" ? "Di-Suspend" : type == "unsuspend" ? "Di-Unsuspend" : "Di-Reinstall"}.` };
  } catch (err) {
    console.error("[srvsetts] error:", err?.message || err);
    return { ok: false, error: `Terjadi kesalahan internal: ${err?.message || err}` }; 
  }
};



async function srvlist(webs, pages) {
  try {
    const panel = resolvePanel(webs);
    const page = Math.max(1, parseInt(pages) || 1);
    const response = await pteroRequestP("get", panel, `/servers`, { params: { per_page: 15, page }});
    if (response.error) return { ok: false, error: `Error:\n${JSON.stringify(response.error, null, 2)}` };

    const servers = response.data;
    const pagin = response.meta.pagination;

    if (!servers || !servers.length) return { ok: false, error: "Tidak ada server ditemukan." };

    const lines = servers.map((s, i) => {
      const attrs = s.attributes;
      return {
        srvid: attrs.id,
        usrid: attrs.user,
        name: attrs.name,
        ram: (attrs.limits.memory === 0) ? `Unlimited` : (attrs.limits.memory / 1024).toFixed(2) + " GB",
        disk: (attrs.limits.disk === 0) ? `Unlimited` : (attrs.limits.disk / 1024).toFixed(2) + " GB",
        cpu: (attrs.limits.cpu === 0) ? `Unlimited` : attrs.limits.cpu + "%",
        status: attrs.suspended ? "Suspended" : "Aktif",
      };
    });

    return {
        ok: true,
        page,
        total_page: pagin.total_pages,
        total: pagin.total, 
        data: lines 
    };
    
  } catch (err) {
    console.error("[srvlist] error:", err?.message || err);
    return { ok: false, error: `Terjadi kesalahan internal: ${err?.message || err}` }; 
  }
}



async function srvinfo(webs, id) {
  try {
    const panel = resolvePanel(webs);
    const response = await pteroRequestP("get", panel, `/servers/${id}`);
    if (response.error) return { ok: false, error: `Error:\n${JSON.stringify(response.error, null, 2)}` };
    
    let result = response.attributes

    return {
      ok: true,
      name: result.name,
      srvid: result.id,
      usrid: result.user,
      node: result.node,
      nest: result.nest,
      egg: result.egg,
      status: result.suspended ? "Suspended" : "Aktif",
      ram: (result.limits.memory === 0) ? `Unlimited` : (result.limits.memory / 1024).toFixed(2) + " GB",
      disk: (result.limits.memory === 0) ? `Unlimited` : (result.limits.memory / 1024).toFixed(2) + " GB",
      cpu: (result.limits.cpu === 0) ? `Unlimited` : result.limits.cpu + "%"
    }
  } catch (err) {
    console.error("[ptsrvinfo] error:", err?.message || err);
    return { ok: false, error: `Terjadi kesalahan internal: ${err?.message || err}` }; 
  }
};



async function userinfo(webs, id) {
  try {
    const panel = resolvePanel(webs);
    const res = await pteroRequestP("get", panel, `/users/${id}`, { params: { include: "servers" }});
    if (res.error) return { ok: false, error: `Error:\n${JSON.stringify(res.error, null, 2)}` };

    const u = res.attributes;
    const servers = u.relationships.servers;
    
    let list = []; 

    if (servers && Array.isArray(servers.data) && servers.data.length > 0) {
      list = servers.data.map((s, i) => {
        const attrs = s.attributes;
        return {
          srvid: attrs.id,
          usrid: attrs.user,
          name: attrs.name,
          ram: (attrs.limits.memory === 0) ? `Unlimited` : (attrs.limits.memory / 1024).toFixed(2) + " GB",
          disk: (attrs.limits.disk === 0) ? `Unlimited` : (attrs.limits.disk / 1024).toFixed(2) + " GB",
          cpu: (attrs.limits.cpu === 0) ? `Unlimited` : attrs.limits.cpu + "%",
          status: attrs.suspended ? "Suspended" : "Aktif"
        };
      });
    }
    
    return {
      ok: true,
      usrid: u.id,
      username: u.username,
      email: u.email,
      name: `${u.first_name} ${u.last_name}`,
      role: u.root_admin ? "Admins" : "Users",
      a2fa: u["2fa"] ? "Enabled" : "Disabled",
      create: u.created_at,
      server: list
    }
  } catch (err) {
    console.error("[userinfo] error:", err?.message || err);
    return { ok: false, error: `Terjadi kesalahan internal: ${err?.message || err}` }; 
  }
};



async function userlist(webs, pages, admin = false) {
  try {
    const panel = resolvePanel(webs);
    const page = Math.max(1, parseInt(pages) || 1);

    const res = await pteroRequestP("get", panel, `/users`, { params: { include: 'servers', per_page: 15, page }});
    if (res.error) return { ok: false, error: `Error:\n${JSON.stringify(res.error, null, 2)}` };

    const pagin = res.meta.pagination;

    if (!Array.isArray(res.data) || res.data.length === 0) 
      return { error: "Tidak ada user ditemukan." };

    // Jika admin=true, filter hanya user admin
    const filteredUsers = admin 
      ? res.data.filter(u => u.attributes.root_admin === true) 
      : res.data;

    const users = filteredUsers.map((u) => { 
      const x = u.attributes;
      const servers = x.relationships.servers;

      let user_servers = [];
      if (servers && Array.isArray(servers.data) && servers.data.length > 0) {
        user_servers = servers.data.map((s) => {
          const attrs = s.attributes;
          return {
            srvid: attrs.id,
            usrid: attrs.user,
            name: attrs.name,
            ram: (attrs.limits.memory === 0) ? `Unlimited` : (attrs.limits.memory / 1024).toFixed(2) + " GB",
            disk: (attrs.limits.disk === 0) ? `Unlimited` : (attrs.limits.disk / 1024).toFixed(2) + " GB",
            cpu: (attrs.limits.cpu === 0) ? `Unlimited` : attrs.limits.cpu + "%",
            status: attrs.suspended ? "Suspended" : "Aktif"
          };
        });
      }

      return {
        usrid: x.id,
        username: x.username,
        email: x.email,
        name: `${x.first_name} ${x.last_name}`,
        role: x.root_admin ? "Admins" : "Users",
        a2fa: x.two_factor_enabled ? "Enabled" : "Disabled",
        create: x.created_at,
        server: user_servers
      };
    });

    return {
      ok: true,
      page,
      total_page: pagin.total_pages,
      total: filteredUsers.length, 
      data: users
    };
  } catch (err) {
    console.error("[userlist] error:", err?.message || err);
    return { error: `Terjadi kesalahan internal: ${err?.message || err}` };
  }
}








module.exports = {
  useradd,     srvadd,
  userdel,      srvdel,
  userlist,      srvlist,
  userinfo,     srvinfo,
  userdelall,    srvsetts,
  usertgadp,   
  usertgpwd,   getnestegg
}