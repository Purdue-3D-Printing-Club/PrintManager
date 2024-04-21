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
app.use(bodyParser.urlencoded({ extended: true }));

db.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
        return;
    }
    console.log('Connected to MySQL');
});

app.get('/api/get', (req, res) => {
    const sqlSelectPrinters = "SELECT * FROM printer";
    const sqlSelectFilament = "SELECT * FROM filament";
    const sqlUsingFilament = `SELECT filamentIDLoaded FROM printjob WHERE status = "active"`;

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

            db.query(sqlUsingFilament, (errUsingFilament, resultUsingFilament) => {
                if (errUsingFilament) {
                    console.log(errUsingFilament);
                    res.status(500).send("Error accessing usingFilament data");
                    return;
                }
                res.send({ printers: resultPrinters, filament: resultFilament, usingFilament: resultUsingFilament });
            });
        });
    });
});

app.get('/api/getCurrentJob', (req, res) => {
    const printerName = req.query.printerName;
    const sqlSelectCurrentJob = `SELECT jobID FROM printjob WHERE printerName = ? && (status = "active")`;
    db.query(sqlSelectCurrentJob, [printerName], (err, result) => {
        if (err) {
            console.log(err);
            res.status(500).send("Error accessing printjob current job data");
            return;
        }
        res.send({ currentJob: result });
    });
});

app.get('/api/getgcode', (req, res) => {
    const jobID = req.query.jobID;
    const sqlSelectgcode = `SELECT gcode, filamentIDLoaded FROM printjob WHERE jobID = ? && (status = "active")`;
    db.query(sqlSelectgcode, [jobID], (err, result) => {
        if (err) {
            console.log(err);
            res.status(500).send("Error accessing printjob gcode data");
            return;
        }
        res.send({ res: result });
    });
});

app.get('/api/getHistory', (req, res) => {
    const printerName = req.query.printerName;
    const sqlSelectHistory = `SELECT * FROM printJob WHERE printerName = ?`
    db.query(sqlSelectHistory, [printerName], (errHistory, resultHistory) => {
        if (errHistory) {
            console.log(errHistory);
            res.status(500).send("Error accessing printjob gcode data");
            return;
        }
        res.send({ historyList: resultHistory });
    });
});


/*app.get('/api/getFilamentLoaded', (req, res) => {
    const filamentID = req.query.filamentID;
    const sqlSelectFilament = "SELECT * FROM filament WHERE filamentID = ?";
    db.query(sqlSelectFilament, [filamentID], (err, result) => {
        if (err) {
            console.log(err);
            res.status(500).send("Error accessing printjob current filament data");
            return;
        }
        res.send({ res: result });
    });
});*/

app.post('/api/insert', (req, res) => {
    const b = req.body;
    const dateTime = new Date(b.timeStarted);
    const sqlInsert = "INSERT INTO printjob (printerName, gcode, usage_g, timeStarted, filamentIDLoaded, status) VALUES (?,?,?,?,?,?)";
    db.query(sqlInsert, [b.printerName, b.gcode, b.usage_g, dateTime, b.filamentIDLoaded, b.status], (err, result) => {
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
    const { table, column, val, id } = req.body;
    let sqlUpdate;
    switch (table) {
        case "printer":
            sqlUpdate = `UPDATE printer SET ${column} = ? WHERE printerName = ?`;
            break;
        case "printjob":
            sqlUpdate = `UPDATE printjob SET ${column} = ? WHERE jobID = ?`;
            console.log(sqlUpdate+", val: "+val+", id: "+id+"\n");
            break;
        default:
            return res.status(400).send("Invalid table");
    }
    

    db.query(sqlUpdate, [val, id], (err, result) => {
        if (err) {
            console.log(err);
            res.status(500).send("Error updating database");
            return;
        }
        
        if (table === "printjob") {
            console.log(result);
            console.log("\n");
        }
        res.send(result);
    });
});

app.listen(3001, () => {
    console.log("running on port 3001");
});

