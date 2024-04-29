const {SlashCommandBuilder} = require('discord.js');
const fs = require("node:fs");
const path = require('node:path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('gm')
        .setDescription('Replies with good morning'),
    async execute(interaction) {
        const rnd = this.getRandomInt(1, 6); //TODO replace will count from the resource folder
        await interaction.reply({
            ephemeral: false,
            files: [{attachment: `resources/images/gm/${rnd}.png`}]
        });
    },

    getRandomInt: function (min, max) {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
};

//TODO
/*
function countImages() {
    let length = 0;
    console.debug("GM directory path: " + gmFileFolder);
    fs.readdir(gmFileFolder, (error, files) => {
        if (error) {
            console.log(error);
        } else {
            length = files.length;
        }
    });
    console.log("Length of the GM files: " + length)
    return length
}*/