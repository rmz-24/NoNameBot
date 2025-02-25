const { SlashCommandBuilder } = require('discord.js');
const {Coordinates, PrayerTimes, CalculationMethod} = require("adhan");
const {find} = require("geo-tz");
const moment = require("moment-timezone");
const {loadConfig} = require("../../managers/ConfigManager");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('nextadhan')
        .setDescription("Donne l'heure de la prochaine prière"),
    async execute(interaction) {
        const guildId = interaction.guildId;
        let config = loadConfig(guildId);
        await handleNext(interaction, config);
    },
};

async function handleNext(interaction, config) {
    const coordinates = new Coordinates(...config.coordinates);
    const timeZones = find(config.coordinates[0], config.coordinates[1]);
    const timeZone = timeZones.length > 0 ? timeZones[0] : 'Africa/Algiers';
    const localDate = moment().tz(timeZone).toDate();

    const prayerTimes = new PrayerTimes(
        coordinates,
        localDate,
        CalculationMethod.UmmAlQura()
    );

    const nextPrayer = prayerTimes.nextPrayer();
    const nextTime = prayerTimes.timeForPrayer(nextPrayer);
    const localMoment = moment(nextTime).tz(timeZone);

    const unixTimestamp = Math.floor(localMoment.valueOf() / 1000);
    const dynamicTimestamp = `<t:${unixTimestamp}:R>`;

    const localTime = localMoment.format('HH:mm');

    interaction.reply({
        content: `🕋 Prochaine prière (**${nextPrayer}**) à ${localTime} (${dynamicTimestamp})`,
        ephemeral: true
    });
}