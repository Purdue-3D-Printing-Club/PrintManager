require('dotenv').config();
const PORT = process.env.PORT || 3001;
const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const cors = require('cors');
const mysql = require('mysql2');
const isLocal = process.env.ISLOCAL == 'true';
const { ClientSecretCredential } = require('@azure/identity');
const credential = new ClientSecretCredential(process.env.TENANT_ID, process.env.CLIENT_ID, process.env.CLIENT_SECRET);

const { Client } = require('@microsoft/microsoft-graph-client');
require('isomorphic-fetch');
const fetch = require('node-fetch');
const path = require('path');

//google drive / file system
const fs = require('fs-extra');
const { google } = require('googleapis');

const temp_folder = 'gdrive_uploads';
const keyPath = process.env.GDRIVE_KEY_PATH;
const gdriveFolderID = process.env.GDRIVE_FOLDER_ID;
let drive = createGdriveAuth(keyPath);

const multer = require('multer');
const upload = multer({ dest: `${temp_folder}/` });

// puppeteer web scraping
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { randomInt } = require('crypto');
puppeteer.use(StealthPlugin());


function createGdriveAuth(keyPath) {
    //console.log('keyPath: ', keyPath)
    const auth = new google.auth.GoogleAuth({
        credentials: require(keyPath),
        scopes: ['https://www.googleapis.com/auth/drive.file'],
    });

    return google.drive({ version: 'v3', auth });
}


async function getGraphClient() {
    const tokenResponse = await credential.getToken("https://graph.microsoft.com/.default");

    if (!tokenResponse || !tokenResponse.token) {
        throw new Error("Failed to obtain access token.");
    }

    return Client.init({
        authProvider: (done) => {
            done(null, tokenResponse.token);
        }
    });
}


const pool = isLocal ? mysql.createPool({ // for local development
    host: "localhost",
    user: "root",
    password: "rootpassword",
    database: "printmanagerdb2"
}) :
    mysql.createPool({ // for the 3DPC lab
        host: "localhost",
        user: "root",
        password: "supervisor",
        database: "printmanagerdb2"
    })

app.use(cors());
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));



// Endpoint to get the STL file name using the google drive API
// app.get('/api/getFilename', async (req, res) => {
//     try{

//     const { link } = req.query;
//     if (!link) {
//         return res.status(400).send('Missing url parameter');
//     }

//     const fileId = getFileID(link);
//     console.log('fileID:',fileId);
//     const response = await drive.files.get({
//         fileId,
//         fields: 'name'
//       });

//       console.log('got filename:',response.data.name)
//       res.send({filename:response.data.name});
//     }catch(e){
//         console.error('ERROR in getFilename:',e);
//         return res.status(400).send('Error getting filename');
//     }
// });



// Sends an email from purdue graph api when called
app.post('/api/send-email', async (req, res) => {
    const { to, subject, text } = req.body;

    const client = await getGraphClient();

    try {
        await client.api(`/users/${process.env.PURDUE_EMAIL}/sendMail`).post({
            message: {
                subject: subject,
                body: {
                    contentType: "Text",
                    content: text + '\n\nThis was an automated email sent by the lab organizer.'
                },
                toRecipients: [{ emailAddress: { address: to } }],
            },
            saveToSentItems: false
        });

        res.send('Email sent successfully');
    } catch (error) {
        console.error("Graph API Error:", error);
        res.status(500).send(error.toString());
    }
});

// function to upload a file to Google Drive
async function uploadFile(filePath, fileName, drive) {
    try {
        const response = await drive.files.create({
            resource: {
                name: fileName,
                parents: [gdriveFolderID]
            },
            media: {
                mimeType: 'application/octet-stream',
                body: fs.createReadStream(filePath)
            },
            fields: 'id'
        });

        //console.log(`File '${fileName}' uploaded successfully to the downloads folder!`);

        // Return the file ID from the response
        return response.data.id;
    } catch (error) {
        console.error('Error uploading file:', error);
        throw error;
    }
}

app.post('/api/upload', upload.single('file'), async (req, res) => {
    //console.log('\nnew upload request detected')
    const { file } = req;
    if (!file) {
        return res.status(400).json({ error: 'No file provided' });
    }

    try {
        const driveResponse = await uploadFile(file.path, file.originalname, drive);
        // construct the shareable link
        const fileLink = `https://drive.google.com/open?id=${driveResponse}`;

        res.send({ fileLink: fileLink });
    } catch (error) {
        console.error('error:', error)
        res.status(500).json({ success: false, error: error.message });
    } finally {
        // delete the temporary file
        fs.unlink(file.path, (err) => {
            if (err) console.error(`Error deleting temp file ${file.path}:`, err);
        });
    }
});


function getFileID(link) {
    const regex = /id=([^/]+)/;
    const match = link.match(regex);
    if (match && match[1]) {
        return match[1];
    }
    return null;
}

function getDirectLink(link) {
    const id = getFileID(link);
    if (id) {
        return `https://drive.google.com/uc?export=download&id=${id}`;
    }
    return link;
}


app.get('/api/stream-stl', async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    const { url } = req.query;
    if (!url) {
        return res.status(400).send('Missing url parameter');
    }

    const directUrl = getDirectLink(url);
    console.log('directUrl:', directUrl);
    try {
        const response = await fetch(directUrl);
        if (!response.ok) {
            return res.status(500).send('Error fetching the STL file from Google Drive');
        }

        // Option 1: Buffer the response, then send it:
        const buffer = await response.buffer();

        // Set the Content-Type header explicitly
        res.setHeader('Content-Type', response.headers.get('content-type') || 'application/octet-stream');
        res.send(buffer);

        // Option 2: If the file is too large to buffer entirely,
        // you may need to pipe the stream and ensure no conflicting headers are included.
        // In that case, you might want to remove or override any headers from Google Drive's response.
        // For example:
        // res.setHeader('Content-Type', 'application/octet-stream');
        // response.body.on('data', chunk => res.write(chunk));
        // response.body.on('end', () => res.end());

    } catch (err) {
        console.error('Error:', err);
        res.status(500).send('Server error');
    }
});


async function getPrintLinks(browser) {
    const homePage = await browser.newPage();

    console.log('\nscraper: going to printables..')
    await homePage.goto('https://www.printables.com/model', { waitUntil: 'domcontentloaded' });

    console.log('waiting for card-images to load..')
    // Wait for the popular items to load. Adjust the selector to one that exists on the page.
    await homePage.waitForSelector('[class*="card-image"]');


    // Evaluate the page to extract information from the first popular STL file.
    console.log('evaluating page')
    const printLinks = await homePage.evaluate(() => {
        const items = document.querySelectorAll('[class*="h clamp-two-lines"]');
        let tagList = Array.from(items).map(item => item.outerHTML);

        return tagList.map(htmlString => {
            const regexName = />([^<]+)</;
            const matchName = htmlString.match(regexName);

            const regex = /href="([^"]+)"/;
            const match = htmlString.match(regex);
            return { 'link': match ? ("https://printables.com" + match[1] + "/files") : null, 'name': matchName[1] };
        }).filter(id => id !== null);
    });
    return printLinks;
}

async function getDownloadLinks(browser, printLinks) {
    let dlLinks = []
    let pageIndex = randomInt(0, printLinks.length);
    let cookieClicked = false;

    while (dlLinks.length === 0) {
        try {
            const printPage = await browser.newPage();

            console.log(`\ngoing to print page ${pageIndex} -- ${printLinks[pageIndex].link}...`)
            await printPage.goto(printLinks[pageIndex].link, { waitUntil: 'domcontentloaded' });

            if (!cookieClicked) {
                //click the accept cookies button so that it gets out of the way of the download buttons
                console.log('\nwaiting for cookie btn...')
                await printPage.waitForSelector('[id*="onetrust-accept-btn-handler"]', { timeout: 15000 });
                await printPage.click('[id*="onetrust-accept-btn-handler"]');
                await new Promise(resolve => setTimeout(resolve, 250));
                console.log('clicked cookie btn...')
                cookieClicked = true;
            }


            console.log('\nwaiting for download buttons...')
            await printPage.waitForSelector('[class*="btn-download"]', { timeout: 15000 });
            let dlBtns = await printPage.$$('[class*="btn-download"]')

            console.log('buttons:', dlBtns.length);

            console.log('\n\n Loading new page for each download button');
            const promises = [];

            // Assuming dlBtns is an array or iterable with buttons to click
            for (let btnNum = 0; btnNum < dlBtns.length && btnNum < 6; btnNum++) {
                promises.push((async (btnNum) => {
                    try {
                        console.log('Opening page ', btnNum);

                        // create a new browser for each download 
                        // TODO: Make this more efficient!
                        const browser = await puppeteer.launch({ headless: true, executablePath: process.env.CHROME_PATH });
                        const printDLPage = await browser.newPage();

                        // const printDLPage = await browser.newPage();


                        // Listen for download requests on this page
                        await printDLPage.setRequestInterception(true);
                        printDLPage.on('request', request => {
                            if(request.url().includes('files.printables.com')) console.log('Intercepted download request:', request.url());
                                
                            if (request.url().includes('files.printables.com') && request.url().includes('.stl')) {
                                console.log('Intercepted download request:', request.url());
                                dlLinks.push(request.url());
                                request.abort(); // Abort the download request, we just want the link.
                            } else {
                                request.continue();
                            }
                        });

                        console.log('Going to print download page...');
                        await printDLPage.goto(printLinks[pageIndex].link, { waitUntil: 'domcontentloaded' });


                        //click the accept cookies button so that it gets out of the way of the download buttons
                        console.log('\nwaiting for cookie btn...')
                        await printDLPage.waitForSelector('[id*="onetrust-accept-btn-handler"]', { timeout: 15000 });
                        await printDLPage.click('[id*="onetrust-accept-btn-handler"]');
                        await new Promise(resolve => setTimeout(resolve, 250));
                        console.log('clicked cookie btn...')
                        cookieClicked = true;


                        console.log('Waiting for download buttons...');
                        await printDLPage.waitForSelector('[class*="btn-download"]', { timeout: 15000 });
                        const curDLBtns = await printDLPage.$$('[class*="btn-download"]');


                        // Click the appropriate download button
                        await curDLBtns[btnNum].click();

                    } catch (error) {
                        if (error.name === 'TimeoutError') {
                            console.log('ERROR: Timeout occurred while getting handling print download button.');
                        } else {
                            throw error;
                        }
                    }
                })(btnNum));
            }

            // Execute all promises concurrently, wait for them all to finish here
            await Promise.all(promises);


            console.log('waiting for timeout...')
            await new Promise(resolve => setTimeout(resolve, 1000));


        } catch (error) {
            if (error.name === 'TimeoutError') {
                console.log('ERROR: Timeout occurred while getting download links.');
            } else {
                throw error;
            }
        }
        if (dlLinks.length === 0) {
            console.log('incrementing page index...')
            pageIndex++;
        }
    }
    console.log('done');
    return ({ 'partLinks': dlLinks, 'pageLink': printLinks[pageIndex].link, 'pageName': printLinks[pageIndex].name });
}

app.get('/api/getDailyPrint', async (req, res) => {
    async function getDailyPrint() {
        try {
            const browser = await puppeteer.launch({ headless: true, executablePath: process.env.CHROME_PATH });
            const printLinks = await getPrintLinks(browser);

            //printLinks = ['https://www.printables.com/model/1138664-lumo-headphone-stand/files']
            console.log('got links: ', printLinks);

            let linkObj = await getDownloadLinks(browser, printLinks);

            await browser.close();

            console.log('Part Links: ', linkObj.partLinks);
            return linkObj;
        } catch (e) {
            console.error('Error in getDailyPrint: ', e);
            return [];
        }
    }
    let retObj = await getDailyPrint();
    res.send(retObj);
});

app.get('/api/get', (req, res) => {

    const sqlSelectPrinters = "SELECT * FROM printer";

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
                res.send({ printers: resultPrinters });
                connection.release();
            });
        });
    });
});

app.get('/api/getRecentFiles', (req, res) => {
    const sqlSelectRecentFiles = `SELECT files, partNames FROM printmanagerdb2.printjob WHERE files IS NOT NULL AND TRIM(files) <> '' ORDER BY timeStarted DESC LIMIT 5`;

    pool.getConnection((err, connection) => {
        if (err) {
            console.error('Error getting connection from pool:', err);
            res.status(500).send("Error accessing the database");
            return;
        }
        //transaction with no isolation level: reads only (transaction ensures consistency)
        connection.beginTransaction(function (err) {
            connection.query(sqlSelectRecentFiles, (err, result) => {
                if (err) {
                    console.log(err);
                    res.status(500).send("Error accessing recent files data");
                    connection.release();
                    return;
                }

                retFiles = result.map(res => {
                    // Split and trim both files and partNames
                    const files = res.files.split(',').map(str => str.trim());
                    const partNames = res.partNames.split(',').map(str => str.trim());

                    // Pair files with their corresponding partNames
                    return files.map((file, index) => ({
                        file,
                        partName: partNames[index] || ("File " + index)  // default name is "File {index}"
                    }));
                }).flat().slice(0, 5).reduce((acc, obj) => {
                    acc.files.push(obj.file);
                    acc.partNames.push(obj.partName);
                    return acc;
                }, { files: [], partNames: [] }); // Initialize with empty arrays

                // console.log('retFiles: ', retFiles)
                res.send({ recentFiles: { "files": retFiles.files.join(','), "partNames": retFiles.partNames.join(',') } });
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
    const sqlSelectFreq = `
    (SELECT printerName, COUNT(*) AS cnt, SUM(usage_g) AS sum 
    FROM printjob 
    WHERE name IS NOT NULL 
    GROUP BY printerName 
    HAVING printerName IS NOT NULL
    ORDER BY cnt DESC 
    LIMIT 10)
  
    UNION ALL
  
    (SELECT 'Other' AS name, COUNT(*) AS cnt, SUM(usage_g) AS sum 
    FROM printjob 
    WHERE name IS NOT NULL 
    AND printerName NOT IN (
      SELECT printerName 
      FROM (SELECT printerName
        FROM printjob 
        WHERE name IS NOT NULL 
        GROUP BY printerName 
        HAVING printerName IS NOT NULL
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
    WHERE supervisorName IS NOT NULL 
    AND supervisorName NOT IN (
      SELECT supervisorName 
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
    const sqlSelectDaily = `SELECT DATE(timeStarted) AS date, COUNT(*) AS cnt, SUM(usage_g) AS sum, personalFilament FROM printjob GROUP BY DATE(timeStarted), personalFilament`;

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
    const value = req.query.value;
    const field = req.query.field;
    // console.log('value:', value, '  field:', field)

    let sqlSelectHistory = `SELECT * FROM printjob WHERE ${field} = ?`;
    if (value === 'undefined') {
        sqlSelectHistory = 'SELECT * FROM printjob';
    }
    pool.getConnection((err, connection) => {
        if (err) {
            console.error('Error getting connection from pool:', err);
            res.status(500).send("Error accessing the database");
            return;
        }
        //transaction with no isolation level: reads only (transaction ensures consistency)
        connection.beginTransaction(function (err) {
            const queryParams = value === 'undefined' ? [] : [value];

            connection.query(sqlSelectHistory, queryParams, (errHistory, resultHistory) => {
                if (errHistory) {
                    console.error(errHistory);
                    res.status(500).send("Error accessing printjob files data");
                } else {
                    res.send({ historyList: resultHistory });
                }
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
        case "queue":
            sqlUpdate = `UPDATE printjob SET ${column} = ? WHERE jobID = ?`;
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
    const { email, files, printerName, jobID, name, partNames, personalFilament, status, supervisorName, usage_g, notes } = req.body;
    let sqlUpdate = `UPDATE printjob SET email = ?, files = ?, printerName = ?, name = ?, partNames = ?, personalFilament = ?, status = ?, supervisorName = ?, usage_g = ?, notes=? WHERE jobID = ?`;

    pool.getConnection((err, connection) => {
        if (err) {
            console.error('Error getting connection from pool:', err);
            res.status(500).send("Error accessing the database");
            return;
        }
        connection.beginTransaction(function (err) {
            connection.query(sqlUpdate, [email, files, printerName, name, partNames, personalFilament, status, supervisorName, usage_g, notes, jobID], (err, result) => {
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

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
});