const {sqliteDbPath} = require('../_static/config.json');
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database(sqliteDbPath, [sqlite3.OPEN_CREATE, sqlite3.OPEN_READWRITE], function (error) {
    console.error(error);
});

const WALLRT_VERIFICATION_DDL = "CREATE TABLE IF NOT EXISTS wallet_verification (" +
    "guild_id TEXT NOT NULL, " +
    "discord_username TEXT NOT NULL, " +
    "wallet_id TEXT NOT NULL, " +
    "first_verification_date TEXT NOT NULL, " +
    "last_verification_date TEXT, " +
    "PRIMARY KEY (guild_id, discord_username));"

class WalletVerification {
    static initTable () {
        db.serialize(() => {
            db.run(WALLRT_VERIFICATION_DDL);
        });
    }

    static createOrUpdateRecord(guild, username, walletId, firstVerificationDate, lastVerificationDate) {
        db.serialize(() => {
            const stmt = db.prepare("INSERT OR REPLACE INTO wallet_verification " +
                "(guild_id, discord_username, wallet_id, first_verification_date, last_verification_date) VALUES (?, ?, ?, ?, ?)");
            stmt.run(guild, username, walletId, firstVerificationDate, lastVerificationDate);
            stmt.finalize();

        });
    }

    static close() {
        db.close()
    }
}

module.exports = WalletVerification;