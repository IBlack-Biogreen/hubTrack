const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;
const LOADING_PAGE_PATH = path.join(__dirname, 'loading.html');

const server = http.createServer((req, res) => {
    // Set CORS headers to allow cross-origin requests
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    if (req.url === '/' || req.url === '/index.html') {
        // Serve the loading page
        fs.readFile(LOADING_PAGE_PATH, (err, data) => {
            if (err) {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Error loading page');
                return;
            }
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(data);
        });
    } else if (req.url === '/health') {
        // Health check endpoint
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', service: 'loading-server' }));
    } else {
        // 404 for other requests
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
    }
});

server.listen(PORT, () => {
    console.log(`Loading server running on http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('Shutting down loading server...');
    server.close(() => {
        console.log('Loading server stopped');
        process.exit(0);
    });
});

process.on('SIGTERM', () => {
    console.log('Shutting down loading server...');
    server.close(() => {
        console.log('Loading server stopped');
        process.exit(0);
    });
}); 