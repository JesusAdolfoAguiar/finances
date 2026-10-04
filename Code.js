const SHEET_ID = '1A0Zva6XEX1gdIwKRS9GJJ3phJKVUTr22DWDikWsnE_c';

function doPost(e) {
  try {
    const rawData = e.postData ? e.postData.contents : "NO_POST_DATA";
    logToSheet("RAW INCOMING: " + rawData);

    if (rawData === "NO_POST_DATA") {
      return ContentService.createTextOutput("OK");
    }

    const contents = JSON.parse(rawData);
    
    // Ignore edits, system messages, or empty text
    if (!contents.message || !contents.message.text) {
      logToSheet("Skipped: Not a standard text message.");
      return ContentService.createTextOutput("OK");
    }

    const text = contents.message.text.trim();
    
    if (text === "/start") {
      logToSheet("Skipped: /start command.");
      return ContentService.createTextOutput("OK");
    }

    const parts = text.split(/\s+/);
    
    if (parts.length >= 4) {
      const amount = parseFloat(parts[0]) || parts[0]; 
      const category = parts[1];
      const account = parts[2];
      const description = parts.slice(3).join(" ");
      
      const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName("Transactions");
      if (!sheet) {
        logToSheet("Error: Sheet named 'Transactions' not found.");
      } else {
        sheet.appendRow([new Date(), amount, category, account, description]);
        logToSheet("Success: Wrote to Transactions.");
      }
      
      try {
        updateMonthlyOverview(category, amount);
      } catch (overviewErr) {
        logToSheet("Error in Monthly Overview: " + (overviewErr.stack || overviewErr));
      }
    } else {
      logToSheet("Rejected message (Length < 4): " + text);
    }
    
    return ContentService.createTextOutput("OK"); 
    
  } catch (err) {
    try {
      logToSheet("Fatal Script Error: " + (err.stack || err));
    } catch (logErr) {
      // If logging to sheet fails (e.g. wrong Sheet ID or lost permissions), 
      // THROW the error so it shows up as 'Failed' in the Apps Script UI!
      throw new Error("Double fault! Original error: " + err + " | Log error: " + logErr);
    }
    return ContentService.createTextOutput("OK"); 
  }
}

function logToSheet(message) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let logSheet = ss.getSheetByName("Logs");
  if (!logSheet) {
    logSheet = ss.insertSheet("Logs");
  }
  logSheet.appendRow([new Date(), typeof message === 'object' ? JSON.stringify(message) : message]);
}

function updateMonthlyOverview(category, amount) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const overviewSheet = ss.getSheetByName("Monthly Overview");
  if (!overviewSheet) return;

  const data = overviewSheet.getDataRange().getValues();
  let foundRow = -1;

  for (let i = 0; i < data.length; i++) {
    if (String(data[i][0]).toLowerCase() === String(category).toLowerCase()) {
      foundRow = i + 1;
      break;
    }
  }

  if (foundRow !== -1) {
    const cell = overviewSheet.getRange(foundRow, 2);
    const currentVal = parseFloat(cell.getValue()) || 0;
    cell.setValue(currentVal + parseFloat(amount));
  } else {
    overviewSheet.appendRow([category, parseFloat(amount)]);
  }
}

function doGet(e) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const logSheet = ss.getSheetByName("Logs");
  if (!logSheet) return ContentService.createTextOutput("No Logs tab");
  
  const data = logSheet.getDataRange().getValues();
  // Return last 10 logs
  const lastLogs = data.slice(-10);
  return ContentService.createTextOutput(JSON.stringify(lastLogs, null, 2));
}