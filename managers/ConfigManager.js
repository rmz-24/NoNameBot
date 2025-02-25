/**
 * @author waSStyle
 */

const {join} = require("node:path");
const fs = require("node:fs");
const path = require("path");
const dataPath = path.join(__dirname, '../data');

/**
 * Loads guilds configurations
 * @param {string} guildId
 * @returns {Object}
 */
function loadConfig(guildId) {
    const configPath = join(dataPath, `${guildId}.json`);
    try {
        return JSON.parse(fs.readFileSync(configPath));
    } catch {
        return {
            city: 'Alger',
            coordinates: [0.7755, 3.0587],
            channelId: null,
            message: "Aller les <@&{role}>, c'est l'heure du **{prayer}** ! 🕌",
            roleID: null
        };
    }
}

function saveConfig(guildId, config) {
    const configPath = path.join(dataPath, `${guildId}.json`);
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

module.exports = {
    loadConfig, saveConfig
}