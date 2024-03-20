const express = require('express');
const app = express();
const mysql = require('mysql2');

const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "password",
    database: "printmanagerdb",
});
/*db.connect((err) => {
    if (err) {
      console.error('Error connecting to MySQL:', err);
      return;
    }
    console.log('Connected to MySQL');
  });*/

app.get('/', (req, res) => {
    const sqlInsert = "INSERT INTO printer (printerName, brand) VALUES ('Joseppa', 'Prusa');"
    db.query(sqlInsert, (err, result) => {
        res.send("hello andrew test 2");
    });
});

app.listen(3001, () => {
    console.log("running on port 3001");
});

