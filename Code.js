const SHEET_ID = '1A0Zva6XEX1gdIwKRS9GJJ3phJKVUTr22DWDikWsnE_c';

function doPost(e) {
  try {
    const rawData = e.postData ? e.postData.contents : "NO_POST_DATA";
    logToSheet("RAW INCOMING: " + rawData);

    if (rawData === "NO_POST_DATA") {
      return HtmlService.createHtmlOutput("OK");
    }

    const contents = JSON.parse(rawData);
    
    if (contents.update_id) {
      const cache = CacheService.getScriptCache();
      if (cache.get(contents.update_id.toString())) {
        return HtmlService.createHtmlOutput("OK");
      }
      cache.put(contents.update_id.toString(), 'true', 600);
    }
    
    // Ignore edits, system messages, or empty text
    if (!contents.message || !contents.message.text) {
      logToSheet("Skipped: Not a standard text message.");
      return HtmlService.createHtmlOutput("OK");
    }

    const text = contents.message.text.trim();
    
    if (text === "/start") {
      logToSheet("Skipped: /start command.");
      return HtmlService.createHtmlOutput("OK");
    }

    const firstSpaceIndex = text.indexOf(' ');
    if (firstSpaceIndex === -1) {
      logToSheet("Rejected message (No space): " + text);
      return HtmlService.createHtmlOutput("OK");
    }

    const amountStr = text.substring(0, firstSpaceIndex);
    const amount = parseFloat(amountStr) || amountStr;
    const remainder = text.substring(firstSpaceIndex + 1).trim();

    const ss = SpreadsheetApp.openById(SHEET_ID);
    const overviewSheet = ss.getSheetByName("Monthly Overview");
    if (!overviewSheet) {
      logToSheet("Error: Monthly Overview sheet not found.");
      return HtmlService.createHtmlOutput("OK");
    }

    const overviewData = overviewSheet.getDataRange().getValues();
    const categoriesOriginal = [];
    // Assuming row 0 is headers, data starts at row 1
    for (let i = 1; i < overviewData.length; i++) {
      if (overviewData[i][0]) {
        categoriesOriginal.push(String(overviewData[i][0]));
      }
    }
    // Sort longest first to avoid partial matches
    categoriesOriginal.sort((a, b) => b.length - a.length);

    let matchedCategory = null;
    let matchedCategoryLength = 0;
    const remainderLower = remainder.toLowerCase();

    for (const cat of categoriesOriginal) {
      const catLower = cat.toLowerCase();
      if (remainderLower.startsWith(catLower)) {
        const nextChar = remainderLower.charAt(catLower.length);
        if (nextChar === '' || nextChar === ' ') {
          matchedCategory = cat;
          matchedCategoryLength = catLower.length;
          break;
        }
      }
    }

    if (!matchedCategory) {
      logToSheet("Error: Could not match any category in: " + remainder);
      return HtmlService.createHtmlOutput("OK");
    }

    const afterCategory = remainder.substring(matchedCategoryLength).trim();
    const afterCategoryParts = afterCategory.split(/\s+/);

    if (afterCategoryParts.length >= 2) {
      const category = matchedCategory;
      const account = afterCategoryParts[0];
      const description = afterCategoryParts.slice(1).join(" ");
      
      const sheet = ss.getSheetByName("Transactions");
      if (!sheet) {
        logToSheet("Error: Sheet named 'Transactions' not found.");
      } else {
        if (sheet.getLastRow() === 0) {
          sheet.appendRow(["Date", "Amount", "Category", "Account", "Description"]);
        }
        sheet.appendRow([new Date(), amount, category, account, description]);
        logToSheet("Success: Wrote to Transactions.");
      }
      
      // Script math removed. Monthly Overview relies on SUMIFS formulas now.
    } else {
      logToSheet("Rejected message (Missing account/description): " + text);
    }
    
    return HtmlService.createHtmlOutput("OK"); 
    
  } catch (err) {
    try {
      logToSheet("Fatal Script Error: " + (err.stack || err));
    } catch (logErr) {
      // DO NOT THROW! If we throw, Telegram gets a 500 and retries forever.
      console.error("Double fault! Original error: " + err + " | Log error: " + logErr);
    }
    return HtmlService.createHtmlOutput("OK"); 
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

function setupFormulas() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const overviewSheet = ss.getSheetByName("Monthly Overview");
  if (!overviewSheet) return;
  
  const lastRow = overviewSheet.getLastRow();
  if (lastRow < 2) return;

  const data = overviewSheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    const rowNum = i + 1;
    const cat = String(data[i][0]).trim();
    if (!cat) continue;

    if (cat.toLowerCase() === 'total') {
      overviewSheet.getRange(rowNum, 3).setFormula(`=SUM(C2:C${rowNum - 1})`);
      overviewSheet.getRange(rowNum, 4).setFormula(`=$B${rowNum}-C${rowNum}`);
    } else {
      overviewSheet.getRange(rowNum, 3).setFormula(`=SUMIFS(Transactions!$B:$B, Transactions!$C:$C, $A${rowNum}, Transactions!$A:$A, ">="&C$1, Transactions!$A:$A, "<="&EOMONTH(C$1,0))`);
      overviewSheet.getRange(rowNum, 4).setFormula(`=$B${rowNum}-C${rowNum}`);
    }
  }

  // Conditional Formatting for Column D
  const formatRange = overviewSheet.getRange("D2:D");
  const ruleRed = SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=D2 <= 0')
    .setBackground('#F4C7C3')
    .setRanges([formatRange])
    .build();
    
  const ruleYellow = SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=AND(D2 > 0, D2 <= (B2 * 0.20))')
    .setBackground('#FCE8B2')
    .setRanges([formatRange])
    .build();
    
  const ruleGreen = SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=D2 > (B2 * 0.20)')
    .setBackground('#B7E1CD')
    .setRanges([formatRange])
    .build();

  overviewSheet.clearConditionalFormatRules();
  overviewSheet.setConditionalFormatRules([ruleRed, ruleYellow, ruleGreen]);
}

function doGet(e) {
  if (e && e.parameter && e.parameter.action === 'dump') {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const transSheet = ss.getSheetByName("Transactions");
    const overviewSheet = ss.getSheetByName("Monthly Overview");
    const logSheet = ss.getSheetByName("Logs");
    
    const result = {
      transactions: transSheet ? transSheet.getDataRange().getValues() : [],
      overview: {
        values: overviewSheet ? overviewSheet.getDataRange().getValues() : [],
        formulas: overviewSheet ? overviewSheet.getDataRange().getFormulas() : []
      },
      logs: logSheet ? logSheet.getDataRange().getValues() : []
    };
    return ContentService.createTextOutput(JSON.stringify(result, null, 2)).setMimeType(ContentService.MimeType.JSON);
  }

  if (e && e.parameter && e.parameter.action === 'setup') {
    setupFormulas();
    return HtmlService.createHtmlOutput("Formulas applied successfully.");
  }

  const ss = SpreadsheetApp.openById(SHEET_ID);
  const logSheet = ss.getSheetByName("Logs");
  if (!logSheet) return ContentService.createTextOutput("No Logs tab");
  
  const data = logSheet.getDataRange().getValues();
  // Return last 10 logs
  const lastLogs = data.slice(-10);
  return ContentService.createTextOutput(JSON.stringify(lastLogs, null, 2));
}