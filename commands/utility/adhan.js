const { SlashCommandBuilder, InteractionContextType } = require('discord.js');
const {Coordinates, PrayerTimes, CalculationMethod} = require("adhan");
const {find} = require("geo-tz");
const moment = require("moment-timezone");
const {loadConfig} = require("../../managers/ConfigManager");
const {setupRole} = require("../../utils/AdhanUtils");

module.exports = {
    data: new SlashCommandBuilder()
        .addSubcommand(subCommand =>
            subCommand
                .setName('next')
                .setDescription("Donne l'heure de la prochaine prière"))
        .addSubcommand(subCommand =>
            subCommand
                .setName('enable')
                .setDescription('Active les notifications pour l\'Adhan'))
        .setName('adhan'),
    async execute(interaction) {
        const guildId = interaction.guildId;
        let config = loadConfig(guildId);
        switch (interaction.options.getSubcommand()) {
            case 'next':
                await handleNext(interaction, config);
                break;

            case 'enable':
                await handleEnable(interaction, config);
                break;
        }
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

async function handleEnable(interaction, config) {
    try {
        const updatedConfig = await setupRole(interaction.guild, config);

        if (!interaction.member.roles.cache.has(updatedConfig.roleId)) {
            await interaction.member.roles.add(updatedConfig.roleId);
            return interaction.reply({
                content: '✅ Vous recevez maintenant les notifications !',
                ephemeral: true
            });
        }

        interaction.reply({
            content: '⚠️ Vous avez déjà le rôle !',
            ephemeral: true
        });

    } catch (error) {
        interaction.reply({
            content: '❌ Erreur lors de la configuration du rôle !',
            ephemeral: true
        });
    }
}