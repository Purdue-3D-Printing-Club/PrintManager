function retrieveLatestSubmissions() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();

  const numRowsToRetrieve = 25;
  const startRow = Math.max(2, lastRow - numRowsToRetrieve + 1);

  // Read headers (row 1)
  const headers = sheet
    .getRange(1, 1, 1, lastCol)
    .getValues()[0];

  // Read data rows
  const data = sheet
    .getRange(startRow, 1, lastRow - startRow + 1, lastCol)
    .getValues();

  // Concatenate the header row with the data rows into one object
  // The headers are extracted in the organizer and used for question-field mapping
  data = {
    headers,
    ...data
  }

  return data;
}

function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify(retrieveLatestSubmissions()))
    .setMimeType(ContentService.MimeType.JSON);
}
