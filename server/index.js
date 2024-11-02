require('dotenv').config();
const PORT = process.env.PORT || 3001;
const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const cors = require('cors');
const mysql = require('mysql2');
const isLocal = process.env.ISLOCAL == 'true';
const nodemailer = require('nodemailer')

const pool = isLocal ? mysql.createPool({ // for local development
    host: "localhost",
    user: "root",
    password: "password",
    database: "printmanagerdb2"
}) :
    mysql.createPool({ // for the 3DPC lab
        host: "localhost",
        user: "root",
        password: "supervisor",
        database: "printmanagerdb2"
    })

// Use the following connection for cloud hosting
// mysql.createPool({
//     host: "34.122.154.87",
//     port: "3306",
//     user: "andrewtho5942",
//     password: process.env.PSWD,
//     database: "printmanagerdb" 
// });


app.use(cors());
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
        user: 'purdue3dpcprintjobs@gmail.com',
        pass: process.env.EMAIL_PSWD
    }
});

// Sends an email when called
app.post('/api/send-email', (req, res) => {
    const b = req.body;
    try {
        transporter.sendMail({
            from: 'purdue3dpcprintjobs@gmail.com',
            to: b.to,
            subject: b.subject,
            text: b.text
        }, (error, info) => {
            if (error) {
                return res.status(500).send(error.toString());
            }
            res.send('Email sent: ' + info.response);
        });
    } catch (e) {
        console.log(e);
    }
});



app.get('/api/get', (req, res) => {

    const sqlSelectPrinters = "SELECT * FROM printer";
    //const sqlSelectFilament = "SELECT * FROM filament";
    //const sqlUsingFilament = `SELECT filamentIDLoaded FROM printjob WHERE status = "active"`;

    pool.getConnection((err, connection) => {
        if (err) {
            console.error('Error getting connection from pool:', err);
            res.status(500).send("Error accessing the database");
            return;
        }
        connection.beginTransaction((transactionErr) => {
            if (transactionErr) {
                console.error('Error starting transaction:', transactionErr);
                res.status(500).send("Error starting transaction");
                connection.release();
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
                /*connection.query(sqlSelectFilament, (errFilament, resultFilament) => {
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
                });*/

                res.send({ printers: resultPrinters });
                connection.release();
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

app.get('/api/getjob', (req, res) => {

    const jobID = req.query.jobID;
    const sqlSelectJob = `SELECT * FROM printjob WHERE jobID = ?`;

    pool.getConnection((err, connection) => {
        if (err) {
            console.error('Error getting connection from pool:', err);
            res.status(500).send("Error accessing the database");
            return;
        }

        //transaction with no isolation level: reads only (transaction ensures consistency)
        connection.beginTransaction(function (err) {
            connection.query(sqlSelectJob, [jobID], (err, result) => {
                if (err) {
                    console.log(err);
                    res.status(500).send("Error accessing printjob data");
                    connection.release();
                    return;
                }
                res.send({ res: result });
                connection.release();
            });
        });
    });
});

app.get('/api/getfreq', (req, res) => {
    const sqlSelectFreq = `SELECT printerName, COUNT(*) AS cnt, SUM(usage_g) AS sum FROM printjob GROUP BY printerName`;

    pool.getConnection((err, connection) => {
        if (err) {
            console.error('Error getting connection from pool:', err);
            res.status(500).send("Error accessing the database");
            return;
        }

        //transaction with no isolation level: reads only (transaction ensures consistency)
        connection.beginTransaction(function (err) {
            connection.query(sqlSelectFreq, (err, result) => {
                if (err) {
                    console.log(err);
                    res.status(500).send("Error accessing printjob freq data");
                    connection.release();
                    return;
                }
                res.send({ res: result });
                connection.release();
            });
        });
    });
});

app.get('/api/getsupervisordata', (req, res) => {
    //const sqlSelectSupervisor = `SELECT supervisorName, COUNT(*) AS cnt FROM printjob GROUP BY supervisorName HAVING supervisorName IS NOT NULL`;
    const sqlSelectSupervisor = `
    (SELECT supervisorName, COUNT(*) AS cnt, SUM(usage_g) AS sum 
    FROM printjob 
    WHERE name IS NOT NULL 
    GROUP BY supervisorName 
    HAVING supervisorName IS NOT NULL
    ORDER BY cnt DESC 
    LIMIT 10)
  
    UNION ALL
  
    (SELECT 'Other' AS name, COUNT(*) AS cnt, SUM(usage_g) AS sum 
    FROM printjob 
    WHERE name IS NOT NULL 
    AND name NOT IN (
      SELECT name 
      FROM (SELECT supervisorName
        FROM printjob 
        WHERE name IS NOT NULL 
        GROUP BY supervisorName 
        HAVING supervisorName IS NOT NULL
        ORDER BY COUNT(*) DESC 
        LIMIT 10) AS top_names
    ))
  `;
    pool.getConnection((err, connection) => {
        if (err) {
            console.error('Error getting connection from pool:', err);
            res.status(500).send("Error accessing the database");
            return;
        }

        //transaction with no isolation level: reads only (transaction ensures consistency)
        connection.beginTransaction(function (err) {
            connection.query(sqlSelectSupervisor, (err, result) => {
                if (err) {
                    console.log(err);
                    res.status(500).send("Error accessing printjob supervisor data");
                    connection.release();
                    return;
                }
                res.send({ res: result });
                connection.release();
            });
        });
    });
});

app.get('/api/getfilamentdata', (req, res) => {

    const sqlSelectFilamentData = `
  (SELECT name, COUNT(*) AS cnt, SUM(usage_g) AS sum 
  FROM printjob 
  WHERE name IS NOT NULL 
  GROUP BY name 
  ORDER BY sum DESC 
  LIMIT 10)

  UNION ALL

  (SELECT 'Other' AS name, COUNT(*) AS cnt, SUM(usage_g) AS sum 
  FROM printjob 
  WHERE name IS NOT NULL 
  AND name NOT IN (
    SELECT name 
    FROM (
      SELECT name 
      FROM printjob 
      WHERE name IS NOT NULL 
      GROUP BY name 
      ORDER BY SUM(usage_g) DESC 
      LIMIT 10
    ) AS top_names
  ))
`;

    pool.getConnection((err, connection) => {
        if (err) {
            console.error('Error getting connection from pool:', err);
            res.status(500).send("Error accessing the database");
            return;
        }

        //transaction with no isolation level: reads only (transaction ensures consistency)
        connection.beginTransaction(function (err) {
            connection.query(sqlSelectFilamentData, (err, result) => {
                if (err) {
                    console.log(err);
                    res.status(500).send("Error accessing printjob supervisor data");
                    connection.release();
                    return;
                }
                res.send({ res: result });
                connection.release();
            });
        });
    });
});

app.get('/api/getdailyprints', (req, res) => {
    const sqlSelectDaily = `SELECT DATE(timeStarted) AS date, COUNT(*) AS cnt, SUM(usage_g) AS sum FROM printjob GROUP BY DATE(timeStarted)`;

    pool.getConnection((err, connection) => {
        if (err) {
            console.error('Error getting connection from pool:', err);
            res.status(500).send("Error accessing the database");
            return;
        }

        //transaction with no isolation level: reads only (transaction ensures consistency)
        connection.beginTransaction(function (err) {
            connection.query(sqlSelectDaily, (err, result) => {
                if (err) {
                    console.log(err);
                    res.status(500).send("Error accessing printjob freq data");
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
    const sqlSelectHistory = `SELECT * FROM printjob WHERE printerName = ?`
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
                    res.status(500).send("Error accessing printjob files data");
                    connection.release();
                    return;
                }
                res.send({ historyList: resultHistory });
                connection.release();
            });
        });
    });
});

app.get('/api/getFailureCount', (req, res) => {
    const parts = req.query.parts;
    const name = req.query.name;

    const sqlSelectFailureCount = `SELECT COUNT(*) AS cnt FROM printjob WHERE partNames = ? AND name = ? AND status = "failed"`
    pool.getConnection((err, connection) => {
        if (err) {
            console.error('Error getting connection from pool:', err);
            res.status(500).send("Error accessing the database");
            return;
        }
        //transaction with no isolation level: reads only (transaction ensures consistency)
        connection.beginTransaction(function (err) {
            connection.query(sqlSelectFailureCount, [parts, name], (errFailure, resultFailure) => {
                if (errFailure) {
                    console.log(errFailure);
                    res.status(500).send("Error accessing printjob data");
                    connection.release();
                    return;
                }
                res.send({ count: resultFailure });
                connection.release();
            });
        });
    });
});

app.post('/api/insert', (req, res) => {
    const b = req.body;
    const dateTime = new Date(b.timeStarted);
    const sqlInsert = "INSERT INTO printjob (printerName, files, usage_g, timeStarted, status, name, supervisorName, " +
        "notes, partNames, email, personalFilament) VALUES (?,?,?,?,?,?,?,?,?,?,?)";

    pool.getConnection((err, connection) => {
        if (err) {
            console.error('Error getting connection from pool:', err);
            res.status(500).send("Error accessing the database");
            return;
        }
        connection.beginTransaction(function (err) {
            connection.query(sqlInsert, [b.printerName, b.files, b.usage_g, dateTime, b.status, b.name, b.supervisor,
            b.notes, b.partNames, b.email, b.personalFilament], (err, result) => {
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

app.delete('/api/cancelPrint/:printerName', (req, res) => {
    const printerName = req.params.printerName;
    const sqlDelete = 'DELETE FROM printJob WHERE printerName=? AND status = "active"';
    pool.getConnection((err, connection) => {
        if (err) {
            console.error('Error getting connection from pool:', err);
            res.status(500).send("Error accessing the database");
            return;
        }
        connection.beginTransaction(function (err) {
            connection.query(sqlDelete, printerName, (err, result) => {
                if (err) {
                    console.log(err);
                    res.status(500).send("Error deleting printJob");
                    connection.release();
                    return;
                }
                res.send(result);
                connection.release();
            });
        });
    });
});


app.delete('/api/deleteJob/:jobID', (req, res) => {
    const jobID = req.params.jobID;
    const sqlDelete = 'DELETE FROM printJob WHERE jobID=?';
    pool.getConnection((err, connection) => {
        if (err) {
            console.error('Error getting connection from pool:', err);
            res.status(500).send("Error accessing the database");
            return;
        }
        connection.beginTransaction(function (err) {
            connection.query(sqlDelete, jobID, (err, result) => {
                if (err) {
                    console.log(err);
                    res.status(500).send("Error deleting printJob");
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
            sqlUpdate = `UPDATE printjob SET ${column} = ? WHERE printerName = ? AND status = "active"`;
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

app.put('/api/updateJob', (req, res) => {
    const {  email, files, jobID, name, partNames, personalFilament, status, supervisorName, usage_g, notes } = req.body;
    let sqlUpdate = `UPDATE printjob SET email = ?, files = ?, name = ?, partNames = ?, personalFilament = ?, status = ?, supervisorName = ?, usage_g = ?, notes=? WHERE jobID = ?`;
    
    pool.getConnection((err, connection) => {
        if (err) {
            console.error('Error getting connection from pool:', err);
            res.status(500).send("Error accessing the database");
            return;
        }
        connection.beginTransaction(function (err) {
            connection.query(sqlUpdate, [email, files, name, partNames, personalFilament, status, supervisorName, usage_g, notes, jobID], (err, result) => {
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