require('dotenv').config();

// Default values for local development
const PORT = process.env.PORT || 3000;
const ENVIRONMENT = process.env.NODE_ENV || 'test';

const config = {
  environment: ENVIRONMENT,
  port: PORT,
  auth: {
    username: process.env.BASIC_AUTH_USERNAME || 'wh',
    password: process.env.BASIC_AUTH_PASSWORD || 'ai'
  },
  webhook: {
    production: process.env.WEBHOOK_URL_PRODUCTION || '',
    test: process.env.WEBHOOK_URL_TEST || 'http://localhost:5678/webhook-test',
    projects: process.env.PROJECTS_WEBHOOK_URL || ''
  },
  upload: {
    maxFileSize: Number.parseInt(process.env.MAX_FILE_SIZE || '10485760', 10) // 10MB in bytes
  },
  googleSheets: {
    url: process.env.GOOGLE_SHEETS_URL || ''
  }
};

module.exports = config;