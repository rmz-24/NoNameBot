const { SlashCommandBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("salam")
        .setDescription("Replies with salam"),
    async execute(interaction) {
        await interaction.reply("salam");
    },
};