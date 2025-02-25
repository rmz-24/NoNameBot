/**
 * @author waSStyle
 */

/**
 * Kicks all bots (other than the client) from all voice channels
 * @param client Bot instance
 */
function kickAllBots(client) {
    client.guilds.cache.forEach(guild => {
        guild.members.cache
            .filter(member => member.user.bot && member.user.id !== client.user.id)
            .forEach(member => {
                if (member && member.voice.channel) {
                    member.voice.disconnect();
                }
            });
    })
}

/**
 * Returns a list of the most used voice channels across all guilds
 * @param {Client} client - Bot instance
 * @param guildId - null or guild to get in the voice channel
 * @returns {Array<Object>} - Most used voice channels list
 */
function getMostUsedVoiceChannels(client, guildId) {
    const mostUsedChannels = [];

    if (guildId) {
        const guild = client.guilds.cache.get(guildId);
        const voiceChannels = guild.channels.cache.filter(channel =>
            channel.type === 2 && channel.members.size > 0 // Type 2 = Salon vocal
        );

        if (voiceChannels.size > 0) {
            const mostPopulated = [...voiceChannels.values()].reduce((max, channel) =>
                channel.members.size > max.members.size ? channel : max
            );

            mostUsedChannels.push(mostPopulated);
        }

        return mostUsedChannels;
    }

    client.guilds.cache.forEach(guild => {
        const voiceChannels = guild.channels.cache.filter(channel =>
            channel.type === 2 && channel.members.size > 0 // Type 2 = Salon vocal
        );

        if (voiceChannels.size > 0) {
            const mostPopulated = [...voiceChannels.values()].reduce((max, channel) =>
                channel.members.size > max.members.size ? channel : max
            )
            mostUsedChannels.push(mostPopulated);
        }
    });

    return mostUsedChannels;
}

module.exports = {
    kickAllBots, getMostUsedVoiceChannels
}