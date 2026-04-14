const FILE_LINKS_HEADER = 'Upload your .stl file here, no other file types accepted (units must be in mm!)';
const FILE_NAMES_HEADER = 'File Names';

function installTrigger() {
  const ss = SpreadsheetApp.getActive();

  // Prevent duplicate triggers
  const triggers = ScriptApp.getProjectTriggers();
  for (const trigger of triggers) {
    if (trigger.getHandlerFunction() === 'onFormSubmit') {
      ScriptApp.deleteTrigger(trigger);
    }
  }

  ScriptApp.newTrigger('onFormSubmit')
    .forSpreadsheet(ss)
    .onFormSubmit()
    .create();
}

function onFormSubmit(e) {
  const sheet = e.range.getSheet();
  const row = e.range.getRow();
  const lastCol = sheet.getLastColumn();

  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];

  const fileLinksCol = headers.indexOf(FILE_LINKS_HEADER) + 1;
  if (fileLinksCol === 0) {
    throw new Error(`Could not find file links column header: ${FILE_LINKS_HEADER}`);
  }

  let fileNamesCol = headers.indexOf(FILE_NAMES_HEADER) + 1;

  // Create the File Names column if it doesn't exist
  if (fileNamesCol === 0) {
    fileNamesCol = lastCol + 1;
    sheet.getRange(1, fileNamesCol).setValue(FILE_NAMES_HEADER);
  }

  const linksCell = sheet.getRange(row, fileLinksCol).getValue();
  const fileNames = getFileNamesFromLinksCell(linksCell);

  sheet.getRange(row, fileNamesCol).setValue(fileNames);
}

function getFileNamesFromLinksCell(linksCell) {
  if (!linksCell) return '';

  const links = String(linksCell)
    .split(',')
    .map(link => link.trim())
    .filter(Boolean);

  const names = links.map(link => {
    const fileId = extractDriveFileId(link);
    if (!fileId) return '';

    try {
      return DriveApp.getFileById(fileId).getName();
    } catch (err) {
      Logger.log(`Failed to get file name for link "${link}": ${err}`);
      return '';
    }
  }).filter(Boolean);

  return names.join(',');
}

function extractDriveFileId(url) {
  if (!url) return null;

  let match = String(url).match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (match) return match[1];

  match = String(url).match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (match) return match[1];

  return null;
}

function retrieveLatestSubmissions() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();

  const numRowsToRetrieve = 25;
  const startRow = Math.max(2, lastRow - numRowsToRetrieve + 1);

  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  const numDataRows = lastRow - startRow + 1;
  const rows = sheet.getRange(startRow, 1, numDataRows, lastCol).getValues();

  return {
    headers,
    ...rows
  };
}

function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify(retrieveLatestSubmissions()))
    .setMimeType(ContentService.MimeType.JSON);
}