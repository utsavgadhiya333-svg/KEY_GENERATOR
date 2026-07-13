const sqlite3 = require("sqlite3").verbose();

const db = new sqlite3.Database("./database.db");

db.all("SELECT * FROM keys", [], (err, rows) => {
    if (err) {
        console.log(err);
        return;
    }

    console.log(rows);
    db.close();
});