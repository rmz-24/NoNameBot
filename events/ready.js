const { Events } = require('discord.js');
const AdhanManager = require('../managers/AdhanManager');
const {scheduleAdhanNotifier} = require("../managers/AdhanManager");

module.exports = {
	name: Events.ClientReady,
	once: true,
	execute(client) {
		console.log(`Ready! Logged in as ${client.user.tag}`);
		scheduleAdhanNotifier(client);
	},
};
