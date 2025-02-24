/**
 * @author waSStyle
 */

const {
    joinVoiceChannel,
    createAudioPlayer,
    createAudioResource,
    AudioPlayerStatus,
    StreamType
} = require("@discordjs/voice");
const fs = require("fs");
const prism = require("prism-media");
const path = require("path");



/**
 * Plays an audio file in a given voice channel
 * @param client Bot's instance
 * @param channel Voice channel
 * @param audioName Audio file name
 */
function playAudio(client, channel, audioName) {
    const audioPath = path.join(__dirname, "../resources/" + audioName);

    if (!fs.existsSync(audioPath)) {
        console.error("⚠️ Fichier audio introuvable : " + audioPath);
        return;
    }

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
        const resource = createAudioResource(pcmStream, {inputType: StreamType.Raw});

        player.play(resource);
        connection.subscribe(player);

        player.on(AudioPlayerStatus.Idle, () => {
            console.log("✅ Fin de l'Adhan.");
            connection.destroy();
        });

    } catch (error) {
        console.error(`❌ Impossible de rejoindre ${channel.name} :`, error);
    }
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
    playAudio,
}