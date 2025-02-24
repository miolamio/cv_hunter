# File Upload Application

Secure file upload application with drag-and-drop interface and n8n integration.

## Features

- Drag-and-drop file upload
- Support for PDF and Word documents
- Real-time processing status updates
- Basic Authentication protection
- WebSocket integration for live updates
- n8n workflow integration

## Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# Environment (production/test)
NODE_ENV=production

# Server settings
PORT=3000

# Authentication
BASIC_AUTH_USERNAME=your_username
BASIC_AUTH_PASSWORD=your_password

# Webhook URLs
WEBHOOK_URL_PRODUCTION=your_production_webhook_url
WEBHOOK_URL_TEST=your_test_webhook_url

# File upload settings
MAX_FILE_SIZE=10485760  # 10MB in bytes
```

## Development

1. Install dependencies:
```bash
npm install
```

2. Start development server:
```bash
npm run dev
```

3. For production:
```bash
npm start
```

## Deployment to Vercel

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Deploy:
```bash
vercel
```

## API Endpoints

- `POST /upload` - Upload files
- `POST /callback/:sessionId` - Callback endpoint for n8n
- `GET /api/environment` - Get current environment settings

## Security

- Basic Authentication required for all endpoints
- Environment variables for sensitive data
- File size and type validation

## License

MIT
