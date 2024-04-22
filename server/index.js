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

    //transaction with no isolation level: reads only (transaction ensures consistency)
    db.beginTransaction(function (err) {
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

                    db.commit(function (err) {
                        if (err) {
                            return db.rollback(function () {
                                throw err;
                            });
                        }
                        res.send({ printers: resultPrinters, filament: resultFilament, usingFilament: resultUsingFilament });
                    });
                });
            });
        });
    });
});

app.get('/api/getCurrentJob', (req, res) => {
    const printerName = req.query.printerName;
    const sqlSelectCurrentJob = `SELECT jobID FROM printjob WHERE printerName = ? && (status = "active")`;
    //transaction with no isolation level: reads only (transaction ensures consistency)
    db.beginTransaction(function (err) {
        db.query(sqlSelectCurrentJob, [printerName], (err, result) => {
            if (err) {
                console.log(err);
                res.status(500).send("Error accessing printjob current job data");
                return;
            }
            db.commit(function (err) {
                if (err) {
                    return db.rollback(function () {
                        throw err;
                    });
                }
                res.send({ currentJob: result });
            });
        });
    });
});

app.get('/api/getgcode', (req, res) => {

    const jobID = req.query.jobID;
    const sqlSelectgcode = `SELECT gcode, filamentIDLoaded, usage_g FROM printjob WHERE jobID = ?`;

    //transaction with no isolation level: reads only (transaction ensures consistency)
    db.beginTransaction(function (err) {
        db.query(sqlSelectgcode, [jobID], (err, result) => {
            if (err) {
                console.log(err);
                res.status(500).send("Error accessing printjob gcode data");
                return;
            }
            db.commit(function (err) {
                if (err) {
                    return db.rollback(function () {
                        throw err;
                    });
                }
                res.send({ res: result });
            });
        });
    });
});


app.get('/api/getHistory', (req, res) => {
    const printerName = req.query.printerName;
    const sqlSelectHistory = `SELECT * FROM printJob WHERE printerName = ?`

    //transaction with no isolation level: reads only (transaction ensures consistency)
    db.beginTransaction(function (err) {
        db.query(sqlSelectHistory, [printerName], (errHistory, resultHistory) => {
            if (errHistory) {
                console.log(errHistory);
                res.status(500).send("Error accessing printjob gcode data");
                return;
            }
            db.commit(function (err) {
                if (err) {
                    return db.rollback(function () {
                        throw err;
                    });
                }
                res.send({ historyList: resultHistory });
            });
        });
    });
});

app.post('/api/insert', (req, res) => {
    const b = req.body;
    const dateTime = new Date(b.timeStarted);
    const sqlInsert = "INSERT INTO printjob (printerName, gcode, usage_g, timeStarted, filamentIDLoaded, status) VALUES (?,?,?,?,?,?)";

    db.beginTransaction(function (err) {
        db.query(sqlInsert, [b.printerName, b.gcode, b.usage_g, dateTime, b.filamentIDLoaded, b.status], (err, result) => {
            if (err) {
                console.log(err);
                res.status(500).send("Error inserting printer");
                return;
            }
            db.commit(function (err) {
                if (err) {
                    return db.rollback(function () {
                        throw err;
                    });
                }
                res.send(result);
            });
        });
    });
});

app.delete('/api/deleteFilament/:filamentID', (req, res) => {
    const filamentID = req.params.filamentID;
    const sqlDelete = "DELETE FROM filament WHERE filamentID=?";

    db.beginTransaction(function (err) {
        db.query(sqlDelete, filamentID, (err, result) => {
            if (err) {
                console.log(err);
                res.status(500).send("Error deleting printer");
                return;
            }
            db.commit(function (err) {
                if (err) {
                    return db.rollback(function () {
                        throw err;
                    });
                }
                res.send(result);
            });
        });
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
            break;
        case "filament":
            sqlUpdate = `UPDATE filament SET ${column} = ? WHERE filamentID = ?`;
            break;
        default:
            return res.status(400).send("Invalid table");
    }

    db.beginTransaction(function (err) {
        db.query(sqlUpdate, [val, id], (err, result) => {
            if (err) {
                console.log(err);
                res.status(500).send("Error updating database");
                return;
            }
            db.commit(function (err) {
                if (err) {
                    return db.rollback(function () {
                        throw err;
                    });
                }
                res.send(result);
            });
        });
    });
});

app.listen(3001, () => {
    console.log("running on port 3001");
});

