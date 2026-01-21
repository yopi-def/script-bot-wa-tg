const axios = require('axios');
const db = require("../database");

class PterodactylManager {
  constructor() {
    this.cg = db.cg;
  }

  // ==========================================
  // CRUD OPERATIONS
  // ==========================================

  /**
   * Get all panels
   */
  getAllPanels() {
    return this.cg("api").get("pterodactyl") || [];
  }

  /**
   * Get panel by options ID
   */
  getPanelByOptions(options) {
    const panels = this.getAllPanels();
    return panels.find(p => p.options === options) || null;
  }

  /**
   * Get default panel options
   */
  getDefaultOptions() {
    return this.cg("api").get("pterodactyl_options") || null;
  }

  /**
   * Add new panel
   */
  addPanel(panelData) {
    try {
      const panels = this.getAllPanels();
      
      // Validate options uniqueness
      if (this.isOptionsExists(panelData.options)) {
        return { success: false, error: "Options ID already exists" };
      }

      // Validate URL format
      if (!this.validateURL(panelData.url)) {
        return { success: false, error: "Invalid URL format" };
      }

      // Validate PTLA token
      if (!this.validatePTLA(panelData.ptla)) {
        return { success: false, error: "Invalid PTLA token format" };
      }

      // Add to array
      panels.push(panelData);
      this.cg("api").set("pterodactyl", panels);

      return { success: true, data: panelData };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Update panel
   */
  updatePanel(options, updates) {
    try {
      const panels = this.getAllPanels();
      const index = panels.findIndex(p => p.options === options);

      if (index === -1) {
        return { success: false, error: "Panel not found" };
      }

      // If updating URL, validate it
      if (updates.url && !this.validateURL(updates.url)) {
        return { success: false, error: "Invalid URL format" };
      }

      // If updating PTLA, validate it
      if (updates.ptla && !this.validatePTLA(updates.ptla)) {
        return { success: false, error: "Invalid PTLA token format" };
      }

      // Merge updates
      panels[index] = { ...panels[index], ...updates };
      this.cg("api").set("pterodactyl", panels);

      return { success: true, data: panels[index] };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete panel
   */
  deletePanel(options) {
    try {
      const panels = this.getAllPanels();
      const filtered = panels.filter(p => p.options !== options);

      if (panels.length === filtered.length) {
        return { success: false, error: "Panel not found" };
      }

      // Check if deleting default panel
      if (this.getDefaultOptions() === options) {
        return { success: false, error: "Cannot delete default panel. Switch default first." };
      }

      this.cg("api").set("pterodactyl", filtered);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Set default panel
   */
  setDefaultPanel(options) {
    try {
      if (!this.isOptionsExists(options)) {
        return { success: false, error: "Panel not found" };
      }

      this.cg("api").set("pterodactyl_options", options);
      return { success: true, options };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // ==========================================
  // PTERODACTYL API CALLS
  // ==========================================

  /**
   * Fetch all locations from panel
   */
  async getLocations(options = null) {
    try {
      const panel = options ? this.getPanelByOptions(options) : db.panel();
      if (!panel) return { success: false, error: "Panel not found" };

      const response = await axios.get(`${panel.url}/api/application/locations`, {
        headers: {
          'Authorization': `Bearer ${panel.ptla}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      const locations = response.data.data.map(loc => ({
        id: loc.attributes.id,
        short: loc.attributes.short,
        long: loc.attributes.long || loc.attributes.short
      }));

      return { success: true, data: locations };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Fetch all nests from panel
   */
  async getNests(options = null) {
    try {
      const panel = options ? this.getPanelByOptions(options) : db.panel();
      if (!panel) return { success: false, error: "Panel not found" };

      const response = await axios.get(`${panel.url}/api/application/nests`, {
        headers: {
          'Authorization': `Bearer ${panel.ptla}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      const nests = response.data.data.map(nest => ({
        id: nest.attributes.id,
        name: nest.attributes.name,
        description: nest.attributes.description
      }));

      return { success: true, data: nests };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Fetch eggs from specific nest
   */
  async getEggs(nestId, options = null) {
    try {
      const panel = options ? this.getPanelByOptions(options) : db.panel();
      if (!panel) return { success: false, error: "Panel not found" };

      const response = await axios.get(`${panel.url}/api/application/nests/${nestId}/eggs?include=variables`, {
        headers: {
          'Authorization': `Bearer ${panel.ptla}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      const eggs = response.data.data.map(egg => ({
        id: egg.attributes.id,
        name: egg.attributes.name,
        description: egg.attributes.description,
        docker_image: egg.attributes.docker_image,
        startup: egg.attributes.startup
      }));

      return { success: true, data: eggs };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }


  // ==========================================
  // PTERODACTYL API CALLS V2
  // ==========================================

  /**
   * Fetch all locations from panel
   */
  async getLocations2(panel) {
    try {

      const response = await axios.get(`${panel.url}/api/application/locations`, {
        headers: {
          'Authorization': `Bearer ${panel.ptla}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      const locations = response.data.data.map(loc => ({
        id: loc.attributes.id,
        short: loc.attributes.short,
        long: loc.attributes.long || loc.attributes.short
      }));

      return { success: true, data: locations };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Fetch all nests from panel
   */
  async getNests2(panel) {
    try {

      const response = await axios.get(`${panel.url}/api/application/nests`, {
        headers: {
          'Authorization': `Bearer ${panel.ptla}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      const nests = response.data.data.map(nest => ({
        id: nest.attributes.id,
        name: nest.attributes.name,
        description: nest.attributes.description
      }));

      return { success: true, data: nests };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Fetch eggs from specific nest
   */
  async getEggs2(nestId, panel) {
    try {

      const response = await axios.get(`${panel.url}/api/application/nests/${nestId}/eggs?include=variables`, {
        headers: {
          'Authorization': `Bearer ${panel.ptla}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      const eggs = response.data.data.map(egg => ({
        id: egg.attributes.id,
        name: egg.attributes.name,
        description: egg.attributes.description,
        docker_image: egg.attributes.docker_image,
        startup: egg.attributes.startup
      }));

      return { success: true, data: eggs };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Test panel connection
   */
  async testConnection(url, ptla) {
    try {
      const response = await axios.get(`${url}/api/application/users`, {
        headers: {
          'Authorization': `Bearer ${ptla}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        timeout: 10000
      });

      return { success: true, message: "Connection successful" };
    } catch (error) {
      if (error.response) {
        return { success: false, error: `HTTP ${error.response.status}: ${error.response.statusText}` };
      }
      return { success: false, error: error.message };
    }
  }

  // ==========================================
  // VALIDATION FUNCTIONS
  // ==========================================

  validateURL(url) {
    const pattern = /^https?:\/\/.+/i;
    return pattern.test(url);
  }

  validatePTLA(token) {
    return token && token.startsWith('ptla_') && token.length > 10;
  }

  isOptionsExists(options) {
    const panels = this.getAllPanels();
    return panels.some(p => p.options === options);
  }

  validateOptionsId(options) {
    return /^[a-zA-Z0-9_-]+$/.test(options);
  }

  // ==========================================
  // UTILITY FUNCTIONS
  // ==========================================

  generateOptionsId() {
    const panels = this.getAllPanels();
    let counter = 1;
    
    while (true) {
      const newId = `v${counter}`;
      if (!panels.some(p => p.options === newId)) {
        return newId;
      }
      counter++;
    }
  }

  formatPanelInfo(panel, isDefault = false) {
    const defaultMark = isDefault ? " (DEFAULT)" : "";
    return `
📊 Panel Details: ${panel.name}${defaultMark}

🆔 Options: ${panel.options}
🔗 URL: ${panel.url}
🔑 API: ${panel.ptla.substring(0, 10)}...${panel.ptla.substring(panel.ptla.length - 5)}
📧 Email: ${panel.format_email}

📍 Location: ${panel.location}
🪺 Nest: ${panel.nests}
🥚 Egg: ${panel.eggs}

⚙️ Settings:
├─ Allocation: ${panel.setting.allocation}
├─ Database: ${panel.setting.database}
└─ Backup: ${panel.setting.backup}

🌍 Environment:
${Object.entries(panel.environment).map(([k, v]) => `├─ ${k}: ${v}`).join('\n')}
    `.trim();
  }

  exportPanels() {
    return {
      pterodactyl_options: this.getDefaultOptions(),
      pterodactyl: this.getAllPanels()
    };
  }

  importPanels(jsonData) {
    try {
      if (!jsonData.pterodactyl || !Array.isArray(jsonData.pterodactyl)) {
        return { success: false, error: "Invalid JSON format" };
      }

      this.cg("api").set("pterodactyl", jsonData.pterodactyl);
      
      if (jsonData.pterodactyl_options) {
        this.cg("api").set("pterodactyl_options", jsonData.pterodactyl_options);
      }

      return { success: true, count: jsonData.pterodactyl.length };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  createDefaultPanelStructure() {
    return {
      name: "",
      options: "",
      url: "",
      ptla: "",
      format_email: "@gmail.com",
      location: 1,
      nests: 5,
      eggs: 17,
      setting: {
        allocation: 0,
        database: 1,
        backup: 2
      },
      environment: {
        INST: "npm",
        USER_UPLOAD: "0",
        AUTO_UPDATE: "0",
        CMD_RUN: "npm start"
      }
    };
  }

  getPanelStats() {
    const panels = this.getAllPanels();
    const defaultOpt = this.getDefaultOptions();
    
    return {
      total: panels.length,
      default: defaultOpt,
      list: panels.map(p => ({
        name: p.name,
        options: p.options,
        isDefault: p.options === defaultOpt
      }))
    };
  }
}

module.exports = new PterodactylManager();