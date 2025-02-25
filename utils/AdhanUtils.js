const {saveConfig} = require("../managers/ConfigManager");

async function setupRole(guild, config) {
    try {
        let role = guild.roles.cache.get(config.roleId);

        if (!role) {
            role = guild.roles.cache.find(r => r.name === 'Adhan');

            if (!role) {
                role = await guild.roles.create({
                    name: 'Adhan',
                    color: '#0099ff',
                    mentionable: true,
                    reason: 'Rôle pour les notifications Adhan'
                });
            }

            config.roleId = role.id;
            saveConfig(guild.id, config);
        }

        return config;
    } catch (error) {
        console.error(`Erreur lors de la configuration du rôle : ${error}`);
        throw error;
    }
}

module.exports = {setupRole}