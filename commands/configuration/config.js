/**
 * @author waSStyle
 */

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const geocoder = require('node-geocoder');
const fs = require('fs');
const path = require('path');
const {loadConfig, saveConfig} = require("../../managers/ConfigManager");
const {startSchedulerForGuild, playAdhan} = require("../../managers/AdhanManager");
const geo = geocoder({ provider: 'openstreetmap' });

const dataPath = path.join(__dirname, '../../data');
if (!fs.existsSync(dataPath)) fs.mkdirSync(dataPath);

module.exports = {
    data: new SlashCommandBuilder()
        .setName('config')
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
                        .setDescription('Message personnalisé pour les annonces'))
                .addRoleOption(option =>
                    option.setName('role')
                        .setDescription('Rôle à mentionner pour les notifications')))
        .addSubcommand(subcommand =>
            subcommand
                .setName('force')
                .setDescription('Force la lecture immédiate de l\'Adhan'))
        /*.setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)*/,

    async execute(interaction) {
        const guildId = interaction.guildId;
        let config = loadConfig(guildId);

        switch (interaction.options.getSubcommand()) {
            case 'config':
                await handleConfig(interaction, config);
                break;

            case 'force':
                await handleForce(interaction);
                break;

            case 'enable':
                await handleEnable(interaction, config);
                break;
        }
    },
};

async function handleConfig(interaction, config) {

    const allowedUserIds = [
        '562335433057370153',
        '523543290377928734',
        '766072533975302185'
    ];
    const isAuthorizedUser = allowedUserIds.includes(interaction.user.id);

    if (!isAuthorizedUser) {
        return interaction.reply({
            content: '❌ Vous n\'avez pas la permission de configurer l\'Adhan !',
            ephemeral: true
        });
    }

    const ville = interaction.options.getString('ville');
    const salon = interaction.options.getChannel('salon');
    const message = interaction.options.getString('message');
    const role = interaction.options.getRole('role');

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

    if (role) {
        config.roleId = role.id;
        updateMsg.push(`🔔 Rôle configuré : ${role.toString()}`);
    } else if (!config.roleId) {
        let adhanRole = interaction.guild.roles.cache.find(r => r.name === 'Adhan');
        if (!adhanRole) {
            try {
                adhanRole = await interaction.guild.roles.create({
                    name: 'Adhan',
                    color: '#0099ff',
                    reason: 'Rôle pour les notifications Adhan'
                });
                updateMsg.push(`🎭 Rôle créé : ${adhanRole.toString()}`);
            } catch (error) {
                return interaction.reply({ content: '❌ Erreur lors de la création du rôle !', ephemeral: true });
            }
        }
        config.roleId = adhanRole.id;
    }
    saveConfig(interaction.guildId, config);
    // Refreshing Adhan's scheduler for the guild
    try {
      startSchedulerForGuild(interaction.client, interaction.guildId);
    } catch (error) {
        console.error("Error when refreshing scheduler");
    }

    interaction.reply({
        content: updateMsg.join('\n') || '❌ Aucun paramètre modifié',
        ephemeral: true
    });
}

async function handleForce(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const client = interaction.client;
    try {
        playAdhan(client,interaction.guildId);
        interaction.editReply('✅ Adhan lancé avec succès !');
    } catch (error) {
        interaction.editReply('❌ Erreur lors de la lecture de l\'Adhan');
    }
}