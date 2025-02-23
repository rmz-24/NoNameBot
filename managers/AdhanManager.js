const cron = require("node-cron");
const {joinVoiceChannel,createAudioPlayer,createAudioResource} = require("@discordjs/voice");
const adhan = require("adhan");

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
 * Infinite cron based loop to notify of Adhan when necessary
 */
function scheduleAdhanNotifier(client) {
    console.log("Lancement de l'Adhan Manager");

    cron.schedule("*/20 * * * * *", () => {
        const now = new Date();
        const prayerTimes = getPrayerTimes();
        let prayer = prayerTimes.nextPrayer();
        let prayerTime = prayerTimes.timeForPrayer(prayer);

        if (
            now.getHours() === prayerTime.getHours() &&
            now.getMinutes() === prayerTime.getMinutes()
        ) {
            const channel = client.channels.cache.get("1200937759351767274"); // ✅ Récupérer le salon texte
            if (channel) {
                channel.send(`Aller les <@&1200937306958348338> c'est l'heure du **${prayer}** ! 🕌`);
            } else {
                console.error("⚠️ Salon introuvable !");
            }

            playAdhan(client);
        }
    });
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
    if (isPlaying) {
        console.log("⏳ Un Adhan est déjà en cours. Annulation...");
        return;
    }

    isPlaying = true;
    const voiceChannels = getMostUsedVoiceChannels(client);
    const audioPath = path.join(__dirname, "../resources/adhan.wav");

    if (!fs.existsSync(audioPath)) {
        console.error("⚠️ Fichier audio introuvable : " + audioPath);
        isPlaying = false;
        return;
    }

    voiceChannels.forEach(channel => {
        if (!channel || !channel.guild) {
            console.error("⚠️ Erreur : Channel ou Guild non défini.");
            isPlaying = false;
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
                isPlaying = false;
            });

        } catch (error) {
            console.error(`❌ Impossible de rejoindre ${channel.name} :`, error);
            isPlaying = false;
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
