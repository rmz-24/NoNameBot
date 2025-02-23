const {joinVoiceChannel,createAudioPlayer,createAudioResource,AudioPlayerStatus, StreamType} = require("@discordjs/voice");
const {Coordinates, CalculationMethod, PrayerTimes} = require("adhan");
const coordinates = new Coordinates(36.780,3.06);
const parameters = CalculationMethod.UmmAlQura();
const fs = require("fs");
const prism = require("prism-media");
const path = require("path");

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
 * Getting daily prayer times
 * @returns {PrayerTimes}
 */
function getPrayerTimes() {
    const date = new Date();
    return new PrayerTimes(coordinates, date, parameters);
}

/**
 * Infinite loop to notify of Adhan when necessary
 */
function scheduleAdhanNotifier(client) {
    console.log("Lancement de l'Adhan Manager");
    function checkAndSchedule() {
        const now = new Date();
        const prayerTimes = getPrayerTimes();
        const nextPrayer = prayerTimes.nextPrayer();
        const nextPrayerTime = prayerTimes.timeForPrayer(nextPrayer);
        const delay = nextPrayerTime.getTime() - now.getTime();
        if (delay > 0) {
            console.log(`Prochaine prière : ${nextPrayer} à ${nextPrayerTime.toLocaleTimeString()}`);
            setTimeout(() => {
                const channel = client.channels.cache.get("1200937759351767274");
                if (channel) {
                    channel.send(`Aller les <@&1200937306958348338> c'est l'heure du **${nextPrayer}** ! 🕌`);
                } else {
                    console.error("⚠️ Salon introuvable !");
                }
                playAdhan(client);
                checkAndSchedule();
            }, delay);
        } else {
            checkAndSchedule();
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
    scheduleAdhanNotifier
}
