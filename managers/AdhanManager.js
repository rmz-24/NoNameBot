const cron = require("node-cron");
const {joinVoiceChannel,createAudioPlayer,createAudioResource} = require("@discordjs/voice");
const adhan = require("adhan");

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

module.exports = {
}
