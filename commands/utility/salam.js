const { SlashCommandBuilder, time } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("salam")
        .setDescription("Replies with salam"),
    async execute(interaction) {
        if(interaction.user.id == '562335433057370153'){
            await interaction.reply("Salam wassim!");
            setTimeout(() => {
                interaction.editReply("Khlass 9wd douka!");
            }, 3000);
        } else {
            await interaction.reply("Salam !");
        }
    },
};