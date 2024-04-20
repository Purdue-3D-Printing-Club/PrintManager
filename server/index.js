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
    const sqlSelectPrinters = "SELECT * FROM printer";
    const sqlSelectFilament = "SELECT * FROM filament";

    db.query(sqlSelectPrinters, (errPrinters, resultPrinters) => {
        if (errPrinters) {
            console.log(errPrinters);
            res.status(500).send("Error accessing printer data");
            return;
        }
        db.query(sqlSelectFilament, (errFilament, resultFilament) => {
            if (errFilament) {
                console.log(errFilament);
                res.status(500).send("Error accessing filament data");
                return;
            }

            res.send({printers:resultPrinters, filament:resultFilament});
        });
    });
    

});

app.post('/api/insert', (req, res) => {
    const b = req.body;
    console.log(b);
    const sqlInsert = "INSERT INTO printJob (printerName, gcode, usage_g, filamentIDLoaded) VALUES (?,?,?,?)";
    db.query(sqlInsert, [b.printerName, b.gcode, b.usage_g,/* b.timeStarted,*/ b.filamentIDLoaded], (err, result) => {
        if (err) {
            console.log(err);
            res.status(500).send("Error inserting printer");
            return;
        }
        res.send(result);
    });
});

app.delete('/api/delete/:printerName', (req, res) => {
    const name = req.params.printerName;
    const sqlDelete = "DELETE FROM printer WHERE printerName=?";

    db.query(sqlDelete, name, (err, result) => {
        if (err) {
            console.log(err);
            res.status(500).send("Error deleting printer");
            return;
        }
        res.send(result);
    });
});

app.put('/api/update', (req, res) => {
    const name = req.body.printerName;
    const brand = req.body.printerBrand;
    const sqlUpdate = "UPDATE printer SET brand = ? WHERE printerName = ?";

    db.query(sqlUpdate, [brand, name], (err, result) => {
        if (err) {
            console.log(err);
            res.status(500).send("Error deleting printer");
            return;
        }
        res.send(result);
    });
});

app.listen(3001, () => {
    console.log("running on port 3001");
});

