require('dotenv').config();

const projectSheetSettings = require('./google-sheet-project-settings-v23');
const attachGoogleSheetProjectExportApi = require('./google-sheet-project-export-api-v23');

const modulePath = require.resolve('./google-sheet-project-settings-v23');
require.cache[modulePath].exports = {
  ...projectSheetSettings,
  attachGoogleSheetProjectSettingsApi(app) {
    projectSheetSettings.attachGoogleSheetProjectSettingsApi(app);
    attachGoogleSheetProjectExportApi(app);
  },
};

require('./api-connected-pr23-v4');
