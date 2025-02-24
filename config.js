require('dotenv').config();

const config = {
    environment: process.env.NODE_ENV || 'test',
    port: parseInt(process.env.PORT || '3000', 10),
    auth: {
        username: process.env.BASIC_AUTH_USERNAME,
        password: process.env.BASIC_AUTH_PASSWORD
    },
    webhook: {
        production: process.env.WEBHOOK_URL_PRODUCTION,
        test: process.env.WEBHOOK_URL_TEST
    },
    upload: {
        maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10)
    }
};

module.exports = config;
