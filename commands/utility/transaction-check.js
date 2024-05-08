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
const {hederaRestApiUrl, validationWalletId, verifiedWalletRoleName, tokenIdToDiscordRoles} = require('../../_static/config.json');
const axios = require('axios');
const talkedRecently = new Set();
const WalletVerification = require('../../db/wallet-verification');

module.exports = {
    cooldown: 1000,
    data: new SlashCommandBuilder()
        .setName('verify-wallet')
        .setDescription('Verify your wallet to get your roles.')
        .addSubcommand(subcommand =>
            subcommand
                .setName('verify')
                .setDescription('Wallet verification command.')
                .addStringOption(option =>
                    option.setName('wallet-id')
                        .setRequired(true)
                        .setDescription('Your wallet id, expected format: 0.0.XXXXXXX')))
        .addSubcommand(subcommand =>
            subcommand
                .setName('help')
                .setDescription('Help command!')),

    async execute(interaction) {
        if (interaction.options.getSubcommand() === 'verify') {
            if (this.hasTalkedRecently(interaction)) {
                interaction.reply({
                    content: `Please wait a few moments before trying to verify again.`,
                    ephemeral: true
                });
                return;
            }
            // Adds the user to the set so that they can't talk for a minute
            talkedRecently.add(interaction.user.id);
            setTimeout(() => {
                // Removes the user from the set after a minute
                talkedRecently.delete(interaction.user.id);
            }, 60000); //1 min

            await interaction.deferReply({ephemeral: true});

            let accountId = interaction.options.getString('wallet-id');
            const username = interaction.user.username;
            if (accountId) {
                accountId = this.cleanWalletId(accountId).trim();
                console.log(`Checking for validation transaction for username: ${username}`)
                if (this.validateWalletId(accountId)) {
                    await this.sleep(5000); //5s - delay the check, in case the user is too quick.

                    const accountTransactions = await this.getAccountTransactions(accountId);
                    if (this.doesAccountContainValidationTransaction(accountTransactions, username) === true) {
                        const rolesToAssign = await this.getRolesToAssign(accountId);
                        if (!!verifiedWalletRoleName) {
                            rolesToAssign.push(verifiedWalletRoleName); //Add Verified Wallet role...
                        }

                        for (let roleToAssign of rolesToAssign) {
                            console.log(`Current role: ${roleToAssign}`)
                            let role = interaction.member.guild.roles.cache.find(role => role.name === roleToAssign.trim());
                            if (role) {
                                console.log(`Adding role: ${roleToAssign} to the member: ${username}`);
                                interaction.guild.members.cache.get(interaction.user.id).roles.add(role);
                            }
                        }
                        if (rolesToAssign.length > 0) {
                            console.log(`GUIDID: ${interaction.guildId}`)
                            WalletVerification.createOrUpdateRecord(interaction.guildId, this.cleanUsername(username), accountId, new Date().toISOString(), null);
                            interaction.editReply({
                                content: `Your account is now verified and we've assigned your roles! Username: **${username}**. Wallet ID: **${accountId}**. Roles: **${rolesToAssign.join(", ")}**`,
                                ephemeral: true
                            });
                        } else {
                            interaction.editReply({
                                content: `I am sorry. We could not find any suitable roles for your account id. Username: **${username}**`,
                                ephemeral: true
                            });
                        }
                    } else {
                        interaction.editReply({
                            content: `We are sorry, we could not verify your account. Please make sure the verification transaction has been sent to: **${validationWalletId}** and memo contains your exact Discord username: **${username}**. Try again in a few moments.`,
                            ephemeral: true
                        });
                    }
                } else {
                    await interaction.editReply({
                        content: `The provided account ID is not valid! Please provide your account ID in format: 0.0.123456.`,
                        ephemeral: true
                    });
                }
            }

        } else if (interaction.options.getSubcommand() === 'help') {
            await interaction.reply({
                content: `To verify your wallet send 0.01 HBAR to **${validationWalletId}** with memo containing your Discord username: **${interaction.user.username}**. \nThen use: /verify-wallet verify wallet-id:0.0.YOURWALLETID`,
                ephemeral: true,
                files: [{attachment: 'resources/images/discord-username.png'}]
            });
        }
    },

    getRolesToAssign: async function (accountId) {
        let rolesToAssign = [];
        for (let tokenIdToDiscordRole of tokenIdToDiscordRoles) {
            const accountNFTs = await this.getNFTsForAccount(accountId, tokenIdToDiscordRole.tokenId);
            console.log(`There are: ${accountNFTs.length} NFTs for tokenId: ${tokenIdToDiscordRole.tokenId}`)
            for (let accountNft of accountNFTs) {
                if (accountNft.token_id === tokenIdToDiscordRole.tokenId) {
                    console.log(`Adding role for user: ${tokenIdToDiscordRole.discordRole}`)
                    rolesToAssign[rolesToAssign.length] = tokenIdToDiscordRole.discordRole;
                }
            }
        }
        console.log(`Roles to assign for account ID: ${accountId}, roles: ${rolesToAssign}`)
        return rolesToAssign;
    },

    doesAccountContainValidationTransaction: function (transactions, username) {
        if (!!transactions) {
            console.log(`There are ${transactions.length} transactions to be checked...`)
            for (let i = 0; i < transactions.length; i++) {
                console.log(`There are ${transactions[i].transfers.length} transfers to check...`)
                for (let j = 0; j < transactions[i].transfers.length; j++) {
                    const transfer = transactions[i].transfers[j];
                    console.log(`Looking for account: ${validationWalletId} within transfers account ID: ${transfer.account}`);
                    if (!!transactions[i].memo_base64) {
                        let stringFromTransactionMemo = this.cleanUsername(Buffer.from(transactions[i].memo_base64, 'base64').toString().trim());
                        console.log(`String from transaction memo: ${stringFromTransactionMemo}, username: ${username}`);
                        if (transfer.account === validationWalletId && stringFromTransactionMemo.toLowerCase() === this.cleanUsername(username).toLowerCase()) {
                            console.log(`Found the transaction: ${transactions[i].transaction_id} for account ID: ${transfer.account}`);
                            return true;
                        }
                    }
                }
            }
        }
        console.log(`Could not find transaction for username: ${username}`);
        return false;
    },


    getAccountTransactions: async function (accountId) {
        const options = {
            host: hederaRestApiUrl,
            path: `/api/v1/transactions?transactionType=cryptotransfer&account.id=${accountId}&limit=12&result=success&type=debit`,
        };

        return await axios.get(options.host + options.path)
            .then(response => {
                return response.data.transactions;
            })
            .catch(error => {
                console.error("Could not check mirror node for transactions.");
                return [];
            });
    },

    getNFTsForAccount: async function (accountId, tokenId) {
        const options = {
            host: hederaRestApiUrl,
            path: `/api/v1/accounts/${accountId}/nfts?token.id=${tokenId}&limit=1`
        };

        return await axios.get(options.host + options.path)
            .then(response => {
                const res = response.data.nfts;
                //console.log("Response: " + JSON.stringify(res));
                console.log(`Found total of ${res.length} NFTs for account: ${accountId}`);
                return res;
            })
            .catch(error => {
                console.error(`Could not check mirror for NFTs for account: ${accountId}`);
                console.error(error);
                return [];
            });
    },

    hasTalkedRecently: function (interaction) {
        return talkedRecently.has(interaction.user.id);

    },
    validateWalletId: function (walletId) {
        const valid = (/^(0\.0\.\d{4,7})$/.test(walletId));
        console.debug(`Validating walletId: ${walletId}. Valid: ${valid}`);
        return valid;

    },
    cleanUsername: function (username) {
        const cleanUsername = username.replace(/[^A-Za-z0-9#_\\.]+$/, '');
        console.debug(`Clean cleanUsername: ${cleanUsername}`)
        return cleanUsername;
    },

    cleanWalletId: function (walletId) {
        const cleanWalletId = walletId.replace(/[^0-9]\./gi, '');
        console.debug(`Clean walletId: ${cleanWalletId}`)
        return cleanWalletId;
    },

    sleep: function (ms) {
        return new Promise((resolve) => {
            setTimeout(resolve, ms);
        });

    }
}