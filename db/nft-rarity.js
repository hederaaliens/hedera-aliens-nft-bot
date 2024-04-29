const {sqliteDbPath} = require('../_static/config.json');
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database(sqliteDbPath, [sqlite3.OPEN_CREATE, sqlite3.OPEN_READWRITE], function (error) {
    console.error(error);
});
require('require-json5');
const nfts = require('../resources/nfts.json5');

const NFT_RARITY_DELETE_SQL = "DROP TABLE IF EXISTS nft_rarity";
const NFT_RARITY_DDL = "CREATE TABLE IF NOT EXISTS nft_rarity (" +
    "serial INTEGER NOT NULL, " +
    "name TEXT NOT NULL, " +
    "rarity_rank INTEGER NOT NULL, " +
    "traits TEXT NOT NULL, " +
    "PRIMARY KEY (serial));";

class NftRarity {
    static init() {
        console.debug("Initializing NFT rarity tables...");
        db.serialize(() => {
            db.run(NFT_RARITY_DELETE_SQL);
        });
        db.serialize(() => {
            db.run(NFT_RARITY_DDL);
        });
        this.insertAllNFTs();
        console.log("Initialization done...");
    }

    static insertRow(serial, name, rarity_rank, traits) {
        db.serialize(() => {
            const stmt = db.prepare("INSERT OR REPLACE INTO nft_rarity " +
                "(serial, name, rarity_rank, traits) VALUES (?, ?, ?, ?)");
            stmt.run(serial, name, rarity_rank, traits);
            stmt.finalize();

        });
    }

    static async getBySerial(serialId) {
        console.debug(`Looking for NFT with serial number: ${serialId}`)
        // first row only
        const sql = "SELECT serial, name, rarity_rank, traits FROM nft_rarity WHERE serial = ?;"

        const rows = await new Promise(function (resolve, reject) {
            db.get(sql, [serialId], function (err, rows) {
                if (err) {
                    return reject(err);
                }
                resolve(rows);
            });
        });
        console.debug(`Search result for serial: ${serialId} ${JSON.stringify(rows)}}`)

        const result = !!(rows)
        if (result) {
            return rows;
        }
        return null;
    }

    static async getByName(name) {
        console.debug(`Looking for NFT with name: ${name}`)
        // first row only
        const sql = "SELECT serial, name, rarity_rank, traits FROM nft_rarity WHERE name = ? COLLATE NOCASE;";

        const rows = await new Promise(function (resolve, reject) {
            db.get(sql, [name], function (err, rows) {
                if (err) {
                    return reject(err);
                }
                resolve(rows);
            });
        });
        console.debug(`Search result for name: ${name} ${JSON.stringify(rows)}}`)
        const result = !!(rows)
        if (result) {
            return rows;
        }
        return null;
    }

    static insertAllNFTs() {
        const _this = this;
        nfts.forEach(function(nft) {
            _this.insertRow(nft.serial, nft.name, nft.rank, nft.traits)
        })
    }

    static createOrUpdateRecord(guild, username, walletId, firstVerificationDate, lastVerificationDate) {
        db.serialize(() => {
            const stmt = db.prepare("INSERT OR REPLACE INTO wallet_verification " +
                "(guild_id, discord_username, wallet_id, first_verification_date, last_verification_date) VALUES (?, ?, ?, ?, ?)");
            stmt.run(guild, username, walletId, firstVerificationDate, lastVerificationDate);
            stmt.finalize();

        });
    }
    static getNftCount() {
        return nfts.length;
    }

    static close() {
        db.close()
    }
}

module.exports = NftRarity;