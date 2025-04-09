function retrieveLatestSubmissions() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const lastRow = sheet.getLastRow();
  
  // Determine the starting row for the last 5 submissions
  const numRowsToRetrieve = 5;
  const startRow = Math.max(2, lastRow - numRowsToRetrieve + 1); // Don't go below row 1
  
  // Get the range to fetch the last 5 submissions
  const rowData = sheet.getRange(startRow, 1, lastRow - startRow + 1, sheet.getLastColumn()).getValues();
  
  Logger.log(rowData);  
  return rowData;
}

function doGet() {
  let output = retrieveLatestSubmissions();
  return ContentService.createTextOutput(JSON.stringify(output))
    .setMimeType(ContentService.MimeType.JSON);
}
