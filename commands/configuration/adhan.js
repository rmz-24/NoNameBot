const { SlashCommandBuilder } = require('discord.js');
const { Coordinates, CalculationMethod, PrayerTimes } = require('adhan');
const geocoder = require('node-geocoder');
const fs = require('fs');
const path = require('path');
const {playAdhan, loadConfig} = require("../../managers/AdhanManager");
const {find} = require('geo-tz');
const moment = require('moment-timezone');

const geo = geocoder({ provider: 'openstreetmap' });

const dataPath = path.join(__dirname, '../../data');
if (!fs.existsSync(dataPath)) fs.mkdirSync(dataPath);

module.exports = {
    data: new SlashCommandBuilder()
        .setName('adhan')
        .setDescription('Gestionnaire de prières')
        .addSubcommand(subcommand =>
            subcommand
                .setName('config')
                .setDescription('Configure le système de prières')
                .addStringOption(option =>
                    option.setName('ville')
                        .setDescription('Nom de votre ville'))
                .addChannelOption(option =>
                    option.setName('salon')
                        .setDescription('Salon pour les annonces'))
                .addStringOption(option =>
                    option.setName('message')
                        .setDescription('Message personnalisé pour les annonces')))
        .addSubcommand(subcommand =>
            subcommand
                .setName('force')
                .setDescription('Force la lecture immédiate de l\'Adhan'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('next')
                .setDescription('Affiche le prochain horaire de prière')),

    async execute(interaction) {
        const guildId = interaction.guildId;
        const configPath = path.join(dataPath, `${guildId}.json`);

        let config = loadConfig(guildId);

        switch (interaction.options.getSubcommand()) {
            case 'config':
                await handleConfig(interaction, config, configPath);
                break;

            case 'force':
                await handleForce(interaction);
                break;

            case 'next':
                await handleNext(interaction, config);
                break;
        }
    },
};

async function handleConfig(interaction, config, configPath) {
    const allowedUserIds = [
        '562335433057370153',
        '523543290377928734',
        '766072533975302185'
    ];

    const isAdmin = interaction.member.permissions.has('ADMINISTRATOR');
    const isAuthorizedUser = allowedUserIds.includes(interaction.user.id);

    if (!isAdmin && !isAuthorizedUser) {
        return interaction.reply({
            content: '❌ Vous n\'avez pas la permission de configurer l\'Adhan !',
            ephemeral: true
        });
    }

    const ville = interaction.options.getString('ville');
    const salon = interaction.options.getChannel('salon');
    const message = interaction.options.getString('message');

    let updateMsg = [];

    if (ville) {
        try {
            const geoData = await geo.geocode(ville);
            if (!geoData[0]) throw new Error('Ville introuvable');

            config.city = geoData[0].city;
            config.coordinates = [geoData[0].latitude, geoData[0].longitude];
            updateMsg.push(`📍 Ville configurée : ${geoData[0].city}`);
        } catch (error) {
            return interaction.reply({ content: '❌ Ville introuvable !', ephemeral: true });
        }
    }

    if (salon) {
        config.channelId = salon.id;
        updateMsg.push(`📢 Salon configuré : ${salon.toString()}`);
    }

    if (message) {
        config.message = message;
        updateMsg.push(`💬 Message personnalisé : ${message}`);
    }

    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

    interaction.reply({
        content: updateMsg.join('\n') || '❌ Aucun paramètre modifié',
        ephemeral: true
    });
}

async function handleForce(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const client = interaction.client;

    try {
        playAdhan(client);
        interaction.editReply('✅ Adhan lancé avec succès !');
    } catch (error) {
        interaction.editReply('❌ Erreur lors de la lecture de l\'Adhan');
    }
}

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
    const remaining = localMoment.fromNow();
    const localTime = localMoment.format('HH:mm');

    interaction.reply({
        content: `🕋 Prochaine prière (**${nextPrayer}**) à ${localTime} (${remaining})`,
        ephemeral: true
    });
}