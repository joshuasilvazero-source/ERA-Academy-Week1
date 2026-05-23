require("dotenv").config();
const mysql = require("mysql2");
const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: process.env.DB_PASSWORD || "",
    database: "school_demo"
});
db.connect((error) => {
    if (error) {
        console.error("MySQL connection failed:", error);
       return;
    }
    console.log("Connected to MySQl");
});
module.exports = db;