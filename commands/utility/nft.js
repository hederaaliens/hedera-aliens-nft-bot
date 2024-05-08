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

const {
    SlashCommandBuilder,
    bold,
    italic,
    strikethrough,
    underscore,
    spoiler,
    quote,
    blockQuote,
    codeBlock
} = require('discord.js');
const fs = require("node:fs");
const path = require('node:path');
const NFTRarity = require('../../db/nft-rarity');
const {EmbedBuilder} = require('discord.js');
const nftCount = NFTRarity.getNftCount();


module.exports = {
    data: new SlashCommandBuilder()
        .setName('nft')
        .setDescription('Shows information about an NFT, ranking and traits.')
        .addSubcommand(subcommand =>
            subcommand
                .setName('serial')
                .setDescription('Look up NFT by serial number')
                .addIntegerOption(option =>
                    option.setName('serial')
                        .setRequired(true)
                        .setDescription('Serial number of the NFT')
                        .setMaxValue(nftCount)
                        .setMinValue(1)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('name')
                .setDescription('Look up NFT by their name')
                .addStringOption(option =>
                    option.setName('name')
                        .setRequired(true)
                        .setMinLength(0)
                        .setMaxLength(35)
                        .setDescription('Name of the NFT'))),

    async execute(interaction) {
        if (interaction.options.getSubcommand() === 'serial') {
            const serialId = this.validateSerialId(interaction.options.getInteger('serial'));
            if (serialId < 1 || serialId > nftCount) {
                interaction.reply({
                    content: `ERROR: There are only ${nftCount} NFTs minted. Please enter serial number within range: 1 - ${nftCount}`,
                    ephemeral: true
                });
                return;
            }
            await interaction.deferReply({ephemeral: false});

            const nft = await NFTRarity.getBySerial(serialId);
            await this.constructReply(nft, interaction);
        }
        else if (interaction.options.getSubcommand() === 'name') {
            const name = this.trimNFTName(interaction.options.getString('name'));

            console.debug("Name: " + name + " is valid: " + this.isNFTNameValid(name));
            if (!this.isNFTNameValid(name) || !name) {
                interaction.reply({
                    content: `${bold("ERROR")}: Please provide valid NFT name, make sure there are no extra characters.`,
                    ephemeral: true
                });
                return;
            }
            const nft = await NFTRarity.getByName(name);

            if (!name || !nft) {
                interaction.reply({
                    content: `${bold("ERROR")}: Could not find NFT by name: ${name}.`,
                    ephemeral: true
                });
                return;
            }
            await interaction.deferReply({ephemeral: false});
            await this.constructReply(nft, interaction);
        }
    },

    constructReply: async function(nft, interaction) {
        const traits = JSON.parse(nft.traits);
        const traitFields = []

        traits.forEach(function (trait) {
            const occurrence = trait.occurrence;
            const blocks = Math.round((occurrence * 100) / 10);
            let bar = "[";
            for (let i = 0; i < blocks; i++) {
                bar += "▓";
            }
            for (let i = 0; i < (10 - blocks); i++) {
                bar += "░";
            }
            bar += "]";

            traitFields.push({
                name: trait.trait_type,
                value: `${trait.value} \n ${bold("Occurrence")} ${bar} ${Math.round(trait.occurrence * 100)}%`,
                inline: true
            })
        });

        const fileNameWithExtension = this.getFileName(nft, traits);
        console.debug("Filename: " + fileNameWithExtension);

        const nftEmbed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle(`NFT: ${nft.name} | Serial: #${nft.serial}`)
            .setDescription(`${bold("Rank")}*: #${nft.rarity_rank}`)
            .addFields(traitFields)
            .setImage(`attachment://${fileNameWithExtension}`)
            .setTimestamp()
            .setFooter({text: '*Ranks may change in the future as collection has not been fully minted.\n*Ranks may differ across platforms based on calculation formula.'});

        await interaction.editReply({
            embeds: [nftEmbed],
            files: [`./resources/images/collection/${fileNameWithExtension}`]
        })
    },

    getFileName: function (nft, traits) {
        const serialPad = this.pad(nft.serial, 4);
        /*
        const isAnimated = traits.filter(trait => {
            console.debug("trait_type: " + trait.trait_type + " value: " + trait.value);
            if (trait.trait_type === "Special Feature" && trait.value === "Animation Glitch") {

                return true;
            }
            return false;
        })*/
        const isAnimated = false; //Discord does not display mp4 files as videos.
        if (isAnimated) {
            return serialPad + ".mp4"
        } else {
            return serialPad + ".png"
        }
    },

    pad: function (num, size) {
        num = num.toString();
        while (num.length < size) num = "0" + num;
        return num;
    },

    validateSerialId: function (serialId) {
        if (Number.isInteger(serialId)) {
            return serialId;
        }
    },

    isNFTNameValid: function (name) {
        if (typeof name === "string") {
            return (/^[a-zA-Z0-9\\.' ]*$/gi).test(name);
        }
        return false;
    },

    trimNFTName: function (name) {
        name = name.trim();
        return name;
    }
}
