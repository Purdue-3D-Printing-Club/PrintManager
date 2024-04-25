const PORT = process.env.PORT || 3001; // Use the port specified by Render or default to 3001
const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const cors = require('cors');
const mysql = require('mysql2');

const pool = mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "password",
    database: process.env.DB_NAME || "printmanagerdb",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

app.use(cors());
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

//pool.connect((err) => {
//    if (err) {
//        console.error('Error connecting to MySQL:', err);
//        return;
//    }
//    console.log('Connected to MySQL');
//});

app.get('/api/get', (req, res) => {

    const sqlSelectPrinters = "SELECT * FROM printer";
    const sqlSelectFilament = "SELECT * FROM filament";
    const sqlUsingFilament = `SELECT filamentIDLoaded FROM printjob WHERE status = "active"`;

    pool.getConnection((err, connection) => {
        if (err) {
            console.error('Error getting connection from pool:', err);
            res.status(500).send("Error accessing the database");
            return;
        }

        //transaction with no isolation level: reads only (transaction ensures consistency)
        connection.query(sqlSelectPrinters, (errPrinters, resultPrinters) => {
            if (errPrinters) {
                console.log(errPrinters);
                res.status(500).send("Error accessing printer data");
                connection.release();
                return;
            }
            connection.query(sqlSelectFilament, (errFilament, resultFilament) => {
                if (errFilament) {
                    console.log(errFilament);
                    res.status(500).send("Error accessing filament data");
                    connection.release();
                    return;
                }

                connection.query(sqlUsingFilament, (errUsingFilament, resultUsingFilament) => {
                    if (errUsingFilament) {
                        console.log(errUsingFilament);
                        res.status(500).send("Error accessing usingFilament data");
                        connection.release();
                        return;
                    }
                    res.send({ printers: resultPrinters, filament: resultFilament, usingFilament: resultUsingFilament });
                    connection.release();
                });
            });
        });
    });
});

app.get('/api/getCurrentJob', (req, res) => {
    const printerName = req.query.printerName;
    const sqlSelectCurrentJob = `SELECT jobID FROM printjob WHERE printerName = ? && (status = "active")`;

    pool.getConnection((err, connection) => {
        if (err) {
            console.error('Error getting connection from pool:', err);
            res.status(500).send("Error accessing the database");
            return;
        }
        //transaction with no isolation level: reads only (transaction ensures consistency)
        connection.beginTransaction(function (err) {
            connection.query(sqlSelectCurrentJob, [printerName], (err, result) => {
                if (err) {
                    console.log(err);
                    res.status(500).send("Error accessing printjob current job data");
                    connection.release();

                    return;
                }
                res.send({ currentJob: result });
                connection.release();
            });
        });
    });
});

app.get('/api/getgcode', (req, res) => {

    const jobID = req.query.jobID;
    const sqlSelectgcode = `SELECT gcode, filamentIDLoaded, usage_g FROM printjob WHERE jobID = ?`;

    pool.getConnection((err, connection) => {
        if (err) {
            console.error('Error getting connection from pool:', err);
            res.status(500).send("Error accessing the database");
            return;
        }

        //transaction with no isolation level: reads only (transaction ensures consistency)
        connection.beginTransaction(function (err) {
            connection.query(sqlSelectgcode, [jobID], (err, result) => {
                if (err) {
                    console.log(err);
                    res.status(500).send("Error accessing printjob gcode data");
                    connection.release();
                    return;
                }
                res.send({ res: result });
                connection.release();
            });
        });
    });
});


app.get('/api/getHistory', (req, res) => {
    const printerName = req.query.printerName;
    const sqlSelectHistory = `SELECT * FROM printJob WHERE printerName = ?`
    pool.getConnection((err, connection) => {
        if (err) {
            console.error('Error getting connection from pool:', err);
            res.status(500).send("Error accessing the database");
            return;
        }
        //transaction with no isolation level: reads only (transaction ensures consistency)
        connection.beginTransaction(function (err) {
            connection.query(sqlSelectHistory, [printerName], (errHistory, resultHistory) => {
                if (errHistory) {
                    console.log(errHistory);
                    res.status(500).send("Error accessing printjob gcode data");
                    connection.release();
                    return;
                }
                res.send({ historyList: resultHistory });
                connection.release();
            });
        });
    });
});

app.post('/api/insert', (req, res) => {
    const b = req.body;
    const dateTime = new Date(b.timeStarted);
    const sqlInsert = "INSERT INTO printjob (printerName, gcode, usage_g, timeStarted, filamentIDLoaded, status) VALUES (?,?,?,?,?,?)";

    pool.getConnection((err, connection) => {
        if (err) {
            console.error('Error getting connection from pool:', err);
            res.status(500).send("Error accessing the database");
            return;
        }
        connection.beginTransaction(function (err) {
            connection.query(sqlInsert, [b.printerName, b.gcode, b.usage_g, dateTime, b.filamentIDLoaded, b.status], (err, result) => {
                if (err) {
                    console.log(err);
                    res.status(500).send("Error inserting printer");
                    connection.release();
                    return;
                }
                res.send(result);
                connection.release();
            });
        });
    });
});

app.delete('/api/deleteFilament/:filamentID', (req, res) => {
    const filamentID = req.params.filamentID;
    const sqlDelete = "DELETE FROM filament WHERE filamentID=?";
    pool.getConnection((err, connection) => {
        if (err) {
            console.error('Error getting connection from pool:', err);
            res.status(500).send("Error accessing the database");
            return;
        }
        connection.beginTransaction(function (err) {
            connection.query(sqlDelete, filamentID, (err, result) => {
                if (err) {
                    console.log(err);
                    res.status(500).send("Error deleting printer");
                    connection.release();
                    return;
                }
                res.send(result);
                connection.release();
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
    pool.getConnection((err, connection) => {
        if (err) {
            console.error('Error getting connection from pool:', err);
            res.status(500).send("Error accessing the database");
            return;
        }
        connection.beginTransaction(function (err) {
            connection.query(sqlUpdate, [val, id], (err, result) => {
                if (err) {
                    console.log(err);
                    res.status(500).send("Error updating database");
                    connection.release();
                    return;
                }

                res.send(result);
                connection.release();
            });
        });
    });
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

