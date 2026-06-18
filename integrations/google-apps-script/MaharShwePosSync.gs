const POS_DATASETS = [
  ['remittances', 'Remittances'],
  ['sale-history', 'Sale History'],
  ['other-income', 'Other Income'],
  ['service-income', 'Service Income'],
  ['expense', 'Expense'],
  ['stock', 'STOCK'],
  ['user-audit', 'User audit'],
];

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('MaharShwe POS')
    .addItem('Setup Tabs', 'setupMaharShwePosSync')
    .addItem('Sync All Now', 'syncAllTabs')
    .addItem('Install 5-Min Backup Sync', 'installBackupSyncTrigger')
    .addToUi();
}

function doGet(e) {
  return jsonResponse({
    ok: true,
    service: 'MaharShwe POS Google Sheet Sync',
    tabs: POS_DATASETS.map(function (item) { return item[1]; }),
    time: new Date().toISOString(),
  });
}

function doPost(e) {
  try {
    const payload = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const secret = getRequiredProperty('POS_SYNC_SECRET');
    if (String(payload.secret || '') !== secret) {
      return jsonResponse({ ok: false, message: 'Invalid secret' });
    }
    const tabName = String(payload.tab || '').trim();
    if (!POS_DATASETS.some(function (item) { return item[1] === tabName; })) {
      return jsonResponse({ ok: false, message: 'Unsupported tab' });
    }
    const row = liveEventRow(payload);
    upsertRow(tabName, 'Event ID', row);
    return jsonResponse({ ok: true, tab: tabName, eventId: payload.eventId });
  } catch (error) {
    return jsonResponse({ ok: false, message: error.message || String(error) });
  }
}

function setupMaharShwePosSync() {
  POS_DATASETS.forEach(function (item) {
    ensureSheet(item[1]);
  });
  return 'Tabs ready';
}

function installBackupSyncTrigger() {
  ScriptApp.getProjectTriggers().forEach(function (trigger) {
    if (trigger.getHandlerFunction() === 'syncAllTabs') ScriptApp.deleteTrigger(trigger);
  });
  ScriptApp.newTrigger('syncAllTabs').timeBased().everyMinutes(5).create();
  return '5-minute backup sync installed';
}

function syncAllTabs() {
  POS_DATASETS.forEach(function (item) {
    syncDataset(item[0], item[1]);
  });
  return 'All tabs synced';
}

function syncDataset(dataset, tabName) {
  const baseUrl = getRequiredProperty('POS_BASE_URL').replace(/\/$/, '');
  const shopSlug = getRequiredProperty('POS_SHOP_SLUG');
  const secret = getRequiredProperty('POS_SYNC_SECRET');
  const properties = PropertiesService.getScriptProperties();
  const sinceKey = 'LAST_SYNC_' + dataset.toUpperCase().replace(/-/g, '_');
  const since = properties.getProperty(sinceKey) || '2000-01-01T00:00:00.000Z';
  const checkpoint = new Date().toISOString();
  const path = dataset === 'remittances'
    ? '/api/google-sheet-sync/export-remittances-v2'
    : '/api/google-sheet-sync/export/' + encodeURIComponent(dataset);
  const url = baseUrl + path
    + '?shopSlug=' + encodeURIComponent(shopSlug)
    + '&since=' + encodeURIComponent(since)
    + '&limit=10000';
  const response = UrlFetchApp.fetch(url, {
    method: 'get',
    headers: { 'x-google-sheet-secret': secret },
    muteHttpExceptions: true,
  });
  const body = JSON.parse(response.getContentText() || '{}');
  if (response.getResponseCode() >= 300 || !body.ok) {
    throw new Error(body.message || ('Sync failed: ' + response.getResponseCode()));
  }
  const rows = body.rows || [];
  rows.forEach(function (record) {
    upsertObjectRow(tabName, record);
  });
  properties.setProperty(sinceKey, checkpoint);
  return rows.length;
}

function liveEventRow(event) {
  const flat = flattenObject(event.payload || {});
  return Object.assign({
    'Event ID': String(event.eventId || ''),
    'Synced At': new Date(),
    'Created At': event.createdAt || '',
    'Action': event.action || '',
    'Entity ID': event.entityId || '',
    'Shop Slug': event.shopSlug || '',
    'Shop Name': event.shopName || '',
  }, flat, {
    'Payload JSON': JSON.stringify(event.payload || {}),
  });
}

function flattenObject(value, prefix, result) {
  const output = result || {};
  const base = prefix || '';
  if (value === null || value === undefined) return output;
  Object.keys(value).forEach(function (key) {
    const nextKey = base ? base + ' / ' + key : key;
    const item = value[key];
    if (item && typeof item === 'object' && !Array.isArray(item) && Object.keys(item).length <= 30) {
      flattenObject(item, nextKey, output);
    } else {
      output[nextKey] = Array.isArray(item) || (item && typeof item === 'object') ? JSON.stringify(item) : item;
    }
  });
  return output;
}

function upsertObjectRow(tabName, record) {
  const row = flattenObject(record || {});
  const key = row.id || row.ID || row.transactionNumber || row.invoiceNumber || Utilities.getUuid();
  row['Record ID'] = String(key);
  row['Last Synced At'] = new Date();
  upsertRow(tabName, 'Record ID', row);
}

function upsertRow(tabName, keyHeader, objectRow) {
  const sheet = ensureSheet(tabName);
  const headers = ensureHeaders(sheet, Object.keys(objectRow));
  const keyColumn = headers.indexOf(keyHeader) + 1;
  const keyValue = String(objectRow[keyHeader] || '');
  let targetRow = sheet.getLastRow() + 1;
  if (keyValue && keyColumn > 0 && sheet.getLastRow() > 1) {
    const values = sheet.getRange(2, keyColumn, sheet.getLastRow() - 1, 1).getDisplayValues();
    for (let index = 0; index < values.length; index += 1) {
      if (String(values[index][0]) === keyValue) {
        targetRow = index + 2;
        break;
      }
    }
  }
  const values = headers.map(function (header) {
    const value = objectRow[header];
    if (value instanceof Date) return value;
    if (value === null || value === undefined) return '';
    if (typeof value === 'object') return JSON.stringify(value);
    return value;
  });
  sheet.getRange(targetRow, 1, 1, headers.length).setValues([values]);
}

function ensureSheet(name) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  return spreadsheet.getSheetByName(name) || spreadsheet.insertSheet(name);
}

function ensureHeaders(sheet, incomingHeaders) {
  const lastColumn = Math.max(1, sheet.getLastColumn());
  let headers = sheet.getLastRow() ? sheet.getRange(1, 1, 1, lastColumn).getDisplayValues()[0].filter(String) : [];
  incomingHeaders.forEach(function (header) {
    if (headers.indexOf(header) < 0) headers.push(header);
  });
  if (!headers.length) headers = incomingHeaders.slice();
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.setFrozenRows(1);
  return headers;
}

function getRequiredProperty(name) {
  const value = PropertiesService.getScriptProperties().getProperty(name);
  if (!value) throw new Error(name + ' is not configured in Script Properties');
  return value;
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
