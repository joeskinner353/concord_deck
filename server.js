const handler = require('serve-handler');
const http = require('http');
const compression = require('compression');

const server = http.createServer((request, response) => {
    // Add CORS headers
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    
    // Add security headers
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('X-Frame-Options', 'DENY');
    response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // Add cache headers for static assets
    if (request.url.match(/\.(css|js|png|jpg|jpeg|gif|ico)$/)) {
        response.setHeader('Cache-Control', 'public, max-age=31536000');
    } else {
        response.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        response.setHeader('Pragma', 'no-cache');
        response.setHeader('Expires', '0');
    }
    
    return handler(request, response, {
        public: 'src',
        rewrites: [
            { source: '/assets/**', destination: '/assets/**' }
        ],
        headers: [
            {
                source: '**/*.{html,css,js,png,jpg,jpeg}',
                headers: [{
                    key: 'Cache-Control',
                    value: 'max-age=7200'
                }]
            }
        ]
    });
});

server.listen(3000, () => {
    console.log('Server running at http://localhost:3000');
});

process.on('SIGINT', () => {
    console.log('Shutting down server...');
    server.close();
    process.exit();
}); 