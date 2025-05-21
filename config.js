require('dotenv').config();

const config = {
    environment: process.env.NODE_ENV || 'test',
    port: Number.parseInt(process.env.PORT || '3000', 10),
    auth: {
        username: process.env.BASIC_AUTH_USERNAME,
        password: process.env.BASIC_AUTH_PASSWORD
    },
    webhook: {
        production: process.env.WEBHOOK_URL_PRODUCTION,
        test: process.env.WEBHOOK_URL_TEST
    },
    upload: {
        maxFileSize: Number.parseInt(process.env.MAX_FILE_SIZE || '10485760', 10)
    },
    googleSheets: {
        url: process.env.GOOGLE_SHEETS_URL || 'https://docs.google.com/spreadsheets/d/1C6aFttyaq4CzcPt4zXzEyJ8ZY60nNIzFNaMwyV_jyxw'
    }
};

module.exports = config;
