const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const cors = require('cors');
const mysql = require('mysql2');

const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "password",
    database: "printmanagerdb",
});

app.use(cors());
app.use(express.json());
app.use(bodyParser.urlencoded({extended:true}));

db.connect((err) => {
    if (err) {
      console.error('Error connecting to MySQL:', err);
      return;
    }
    console.log('Connected to MySQL');
  });

app.get('/api/get', (req, res) =>{
    const sqlSelect = "SELECT * FROM printer";
    db.query(sqlSelect, (err, result) => {
        res.send(result);
    });
});

app.post('/api/insert', (req, res) => {

    const printerName = req.body.printerName;
    const printerBrand = req.body.printerBrand;

    const sqlInsert = "INSERT INTO printer (printerName, brand) VALUES (?,?)";
    db.query(sqlInsert, [printerName, printerBrand], (err, result) => {
        console.log(result);
    });
});

app.delete('/api/delete/:printerName', (req, res) => {
    const name = req.params.printerName;
    const sqlDelete = "DELETE FROM printer WHERE printerName=?";

    db.query(sqlDelete, name, (err, res) => {
        if (err) console.log(err);
    });
});

app.put('/api/update', (req, res) => {
    const name = req.body.printerName;
    const brand = req.body.printerBrand;
    const sqlUpdate = "UPDATE printer SET brand = ? WHERE printerName = ?";

    db.query(sqlUpdate, [brand, name], (err, res) => {
        if (err) console.log(err);
    });
});

app.listen(3001, () => {
    console.log("running on port 3001");
});

