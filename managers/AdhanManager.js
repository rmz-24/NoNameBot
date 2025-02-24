const {joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, StreamType} = require("@discordjs/voice");
const {Coordinates, CalculationMethod, PrayerTimes} = require("adhan");
const fs = require("fs");
const prism = require("prism-media");
const path = require("path");
const {find} = require('geo-tz');
const moment = require('moment-timezone');
const dataPath = path.join(__dirname, '../data');

/**
 * Kicks all bots (other than the client) from all voice channels
 * @param client Bot instance
 */
function kickAllBots(client) {
    client.guilds.cache.forEach(guild => {
        guild.members.cache
            .filter(member => member.user.bot && member.user.id !== client.user.id)
            .forEach(member => {
                if(member && member.voice.channel) {
                    member.voice.disconnect();
                }
            });
    })
}

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
 * Loads guilds configurations
 * @param {string} guildId
 * @returns {Object}
 */
function loadConfig(guildId) {
    const configPath = path.join(dataPath, `${guildId}.json`);
    try {
        return JSON.parse(fs.readFileSync(configPath));
    } catch {
        return {
            city: 'Alger',
            coordinates: [36.7755, 3.0587],
            channelId: null,
            message: "Aller les fidèles, c'est l'heure du **{prayer}** ! 🕌"
        };
    }
}

/**
 * Schedule Adhan's notifications for all servers
 * @param {Client} client
 */
function scheduleAdhanNotifier(client) {
    console.log("Lancement de l'Adhan Manager");

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
    function checkAndSchedule() {
        const config = loadConfig(guildId);
        const prayerTimes = getPrayerTimes(config);
        const nextPrayer = prayerTimes.nextPrayer();
        const nextPrayerTime = prayerTimes.timeForPrayer(nextPrayer);
        const delay = nextPrayerTime.getTime() - Date.now();

        if (delay > 0) {
            console.log(`[${guildId}] Prochaine prière : ${nextPrayer} à ${nextPrayerTime.toLocaleTimeString()}`);

            setTimeout(() => {
                const channel = client.channels.cache.get(config.channelId);
                if (channel) {
                    const message = config.message.replace('{prayer}', nextPrayer);
                    channel.send(message);
                }
                playAdhan(client);
                checkAndSchedule();
            }, delay);
        } else {
            setTimeout(checkAndSchedule, 1000);
        }
    }

    checkAndSchedule();
}





/**
 * Returns a list of the most used voice channels across all guilds
 * @param {Client} client - Bot instance
 * @returns {Array<Object>} - Most used voice channels list
 */
function getMostUsedVoiceChannels(client) {
    const mostUsedChannels = [];

    client.guilds.cache.forEach(guild => {
        const voiceChannels = guild.channels.cache.filter(channel =>
            channel.type === 2 && channel.members.size > 0 // Type 2 = Salon vocal
        );

        if (voiceChannels.size > 0) {
            const mostPopulated = [...voiceChannels.values()].reduce((max, channel) =>
                channel.members.size > max.members.size ? channel : max
            );

            mostUsedChannels.push(mostPopulated);
        }
    });

    return mostUsedChannels;
}

/**
 * Plays the Adhan in the most used voice Channels
 * @param {Client} client - Instance du bot
 */
function playAdhan(client) {
    const voiceChannels = getMostUsedVoiceChannels(client);
    const audioPath = path.join(__dirname, "../resources/adhan.wav");

    if (!fs.existsSync(audioPath)) {
        console.error("⚠️ Fichier audio introuvable : " + audioPath);
        return;
    }

    voiceChannels.forEach(channel => {
        if (!channel || !channel.guild) {
            console.error("⚠️ Erreur : Channel ou Guild non défini.");
            return;
        }

        try {
            console.log(`🔊 Connexion au salon : ${channel.name} (${channel.guild.name})`);

            const connection = joinVoiceChannel({
                channelId: channel.id,
                guildId: channel.guild.id,
                adapterCreator: channel.guild.voiceAdapterCreator
            });

            const player = createAudioPlayer();
            const pcmStream = createFFmpegPCMStream(audioPath);
            const resource = createAudioResource(pcmStream, { inputType: StreamType.Raw });

            kickAllBots(client);
            player.play(resource);
            connection.subscribe(player);

            player.on(AudioPlayerStatus.Idle, () => {
                console.log("✅ Fin de l'Adhan.");
                connection.destroy();
            });

        } catch (error) {
            console.error(`❌ Impossible de rejoindre ${channel.name} :`, error);
        }
    });
}

function createFFmpegPCMStream(filePath) {
    return new prism.FFmpeg({
        args: [
            "-i", filePath,
            "-f", "s16le",
            "-ar", "48000",
            "-ac", "2"
        ],
        stdio: ["pipe", "pipe", "ignore"]
    });
}



module.exports = {
    scheduleAdhanNotifier,playAdhan,loadConfig
}
