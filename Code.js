const SHEET_ID = '1A0Zva6XEX1gdIwKRS9GJJ3phJKVUTr22DWDikWsnE_c';

function normalizeText(str) {
  return String(str || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function round2(num) {
  return Math.round((Number(num) + Number.EPSILON) * 100) / 100;
}

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

    const amountStr = text.substring(0, firstSpaceIndex).replace('$', '');
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
      const cellVal = String(overviewData[i][0]).trim();
      if (cellVal && cellVal.toLowerCase() !== 'total') {
        categoriesOriginal.push(cellVal);
      }
    }
    // Sort longest first to avoid partial matches
    categoriesOriginal.sort((a, b) => b.length - a.length);

    let matchedCategory = null;
    let matchedCategoryLength = 0;
    const remainderNorm = normalizeText(remainder);

    for (const cat of categoriesOriginal) {
      const catNorm = normalizeText(cat);
      if (remainderNorm.startsWith(catNorm)) {
        const nextChar = remainderNorm.charAt(catNorm.length);
        if (nextChar === '' || nextChar === ' ') {
          matchedCategory = cat;
          matchedCategoryLength = catNorm.length;
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
      
      try {
        syncMonthlyOverview(ss);
      } catch (overviewErr) {
        logToSheet("Error in syncMonthlyOverview: " + (overviewErr.stack || overviewErr));
      }
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

function syncMonthlyOverview(ssInstance) {
  const ss = ssInstance || SpreadsheetApp.openById(SHEET_ID);
  const overviewSheet = ss.getSheetByName("Monthly Overview");
  const transSheet = ss.getSheetByName("Transactions");
  if (!overviewSheet || !transSheet) return { error: "Missing sheet" };

  // Ensure the Oct 16 Barberia transaction that failed due to accent is present
  const transData = transSheet.getDataRange().getValues();
  let hasBarberiaOct16 = false;
  for (let i = 1; i < transData.length; i++) {
    if (normalizeText(transData[i][2]) === "barberia" && Number(transData[i][1]) === 26) {
      hasBarberiaOct16 = true;
      break;
    }
  }
  if (!hasBarberiaOct16) {
    transSheet.appendRow([new Date("2026-10-16T21:12:00.760Z"), 26, "Barberia", "mercantil", "Corte y laca"]);
    SpreadsheetApp.flush();
  }

  const allTrans = transSheet.getDataRange().getValues();
  const sumsByMonthAndCat = {
    "2026-10": {},
    "2026-11": {},
    "2026-12": {}
  };

  for (let i = 1; i < allTrans.length; i++) {
    const rawDate = allTrans[i][0];
    const amt = parseFloat(allTrans[i][1]);
    const catNorm = normalizeText(allTrans[i][2]);
    if (!catNorm || isNaN(amt)) continue;

    const d = rawDate instanceof Date ? rawDate : new Date(rawDate);
    if (isNaN(d.getTime())) continue;
    const ym = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
    if (!sumsByMonthAndCat[ym]) sumsByMonthAndCat[ym] = {};
    sumsByMonthAndCat[ym][catNorm] = round2((sumsByMonthAndCat[ym][catNorm] || 0) + amt);
  }

  const overviewData = overviewSheet.getDataRange().getValues();
  let totalBudget = 0;
  let totalOctActual = 0;

  const colCValues = [];
  const colDValues = [];
  const colDBackgrounds = [];

  for (let i = 1; i < overviewData.length; i++) {
    const cat = String(overviewData[i][0]).trim();
    const catNorm = normalizeText(cat);
    const budget = parseFloat(overviewData[i][1]) || 0;

    if (catNorm === "total") {
      const totalVar = round2(totalBudget - totalOctActual);
      overviewSheet.getRange(i + 1, 2).setValue(round2(totalBudget));
      colCValues.push([round2(totalOctActual)]);
      colDValues.push([totalVar]);
      colDBackgrounds.push([totalVar <= 0 ? "#F4C7C3" : (totalVar <= totalBudget * 0.20 ? "#FCE8B2" : "#B7E1CD")]);
    } else if (catNorm) {
      const octActual = round2((sumsByMonthAndCat["2026-10"] && sumsByMonthAndCat["2026-10"][catNorm]) || 0);
      const octVar = round2(budget - octActual);
      totalBudget = round2(totalBudget + budget);
      totalOctActual = round2(totalOctActual + octActual);

      colCValues.push([octActual]);
      colDValues.push([octVar]);
      colDBackgrounds.push([octVar <= 0 ? "#F4C7C3" : (octVar <= budget * 0.20 ? "#FCE8B2" : "#B7E1CD")]);
    } else {
      colCValues.push([""]);
      colDValues.push([""]);
      colDBackgrounds.push([null]);
    }
  }

  const numRows = colCValues.length;
  if (numRows > 0) {
    overviewSheet.clearConditionalFormatRules();
    overviewSheet.getRange(2, 3, numRows, 1).setValues(colCValues);
    overviewSheet.getRange(2, 4, numRows, 1).setValues(colDValues);
    overviewSheet.getRange(2, 4, numRows, 1).setBackgrounds(colDBackgrounds);
    overviewSheet.getRange(2, 2, numRows, 2).setBackground(null);
  }

  SpreadsheetApp.flush();
  return {
    status: "ok",
    totalBudget: totalBudget,
    totalOctActual: totalOctActual,
    totalOctVariance: round2(totalBudget - totalOctActual)
  };
}

function setupFormulas() {
  return syncMonthlyOverview();
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
    const res = syncMonthlyOverview();
    return ContentService.createTextOutput(JSON.stringify(res, null, 2)).setMimeType(ContentService.MimeType.JSON);
  }

  if (e && e.parameter && e.parameter.action === 'update_budget') {
    const updated = updateRoutineBudget();
    return ContentService.createTextOutput(JSON.stringify(updated, null, 2)).setMimeType(ContentService.MimeType.JSON);
  }

  const ss = SpreadsheetApp.openById(SHEET_ID);
  const logSheet = ss.getSheetByName("Logs");
  if (!logSheet) return ContentService.createTextOutput("No Logs tab");
  
  const data = logSheet.getDataRange().getValues();
  // Return last 10 logs
  const lastLogs = data.slice(-10);
  return ContentService.createTextOutput(JSON.stringify(lastLogs, null, 2));
}

function updateRoutineBudget() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const overviewSheet = ss.getSheetByName("Monthly Overview");
  if (!overviewSheet) return { error: "Monthly Overview sheet not found" };

  const budgetUpdates = {
    "fondo de emergencia": 133,
    "salidas": 65,
    "proyectos casa": 300,
    "oficina": 25,
    "ropa": 25,
    "fees": 95
  };

  const data = overviewSheet.getDataRange().getValues();
  const changes = [];

  for (let i = 1; i < data.length; i++) {
    const rowNum = i + 1;
    const cat = String(data[i][0]).trim();
    if (!cat) continue;
    const catLower = normalizeText(cat);

    if (Object.prototype.hasOwnProperty.call(budgetUpdates, catLower)) {
      const oldVal = data[i][1];
      const newVal = budgetUpdates[catLower];
      overviewSheet.getRange(rowNum, 2).setValue(newVal);
      changes.push({ category: cat, old: oldVal, new: newVal });
    }
  }

  const syncResult = syncMonthlyOverview(ss);
  return { status: "ok", changes: changes, syncResult: syncResult };
}