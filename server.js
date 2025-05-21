const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const https = require('https');
const FormData = require('form-data');
const fs = require('fs');
const basicAuth = require('express-basic-auth');
const WebSocket = require('ws');
const config = require('./config');

const app = express();
const server = require('http').createServer(app);
const wss = new WebSocket.Server({ server });

// Environment setting
const WEBHOOK_URL = config.environment === 'production' ? config.webhook.production : config.webhook.test;

console.log(`Server running in ${config.environment} mode`);
console.log(`Using webhook URL: ${WEBHOOK_URL}`);

// WebSocket connection handling
wss.on('connection', (ws) => {
    console.log('New WebSocket connection');
    
    ws.on('close', () => {
        console.log('Client disconnected');
    });
});

// Broadcast to all connected clients
function broadcast(message) {
    if (process.env.VERCEL) {
        // In Vercel, we don't have WebSocket
        return;
    }
    
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(message));
        }
    });
}

// Basic Authentication
app.use(basicAuth({
    users: { [config.auth.username]: config.auth.password },
    challenge: true,
    realm: 'Upload Application'
}));

// Middleware
app.use(cors());
app.use(express.static('public'));
app.use(express.json());

// Configure multer for file upload
const upload = multer({
    limits: {
        fileSize: config.upload.maxFileSize
    }
});

// Store upload sessions
const uploadSessions = new Map();

app.post('/upload', upload.array('files'), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'No files uploaded' });
        }

        // Check if project ID is provided
        const projectId = req.body.projectId;
        if (!projectId) {
            return res.status(400).json({ error: 'Project ID is required' });
        }

        // Generate session ID for this upload
        const sessionId = Date.now().toString();
        
        console.log(`Processing ${req.files.length} files in ${config.environment} mode`);
        console.log('Files:', req.files.map(f => ({ name: f.originalname, type: f.mimetype, size: f.size })));

        // Store session information
        uploadSessions.set(sessionId, {
            files: req.files.map(f => f.originalname),
            status: 'processing'
        });

        const form = new FormData();
        req.files.forEach(file => {
            form.append('files', file.buffer, {
                filename: file.originalname,
                contentType: file.mimetype
            });
        });

        // Add session ID and project ID to form data
        form.append('sessionId', sessionId);
        form.append('projectId', projectId);
        
        console.log('Processing files for project ID:', projectId);

        console.log('Sending request to webhook:', WEBHOOK_URL);
        
        // Forward the files to the webhook
        const webhookResponse = await new Promise((resolve, reject) => {
            const webhookReq = https.request(WEBHOOK_URL, {
                method: 'POST',
                headers: {
                    ...form.getHeaders()
                }
            }, (webhookRes) => {
                console.log('Webhook response status:', webhookRes.statusCode);
                console.log('Webhook response headers:', webhookRes.headers);
                
                let data = '';
                webhookRes.on('data', chunk => { data = data + chunk; });
                webhookRes.on('end', () => {
                    console.log('Webhook response data:', data);
                    if (webhookRes.statusCode >= 200 && webhookRes.statusCode < 300) {
                        resolve(data);
                    } else {
                        reject(new Error(`Webhook returned status ${webhookRes.statusCode}. Response: ${data}`));
                    }
                });
            });

            webhookReq.on('error', (error) => {
                console.error('Webhook request error:', error);
                reject(error);
            });

            form.pipe(webhookReq);
        });

        res.json({ 
            message: 'Files uploaded and processing started',
            sessionId: sessionId,
            environment: config.environment
        });

    } catch (error) {
        console.error('Error processing files:', error);
        res.status(500).json({ 
            error: error.message,
            environment: config.environment
        });
    }
});

// Callback endpoint for n8n
app.post('/callback/:sessionId', express.json(), (req, res) => {
    const { sessionId } = req.params;
    console.log('Received callback for session:', sessionId);
    
    const session = uploadSessions.get(sessionId);

    if (!session) {
        console.log('Session not found:', sessionId);
        return res.status(404).json({ error: 'Session not found' });
    }

    // Update session status
    session.status = 'completed';
    uploadSessions.set(sessionId, session);

    console.log('Broadcasting completion message for session:', sessionId);
    // Notify clients about completion
    broadcast({
        type: 'processingComplete',
        sessionId: sessionId,
        files: session.files
    });

    res.json({ message: 'Processing status updated' });
});

// Add endpoint to check current environment
app.get('/api/environment', (req, res) => {
    res.json({
        environment: config.environment,
        webhookUrl: WEBHOOK_URL,
        maxFileSize: config.upload.maxFileSize,
        googleSheetsUrl: config.googleSheets.url
    });
});

// Add endpoint to fetch projects list
app.get('/api/projects', async (req, res) => {
    try {
        console.log('Fetching projects from webhook:', config.webhook.projects);
        
        const response = await new Promise((resolve, reject) => {
            const options = {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Basic ${Buffer.from('wardhowell:aiwins2025').toString('base64')}`
                }
            };

            const webhookReq = https.request(config.webhook.projects, options, (webhookRes) => {
                console.log('Projects webhook response status:', webhookRes.statusCode);
                
                let data = '';
                webhookRes.on('data', chunk => { data = data + chunk; });
                webhookRes.on('end', () => {
                    if (webhookRes.statusCode >= 200 && webhookRes.statusCode < 300) {
                        try {
                            const projects = JSON.parse(data);
                            resolve(projects);
                        } catch (error) {
                            console.error('Error parsing projects data:', error);
                            reject(new Error('Error parsing projects data'));
                        }
                    } else {
                        reject(new Error(`Projects webhook returned status ${webhookRes.statusCode}. Response: ${data}`));
                    }
                });
            });

            webhookReq.on('error', (error) => {
                console.error('Projects webhook request error:', error);
                reject(error);
            });

            webhookReq.end();
        });

        res.json(response);

    } catch (error) {
        console.error('Error fetching projects:', error);
        res.status(500).json({ 
            error: error.message,
            environment: config.environment
        });
    }
});

// Start server
const port = config.port || 3000;
server.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});

// Export for Vercel
module.exports = app;
