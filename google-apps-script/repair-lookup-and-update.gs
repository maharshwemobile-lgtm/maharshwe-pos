/**
 * Mahar Shwe POS Repair Lookup + Sheet Update API
 *
 * Deploy as Apps Script Web App:
 * Execute as: Me
 * Who has access: Anyone with the link
 *
 * GET:
 *   ?id=0551
 *   ?voucher=MS0551
 *
 * POST:
 *   { action:"updateRepairStatus", voucher:"0551", status:"ပြင်ပြီး ✅", staffName:"Admin" }
 */

const POS_MASTER_SPREADSHEET_ID = "14EfYo_dMWQG0n4h6GKDerDz1bdFLKWafQKr67g8WWEE";

const POS_MASTER_SHEET_CONFIG = {
  "1133509292": { sheetName: "Mahar",     repairIdCol: 1, modelCols: [3], ownerNameCol: 2, issueCol: 4, statusCol: 5, staffCol: 9, prefix: "MS" },
  "773931975":  { sheetName: "AC",        repairIdCol: 1, modelCols: [3], ownerNameCol: 2, issueCol: 4, statusCol: 5, staffCol: 9, prefix: "AC" },
  "627260859":  { sheetName: "The Light", repairIdCol: 1, modelCols: [3], ownerNameCol: 2, issueCol: 4, statusCol: 5, staffCol: 9, prefix: "TL" },
  "367718950":  { sheetName: "BOBO",      repairIdCol: 1, modelCols: [3], ownerNameCol: 2, issueCol: 4, statusCol: 5, staffCol: 9, prefix: "BO" },
  "1678965056": { sheetName: "Power9",    repairIdCol: 1, modelCols: [3], ownerNameCol: 2, issueCol: 4, statusCol: 5, staffCol: 9, prefix: "P9" }
};

function posNormalizeRepairId_(id) {
  return String(id || "").trim().toUpperCase();
}

function posRepairIdsMatch_(sheetId, userId) {
  const a = posNormalizeRepairId_(sheetId);
  const b = posNormalizeRepairId_(userId);
  if (!a || !b) return false;
  if (a === b) return true;

  const prefixA = a.match(/^[A-Z]*/)?.[0] || "";
  const prefixB = b.match(/^[A-Z]*/)?.[0] || "";
  if (prefixA === prefixB) {
    const numA = parseInt(a.replace(/^[A-Z]*/, ""), 10);
    const numB = parseInt(b.replace(/^[A-Z]*/, ""), 10);
    if (!isNaN(numA) && !isNaN(numB)) return numA === numB;
  }

  if (!/[A-Z]/.test(a) && !/[A-Z]/.test(b)) {
    return Number(a) === Number(b);
  }
  return false;
}

function posGetMasterSheets_() {
  const ss = SpreadsheetApp.openById(POS_MASTER_SPREADSHEET_ID);
  return ss.getSheets()
    .map(sheet => {
      const gid = sheet.getSheetId().toString();
      const config = POS_MASTER_SHEET_CONFIG[gid];
      return config ? { sheet, config, gid } : null;
    })
    .filter(Boolean);
}

function posFindRepairId_(repairId) {
  const searchId = posNormalizeRepairId_(repairId);
  for (let ms of posGetMasterSheets_()) {
    const data = ms.sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      const idCell = posNormalizeRepairId_(data[i][ms.config.repairIdCol]);
      if (posRepairIdsMatch_(idCell, searchId)) {
        const model = ms.config.modelCols.length === 1
          ? (data[i][ms.config.modelCols[0]] || "")
          : ms.config.modelCols.map(c => data[i][c] || "").join(" ").trim();

        return {
          found: true,
          row: i + 1,
          gid: ms.gid,
          sheetName: ms.config.sheetName,
          sheet: ms.sheet,
          config: ms.config,
          data: {
            voucher: idCell,
            repairId: idCell,
            status: data[i][ms.config.statusCol] || "",
            model: model,
            customer: data[i][ms.config.ownerNameCol] || "",
            customerName: data[i][ms.config.ownerNameCol] || "",
            issue: data[i][ms.config.issueCol] || "",
            cost: data[i][6] || "Not set",
            shop: ms.config.sheetName
          }
        };
      }
    }
  }
  return { found: false };
}

function doGet(e) {
  const voucher = e?.parameter?.voucher || e?.parameter?.id || "";
  if (!voucher) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: true, message: "Mahar Shwe POS Repair API active. Use ?id=0551" }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  const result = posFindRepairId_(voucher);
  if (!result.found) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, found: false, message: "Voucher not found" }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, found: true, ...result.data }))
    .setMimeType(ContentService.MimeType.JSON);
}

function posNormalizeStatus_(status) {
  const s = String(status || "").trim();
  if (["ပြင်ပြီး", "ပြင်ပြီး ✅", "Done", "Delivered", "Ready to Collect"].includes(s)) return "ပြင်ပြီး ✅";
  if (["ယူပြီး", "ယူပြီး ✅", "Collected"].includes(s)) return "ယူပြီး ✅";
  if (["ပစ္စည်းမှာရန်", "Waiting Parts", "Waiting for Parts"].includes(s)) return "ပစ္စည်းမှာရန်";
  return s || "ပြင်ရန်";
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents || "{}");
    const action = body.action || "";
    if (action !== "updateRepairStatus") {
      return ContentService
        .createTextOutput(JSON.stringify({ ok: false, error: "Unknown action" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const voucher = body.voucher || body.repairId || "";
    const status = posNormalizeStatus_(body.sheetStatus || body.status || "ပြင်ပြီး");
    const staffName = body.staffName || "";

    const result = posFindRepairId_(voucher);
    if (!result.found) {
      return ContentService
        .createTextOutput(JSON.stringify({ ok: false, found: false, error: "Voucher not found" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Column F status
    result.sheet.getRange(result.row, result.config.statusCol + 1).setValue(status);

    // Column J staff/tech if provided
    if (staffName) {
      result.sheet.getRange(result.row, result.config.staffCol + 1).setValue(staffName);
    }

    // Column H pickup status
    if (status === "ပြင်ပြီး ✅") {
      const pickupCell = result.sheet.getRange(result.row, 8);
      if (!pickupCell.getValue()) pickupCell.setValue("မယူရသေး ⏳");
    }
    if (status === "ယူပြီး ✅") {
      result.sheet.getRange(result.row, 8).setValue("ယူပြီး ✅");
      result.sheet.getRange(result.row, 11).setValue(new Date());
    }

    return ContentService
      .createTextOutput(JSON.stringify({
        ok: true,
        found: true,
        voucher: result.data.voucher,
        row: result.row,
        sheet: result.sheetName,
        status: status
      }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
