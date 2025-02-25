/**
 * @author waSStyle
 */

const {Coordinates, CalculationMethod, PrayerTimes} = require("adhan");
const {find} = require('geo-tz');
const moment = require('moment-timezone');
const {playAudio} = require("./AudioManager");
const {kickAllBots, getMostUsedVoiceChannels} = require("../utils/VoiceUtils");
const {loadConfig} = require("./ConfigManager");
const {setupRole} = require("../utils/AdhanUtils");
const inSchedulerGuilds = new Map();

/**
 * Getting prayer times for a given configuration
 * @param {Object} config
 * @returns {PrayerTimes}
 */
function getPrayerTimes(config) {
    const coordinates = new Coordinates(...config.coordinates);
    const timeZones = find(config.coordinates[0], config.coordinates[1]);
    const timeZone = timeZones[0] || 'Africa/Algiers';
    const localDate = moment().tz(timeZone).toDate();

    return new PrayerTimes(
        coordinates,
        localDate,
        CalculationMethod.UmmAlQura()
    );
}

/**
 * Schedule Adhan's notifications for all servers
 * @param {Client} client
 */
function scheduleAdhanNotifier(client) {
    client.guilds.cache.forEach(guild => {
        startSchedulerForGuild(client, guild.id);
    });
}

/**
 * Starts scheduler for a specific guild
 * @param {Client} client
 * @param {string} guildId
 */
function startSchedulerForGuild(client, guildId) {
    const scheduledTimeout = inSchedulerGuilds.get(guildId);
    if(scheduledTimeout) {
        clearTimeout(scheduledTimeout);
        inSchedulerGuilds.delete(guildId);
    }
    function checkAndSchedule() {
        const config = loadConfig(guildId);
        const guild = client.guilds.cache.get(guildId);

        setupRole(guild, config)
            .then(updatedConfig => {
                const prayerTimes = getPrayerTimes(updatedConfig);
                const nextPrayer = prayerTimes.nextPrayer();
                const nextPrayerTime = prayerTimes.timeForPrayer(nextPrayer);
                const delay = nextPrayerTime.getTime() - Date.now();
                if (delay > 0) {
                    console.log(`[${guildId}] Prochaine prière : ${nextPrayer} à ${nextPrayerTime.toLocaleTimeString()}`);
                    const timeout = setTimeout(() => {
                        const channel = client.channels.cache.get(config.channelId);
                        if (channel) {
                            const message = config.message.replace('{prayer}', nextPrayer).replace('{role}', `<@&${config.roleId}>`);
                            channel.send(message)
                        }
                        playAdhan(client, null);
                        checkAndSchedule();
                    }, delay);
                    inSchedulerGuilds.set(guildId, timeout);
                } else {
                    setTimeout(checkAndSchedule, 1000);
                }
            })
            .catch(error => {
                console.error(`[${guildId}] Échec de la configuration : ${error}`);
            });
    }
    checkAndSchedule();
}

/**
 * Plays the Adhan in the most used voice Channels
 * @param {Client} client - Instance du bot
 * @param guildId null or guild to play in the Adhan
 */
function playAdhan(client, guildId) {
    const voiceChannels = getMostUsedVoiceChannels(client, guildId);
    voiceChannels.forEach(channel => {
        if (!channel || !channel.guild) {
            console.error("⚠️ Erreur : Channel ou Guild non défini.");
            return;
        }
        kickAllBots(client);
        playAudio(client, channel, "adhan.wav");
    });
}


module.exports = {
    scheduleAdhanNotifier, startSchedulerForGuild, playAdhan
}
