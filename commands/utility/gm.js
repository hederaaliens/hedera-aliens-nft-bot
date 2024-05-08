/*
 *
 *  * Copyright (C) 2023 Hedera Aliens (hederaaliens@gmail.com)
 *  *
 *  * Licensed under the Apache License, Version 2.0 (the "License");
 *  * you may not use this file except in compliance with the License.
 *  * You may obtain a copy of the License at
 *  *
 *  *         http://www.apache.org/licenses/LICENSE-2.0
 *  *
 *  * Unless required by applicable law or agreed to in writing, software
 *  * distributed under the License is distributed on an "AS IS" BASIS,
 *  * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  * See the License for the specific language governing permissions and
 *  * limitations under the License.
 *
 */

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