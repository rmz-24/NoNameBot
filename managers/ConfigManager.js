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
            message: "Aller les <@&1200937306958348338>, c'est l'heure du **{prayer}** ! 🕌"
        };
    }
}

module.exports = {
    loadConfig
}