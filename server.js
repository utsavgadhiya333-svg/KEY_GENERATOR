const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const cors = require("cors");
const path = require("path"); // 👈 HTML ફાઇલનો પાથ સેટ કરવા માટે આ ઉમેર્યું છે

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ૧. આ લાઇન સર્વરને તમારા ફોલ્ડરમાં રહેલી બધી ફાઇલો (HTML, CSS, JS) એક્સેસ કરવા દેશે
app.use(express.static(path.join(__dirname))); 

// Database
const db = new sqlite3.Database("./database.db", (err) => {
    if (err) {
        console.log("Database Error:", err.message);
    } else {
        console.log("✅ Database Connected");
    }
});

// Create Table
db.run(`
CREATE TABLE IF NOT EXISTS keys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT UNIQUE,
    plan TEXT,
    device_id TEXT,
    status TEXT DEFAULT 'unused',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME
)
`);

// ૨. ટેસ્ટ API બદલીને અહીં utsav.html લોડ કરવાનું સેટ કર્યું
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "utsav.html"));
});

// Generate Key API
app.post("/generate-key", (req, res) => {

    const { plan } = req.body;

    const random = Math.random().toString(36).substring(2,10).toUpperCase();
    const key = "UTSAV_X_PRIME_" + random;

    let days = 0;

    if(plan === "1 Day") days = 1;
    else if(plan === "7 Days") days = 7;
    else if(plan === "15 Days") days = 15;
    else if(plan === "Permanent") days = 36500;

    const expires = new Date();
    expires.setDate(expires.getDate() + days);

    db.run(
        "INSERT INTO keys (key, plan, expires_at) VALUES (?, ?, ?)",
        [key, plan, expires.toISOString()],
        function(err){

            if(err){
                return res.status(500).json({
                    success:false,
                    error:err.message
                });
            }

            res.json({
                success:true,
                key:key,
                plan:plan,
                expires:expires
            });

        }
    );

});

// Activate Key API
app.post("/activate-key", (req, res) => {

    const { key, device_id } = req.body;

    db.get(
        "SELECT * FROM keys WHERE key = ?",
        [key],
        (err, row) => {

            if (err) {
                return res.json({
                    success:false,
                    message:"Database Error"
                });
            }

            if (!row) {
                return res.json({
                    success:false,
                    message:"Invalid Key"
                });
            }

            if (row.status === "disabled") {
                return res.json({
                    success:false,
                    message:"Key is disabled"
                });
            }

            if (row.device_id && row.device_id !== device_id) {
                return res.json({
                    success:false,
                    message:"Key already used on another device"
                });
            }

            db.run(
                "UPDATE keys SET device_id=?, status='active' WHERE key=?",
                [device_id, key],
                () => {

                    res.json({
                        success:true,
                        message:"Key Activated"
                    });

                }
            );

        }
    );

});

// Get All Keys API
app.get("/all-keys", (req, res) => {

    db.all("SELECT * FROM keys ORDER BY id DESC", [], (err, rows) => {

        if(err){
            return res.json({
                success:false,
                error:err.message
            });
        }

        res.json({
            success:true,
            keys:rows
        });

    });

});

// Disable Key API
app.post("/disable-key", (req, res) => {

    const { key } = req.body;

    db.run(
        "UPDATE keys SET status='disabled' WHERE key=?",
        [key],
        function(err){

            if(err){
                return res.json({
                    success:false,
                    message:err.message
                });
            }

            res.json({
                success:true,
                message:"Key Disabled"
            });

        }
    );

});

// Delete Key API
app.post("/delete-key", (req, res) => {

    const { key } = req.body;

    db.run(
        "DELETE FROM keys WHERE key=?",
        [key],
        function(err){

            if(err){
                return res.json({
                    success:false,
                    message:err.message
                });
            }

            res.json({
                success:true,
                message:"Key Deleted"
            });

        }
    );

});

// Start Server
app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server Running on port ${PORT}`);
});