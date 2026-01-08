require('dotenv').config();
const PORT = process.env.PORT || 3001;
const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const cors = require('cors');
const mysql = require('mysql2');
const { ClientSecretCredential } = require('@azure/identity');
const credential = new ClientSecretCredential(process.env.TENANT_ID, process.env.CLIENT_ID, process.env.CLIENT_SECRET);
const { Client } = require('@microsoft/microsoft-graph-client');
require('isomorphic-fetch');
const fetch = require('node-fetch');
const axios = require('axios');

// The upper bounds for each season
const seasonUpperBoundsStr = ['05-20', '08-20']



const pool = mysql.createPool({
    host: "localhost",
    user: "root",
    password: "rootpassword",
    database: "printmanagerdb2",
    timezone: '+00:00', // Store timestamps in UTC
    dateStrings: true
})

// printables filtering
const { blacklist, whitelist } = require('./scraperFilter.json');
function buildWordRegex(words) {
    words = words.concat(words.map(w => w + 's'));
    const escaped = words.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    return new RegExp(`(?:^|[^a-zA-Z0-9])(${escaped.join("|")})(?=$|[^a-zA-Z0-9])`, "i");
}

const blacklistRegex = buildWordRegex(blacklist);
const whitelistRegex = buildWordRegex(whitelist);


// google drive / file system
const fs = require('fs-extra');
const { google } = require('googleapis');

const temp_folder = 'gdrive_uploads';
const keyPath = process.env.GDRIVE_KEY_PATH;
const gdriveFolderID = process.env.GDRIVE_FOLDER_ID;
let drive = createGdriveAuth(keyPath);

// get google drive metadata given the file id.
// only works for directly uploaded files, not from google forms
// async function getFileMetadata(fileId) {
//     const res = await drive.files.get({
//         fileId,
//         fields: 'name,mimeType,size',
//     });
//     console.log(res.data)

//     return res.data;
// }

const multer = require('multer');
const upload = multer({ dest: `${temp_folder}/` });

// puppeteer web scraping
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { randomInt } = require('crypto');
puppeteer.use(StealthPlugin());


// json file management
const path = require('path');
const { type } = require('os');
const localDataPath = path.join(__dirname, 'localData.json')

function loadLocalData() {
    try {
        return (JSON.parse(fs.readFileSync(localDataPath, 'utf-8')));
    } catch (e) {
        return {}
    }
}

function saveLocalData(localData) {
    fs.writeFileSync(localDataPath, JSON.stringify(localData, null, 2), 'utf-8');
}


function createGdriveAuth(keyPath) {
    //console.log('keyPath: ', keyPath)
    const auth = new google.auth.GoogleAuth({
        // credentials: require(keyPath),
        keyFile: keyPath,
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


app.use(cors());
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

// get the localData
app.get('/api/getLocalData', (req, res) => {
    res.send(loadLocalData());
});


// set the localData
app.post('/api/setLocalData', (req, res) => {
    let b = req.body;
    try {
        saveLocalData(b.localData)
        res.send({ success: true, msg: 'localData update successful' });
    } catch (e) {
        res.send({ success: false, msg: 'error updating local data: ' + e.toString() })
    }
});

async function sendEmail(paramsObj) {
    const { to, subject, text } = paramsObj;

    const client = await getGraphClient();

    try {
        await client.api(`/users/${process.env.PURDUE_EMAIL}/sendMail`).post({
            message: {
                subject: subject,
                body: {
                    contentType: "Text",
                    content: text + '\n\nThis email was automatically sent by the lab organizer.'
                },
                toRecipients: [{ emailAddress: { address: to } }],
            },
            saveToSentItems: false
        });

        return { success: true, msg: 'Email sent successfully' }
    } catch (error) {
        console.error("Graph API Error:", error);
        return { success: false, msg: error.toString() }
    }
}

// Sends an email from purdue graph api when called
app.post('/api/send-email', async (req, res) => {
    let rslt = await sendEmail(req.body)
    if (rslt.success) {
        res.send(rslt)
    } else {
        res.status(500).send(rslt)
    }
});

// get the storage usage of the authenticated drive account
async function getStorageUsagePercent(drive) {
    const about = await drive.about.get({ fields: 'storageQuota' });
    const quota = about.data.storageQuota;
    const usage = parseInt(quota.usageInDrive || quota.usage, 10);
    const limit = parseInt(quota.limit, 10);
    if (!limit || limit === 0) {
        return 1;
    }
    return usage / limit;
}

// deletes gdrive files older than daysOld
async function deleteOldFiles(drive, daysOld = 7) {
    const now = Date.now();
    const cutoff = now - daysOld * 24 * 60 * 60 * 1000;

    let pageToken = null;
    do {
        const res = await drive.files.list({
            pageSize: 1000,
            fields: 'nextPageToken, files(id, name, createdTime)',
            pageToken,
            q: `'me' in owners`, // only files owned by the service account
        });

        for (const file of res.data.files) {
            const createdTime = new Date(file.createdTime).getTime();
            
            // TODO: Don't delete files we want to keep such as the sql data backup
            if (createdTime < cutoff) {
                try {
                    await drive.files.delete({ fileId: file.id });
                    console.log(`Deleted old file: ${file.name}`);
                } catch (err) {
                    console.error(`Failed to delete file ${file.name} (${file.id}):`, err.message);
                }
            }
        }

        pageToken = res.data.nextPageToken;
    } while (pageToken);
}

// function to upload a file to Google Drive
async function uploadFile(filePath, fileName, drive) {
    // Check if we need to clean old files from gdrive storage
    try {
        let storageUsagePercent = await getStorageUsagePercent(drive);
        console.log(`gdrive service account storage usage: ${(100 * storageUsagePercent).toFixed(4)}%`);
        if (storageUsagePercent > 0.9) {
            deleteOldFiles(drive, daysOld = 7);
        }
    } catch (error) {
        console.error('Error cleaning old files if needed:', error.message);
        throw error;
    }

    // upload the file
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
        console.error('Error uploading file:', error.message);
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
            if (err) console.error(`Error deleting temp file ${file.path}:`, err.message);
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
    // console.log('directUrl:', directUrl);
    try {
        const response = await fetch(directUrl);


        if (!response.ok) {
            return res.status(500).send('Error fetching the STL file from Google Drive');
        }

        const buffer = await response.buffer();

        // Set the Content-Type header explicitly
        res.setHeader('Content-Type', response.headers.get('content-type') || 'application/octet-stream');
        res.send(buffer);

    } catch (err) {
        console.error('Error streaming stl:', err.message);
        res.status(500).send('Server error');
    }
});


async function getPrintLinks(browser) {
    const homePage = await browser.newPage();

    // console.log('\nscraper: going to printables..')
    await homePage.goto('https://www.printables.com/model', { waitUntil: 'domcontentloaded' });

    // console.log('waiting for card-images to load..')
    // Wait for the popular items to load. Adjust the selector to one that exists on the page.
    await homePage.waitForSelector('[class*="card-image"]');

    homePage.on('console', msg => {
        console.log('PAGE LOG:', msg.text());
    });

    // Evaluate the page to extract information from the cards
    // console.log('evaluating page')
    const printLinks = await homePage.evaluate(() => {
        const imgItems = document.querySelectorAll('[class*="image-inside"]');
        imgLinks = Array.from(imgItems, pic => {
            const img = pic.querySelector('img');
            return img?.src || null;
        });

        const items = document.querySelectorAll('[class*="h clamp-two-lines"]');

        const results = Array.from(items, (item, index) => {
            const html = item.outerHTML;
            const nameMatch = html.match(/>([^<]+)</);
            const hrefMatch = html.match(/href="([^"]+)"/);

            return {
                name: nameMatch ? nameMatch[1].trim() : null,
                link: hrefMatch ? `https://printables.com${hrefMatch[1]}/files` : null,
                imgLink: imgLinks[index] || null
            };
        });

        return results.filter(entry => (entry.link !== null) && (entry.imgLink !== null));
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
                    let browser;
                    try {
                        console.log('Opening page ', btnNum);

                        // create a new browser for each download 
                        // TODO: Make this more efficient!
                        browser = await puppeteer.launch({ headless: true, executablePath: process.env.CHROME_PATH });
                        const printDLPage = await browser.newPage();



                        // const printDLPage = await browser.newPage();


                        // Listen for download requests on this page
                        await printDLPage.setRequestInterception(true);
                        printDLPage.on('request', request => {
                            if (request.url().includes('files.printables.com')) console.log('Intercepted download request:', request.url());

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
                    } finally {
                        await new Promise(resolve => setTimeout(resolve, 250));
                        await browser.close()
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

// determine if a string should be blocked or not using the whitelist and blacklist
function isBlocked(text) {
    const lower = text.toLowerCase();
    // Check for blacklist matches
    if (!lower.match(blacklistRegex)) return false;

    // Allow blacklisted words if there are also whitelisted words
    if (lower.match(whitelistRegex)) {
        return false;
    }

    //   console.log('blocked scraped print: ', text)
    // Block strings that have blacklisted words only
    return true;
}

app.get('/api/getDailyPrint', async (req, res) => {
    async function getDailyPrint() {
        let browser;
        try {
            browser = await puppeteer.launch({ headless: true, executablePath: process.env.CHROME_PATH });
            const printLinks = await getPrintLinks(browser);

            // filter the scraped prints based on the blacklist and whitelist globals
            return printLinks.filter(p => !isBlocked(p.name));;
        } catch (e) {
            console.error('Error in getDailyPrint: ', e);
            return [];
        } finally {
            await new Promise(resolve => setTimeout(resolve, 250));
            await browser.close();
        }
    }
    let retObj = await getDailyPrint();
    res.send(retObj);
});

app.get('/api/get', (req, res) => {
    const sqlSelectPrinters = req.query.query;//"SELECT * FROM printer";
    if (!(sqlSelectPrinters && (typeof (sqlSelectPrinters) == 'string'))) {
        console.error('ERROR in /api/get: invalid query');
        return;
    }
    pool.getConnection((err, connection) => {
        if (err) {
            console.error('Error getting connection from pool:', err.message);
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
                res.send({ result: resultPrinters });
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
                    console.log(err.message);
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
            console.error('Error getting connection from pool:', err.message);
            res.status(500).send("Error accessing the database");
            return;
        }
        //transaction with no isolation level: reads only (transaction ensures consistency)
        connection.beginTransaction(function (err) {
            connection.query(sqlSelectCurrentJob, [printerName], (err, result) => {
                if (err) {
                    console.log(err.message);
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
            console.error('Error getting connection from pool:', err.message);
            res.status(500).send("Error accessing the database");
            return;
        }

        //transaction with no isolation level: reads only (transaction ensures consistency)
        connection.beginTransaction(function (err) {
            connection.query(sqlSelectJob, [jobID], (err, result) => {
                if (err) {
                    console.log(err.message);
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


const buildPieChartQuery = (aggField) => {
    return (
        `
     WITH seasonEncs AS (
        SELECT
            *,
            CASE
                WHEN DATE_FORMAT(timeStarted, '%m-%d') <= '${seasonUpperBoundsStr[0]}' THEN 0
                WHEN DATE_FORMAT(timeStarted, '%m-%d') <= '${seasonUpperBoundsStr[1]}' THEN 1
                ELSE 2
            END AS seasonEnc,
            YEAR(timeStarted) AS year
        FROM printjob
        WHERE ${aggField} IS NOT NULL
        AND name IS NOT NULL
    ),
    ranked AS (
        SELECT
            seasonEnc,
            year,
            ${aggField},
            COUNT(*) AS cnt,
            SUM(usage_g) AS sum,
            ROW_NUMBER() OVER (
                PARTITION BY seasonEnc, year
                ORDER BY COUNT(*) DESC
            ) AS rn
        FROM seasonEncs
        GROUP BY seasonEnc, year, ${aggField}
    )
    SELECT
        seasonEnc,
        year,
        ${aggField},
        cnt,
        sum
    FROM ranked
    WHERE rn <= 9

    UNION ALL

    SELECT
        seasonEnc,
        year,
        'Other' AS ${aggField},
        SUM(cnt) AS cnt,
        SUM(sum) AS sum
    FROM ranked
    WHERE rn > 9
    GROUP BY seasonEnc, year;
    `
    );
}

app.get('/api/getprinterdata', (req, res) => {
    const sqlSelectFreq = buildPieChartQuery('printerName');

    pool.getConnection((err, connection) => {
        if (err) {
            console.error('Error getting connection from pool:', err.message);
            res.status(500).send("Error accessing the database");
            return;
        }

        //transaction with no isolation level: reads only (transaction ensures consistency)
        connection.beginTransaction(function (err) {
            connection.query(sqlSelectFreq, (err, result) => {
                if (err) {
                    console.log(err.message);
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
    const sqlSelectSupervisor = buildPieChartQuery('supervisorName');
    pool.getConnection((err, connection) => {
        if (err) {
            console.error('Error getting connection from pool:', err.message);
            res.status(500).send("Error accessing the database");
            return;
        }

        //transaction with no isolation level: reads only (transaction ensures consistency)
        connection.beginTransaction(function (err) {
            connection.query(sqlSelectSupervisor, (err, result) => {
                if (err) {
                    console.log(err.message);
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

app.get('/api/getnamefilamentdata', (req, res) => {

    const sqlSelectFilamentData = buildPieChartQuery('name');

    pool.getConnection((err, connection) => {
        if (err) {
            console.error('Error getting connection from pool:', err.message);
            res.status(500).send("Error accessing the database");
            return;
        }

        //transaction with no isolation level: reads only (transaction ensures consistency)
        connection.beginTransaction(function (err) {
            connection.query(sqlSelectFilamentData, (err, result) => {
                if (err) {
                    console.log(err.message);
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
    const sqlSelectDaily = `SELECT DATE(timeStarted) AS date, COUNT(*) AS cnt, SUM(usage_g) AS sum, paid FROM printjob GROUP BY DATE(timeStarted), paid`;

    pool.getConnection((err, connection) => {
        if (err) {
            console.error('Error getting connection from pool:', err.message);
            res.status(500).send("Error accessing the database");
            return;
        }

        //transaction with no isolation level: reads only (transaction ensures consistency)
        connection.beginTransaction(function (err) {
            connection.query(sqlSelectDaily, (err, result) => {
                if (err) {
                    console.log(err.message);
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


app.get('/api/getdowprints', (req, res) => {
    const sqlSelectDaily = `
    WITH seasonEncs AS (
    SELECT
        *,
        CASE    
            WHEN (MONTH(timeStarted) > 3 AND MONTH(timeStarted) < 11)
                OR (MONTH(timeStarted) = 3 AND DAYOFMONTH(timeStarted) - WEEKDAY(timeStarted) >= 8)
                OR (MONTH(timeStarted) = 11 AND DAYOFMONTH(timeStarted) - WEEKDAY(timeStarted) < 1)
            THEN DATE_ADD(timeStarted, INTERVAL -4 HOUR) -- EDT
            ELSE DATE_ADD(timeStarted, INTERVAL -5 HOUR) -- EST
        END AS local,
            CASE
            WHEN DATE_FORMAT(timeStarted, '%m-%d') <= '${seasonUpperBoundsStr[0]}' THEN 0
            WHEN DATE_FORMAT(timeStarted, '%m-%d') <= '${seasonUpperBoundsStr[1]}' THEN 1
            ELSE 2
        END AS seasonEnc,
        YEAR(timeStarted) AS year
    FROM printjob
    ),
    agg AS (
        SELECT 
            seasonEnc, 
            year, 
            HOUR(timeStarted) AS hour, 
            WEEKDAY(timeStarted) AS dow, 
            COUNT(*) AS cnt
        FROM seasonEncs
        GROUP BY seasonEnc, year, hour, dow
    ),
    hours AS (
        SELECT 0 AS hour UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3
        UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7
        UNION ALL SELECT 8 UNION ALL SELECT 9 UNION ALL SELECT 10 UNION ALL SELECT 11
        UNION ALL SELECT 12 UNION ALL SELECT 13 UNION ALL SELECT 14 UNION ALL SELECT 15
        UNION ALL SELECT 16 UNION ALL SELECT 17 UNION ALL SELECT 18 UNION ALL SELECT 19
        UNION ALL SELECT 20 UNION ALL SELECT 21 UNION ALL SELECT 22 UNION ALL SELECT 23
    ),
    dows AS (
        SELECT 0 AS dow UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3
        UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6
    ),
    seasons AS (
        SELECT DISTINCT seasonEnc, year FROM seasonEncs
    ),
    full_grid AS (
        SELECT s.seasonEnc, s.year, h.hour, d.dow
        FROM seasons s
        CROSS JOIN hours h
        CROSS JOIN dows d
    )
    SELECT 
        g.seasonEnc, 
        g.year, 
        g.hour, 
        g.dow, 
        COALESCE(a.cnt, 0) AS cnt
    FROM full_grid g
    LEFT JOIN agg a
        ON a.seasonEnc = g.seasonEnc
        AND a.year = g.year
        AND a.hour = g.hour
        AND a.dow = g.dow
    ORDER BY g.seasonEnc, g.year, g.dow, g.hour;
    `;

    pool.getConnection((err, connection) => {
        if (err) {
            console.error('Error getting connection from pool:', err.message);
            res.status(500).send("Error accessing the database");
            return;
        }

        //transaction with no isolation level: reads only (transaction ensures consistency)
        connection.beginTransaction(function (err) {
            connection.query(sqlSelectDaily, (err, result) => {
                if (err) {
                    console.log(err.message);
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
    const dateRangeObj = JSON.parse(req.query.dateRangeString);

    let sqlSelectHistory = `SELECT * FROM printjob`;
    if (dateRangeObj) {
        sqlSelectHistory += ` WHERE timeStarted >= ? AND timeStarted <= ?`
    }

    if (value !== 'undefined') {
        if (dateRangeObj) {
            sqlSelectHistory += ` AND ${field} = ?`
        } else {
            sqlSelectHistory += ` WHERE ${field} = ?`
        }
    }
    sqlSelectHistory += ';'

    pool.getConnection((err, connection) => {
        if (err) {
            console.error('Error getting connection from pool:', err.message);
            res.status(500).send("Error accessing the database");
            return;
        }

        //transaction with no isolation level: reads only (transaction ensures consistency)
        connection.beginTransaction(function (err) {
            let queryParams = []
            if (dateRangeObj) [
                queryParams = [dateRangeObj.startDate, dateRangeObj.endDate]
            ]

            if (value !== 'undefined') {
                queryParams.push(value);
            }

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
            console.error('Error getting connection from pool:', err.message);
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
    const sqlInsert = "INSERT INTO printjob (printerName, files, usage_g, timeStarted," +
        " status, name, supervisorName, notes, partNames, email, paid, " +
        " color, layerHeight, selfPostProcess, detailedPostProcess, cureTime, material" +
        ") VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)";

    pool.getConnection((err, connection) => {
        if (err) {
            console.error('Error getting connection from pool:', err.message);
            res.status(500).send("Error accessing the database");
            return;
        }

        connection.beginTransaction(function (err) {
            connection.query(sqlInsert, [b.printerName, b.files, b.usage_g, dateTime, b.status, b.name, b.supervisor,
            b.notes, b.partNames, b.email, b.paid, b.color, b.layerHeight, b.selfPostProcess,
            b.detailedPostProcess, b.cureTime, b.material], (err, result) => {
                if (err) {
                    console.log(err.message);
                    res.status(500).send("Error inserting printjob");
                    connection.release();
                    return;
                }
                res.send(result);
                connection.release();
            });
        });
    });

    // Now save the new filament amount to the file if the material is PLA
    if (b.material.toLowerCase().trim() === 'pla') {
        let localData = loadLocalData()
        let newStock = Math.max(0, localData?.filamentStock - b.usage_g)
        saveLocalData({ ...localData, filamentStock: newStock })

        // send an email if we just crossed under the threshold
        if ((localData?.filamentStock >= localData?.filamentThreshold) && (newStock < localData?.filamentThreshold)) {
            let emailParams = {
                to: 'print3d@purdue.edu',
                subject: 'ALERT - Lab Filament Stock Low!',
                text: `Warning: the lab organizer has detected that our filament stock has ` +
                    `just fallen below the minimum threshold of ${parseInt(localData.filamentThreshold).toLocaleString()}g.` +
                    `\n\nPlease consider restocking it soon!`
            }
            sendEmail(emailParams)
        }
    }
});


app.post('/api/insertMember', (req, res) => {
    const b = req.body;

    const dateTime = new Date(b.lastUpdated);
    const sqlInsert = "INSERT INTO member (lastUpdated, name, email, discordUsername, season, year) VALUES (?,?,?,?,?,?)";

    pool.getConnection((err, connection) => {
        if (err) {
            console.error('Error getting connection from pool:', err.message);
            res.status(500).send("Error accessing the database");
            return;
        }
        connection.beginTransaction(function (err) {
            connection.query(sqlInsert, [dateTime, b.name, b.email, b.discordUsername, b.season, b.year], (err, result) => {
                if (err) {
                    console.log(err.message);
                    res.status(500).send("Error inserting printjob");
                    connection.release();
                    return;
                }
                res.send(result);
                connection.release();
            });
        });
    });
});

app.delete('/api/cancelPrint/:printerName/:usage', (req, res) => {
    const printerName = req.params.printerName;
    const usageRefund = req.params.usage;

    const sqlDelete = 'DELETE FROM printJob WHERE printerName=? AND status = "active"';
    pool.getConnection((err, connection) => {
        if (err) {
            console.error('Error getting connection from pool:', err.message);
            res.status(500).send("Error accessing the database");
            return;
        }
        connection.beginTransaction(function (err) {
            connection.query(sqlDelete, printerName, (err, result) => {
                if (err) {
                    console.log(err.message);
                    res.status(500).send("Error deleting printJob");
                    connection.release();
                    return;
                }

                // Refund the filament usage
                let localData = loadLocalData();
                let newStock = Math.max(0, parseInt(localData?.filamentStock) + parseInt(usageRefund));
                saveLocalData({ ...localData, filamentStock: newStock });

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
            console.error('Error getting connection from pool:', err.message);
            res.status(500).send("Error accessing the database");
            return;
        }
        connection.beginTransaction(function (err) {
            connection.query(sqlDelete, jobID, (err, result) => {
                if (err) {
                    console.log(err.message);
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
app.delete('/api/deleteMember/:memberID', (req, res) => {
    const memberID = req.params.memberID;
    const sqlDelete = 'DELETE FROM member WHERE memberID=?';
    pool.getConnection((err, connection) => {
        if (err) {
            console.error('Error getting connection from pool:', err.message);
            res.status(500).send("Error accessing the database");
            return;
        }
        connection.beginTransaction(function (err) {
            connection.query(sqlDelete, memberID, (err, result) => {
                if (err) {
                    console.log(err.message);
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
            console.error('Error getting connection from pool:', err.message);
            res.status(500).send("Error accessing the database");
            return;
        }
        connection.beginTransaction(function (err) {
            connection.query(sqlUpdate, [val, id], (err, result) => {
                if (err) {
                    console.log(err.message);
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
    const j = req.body;
    let sqlUpdate = `UPDATE printjob SET email = ?, files = ?, printerName = ?, name = ?, partNames = ?, paid = ?, status = ?, supervisorName = ?,
     material=?, usage_g = ?, notes=?, color=?, layerHeight=?, cureTime=?, selfPostProcess=?, detailedPostProcess=? WHERE jobID = ?`;

    pool.getConnection((err, connection) => {
        if (err) {
            console.error('Error getting connection from pool:', err.message);
            res.status(500).send("Error accessing the database");
            return;
        }
        connection.beginTransaction(function (err) {
            connection.query(sqlUpdate, [j.email, j.files, j.printerName, j.name, j.partNames, j.paid, j.status, j.supervisorName,
            j.material, j.usage_g, j.notes, j.color, j.layerHeight, j.cureTime, j.selfPostProcess, j.detailedPostProcess, j.jobID], (err, result) => {
                if (err) {
                    console.log(err.message);
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

app.put('/api/updateMember', (req, res) => {
    const { name, email, lastUpdated, memberID, discordUsername } = req.body;
    let sqlUpdate = `UPDATE member SET name=?, email=?, lastUpdated=?, discordUsername=? WHERE memberID = ?`;

    pool.getConnection((err, connection) => {
        if (err) {
            console.error('Error getting connection from pool:', err.message);
            res.status(500).send("Error accessing the database");
            return;
        }

        connection.beginTransaction(function (err) {
            connection.query(sqlUpdate, [name, email, new Date(lastUpdated), discordUsername, memberID], (err, result) => {
                if (err) {
                    console.log(err.message);
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