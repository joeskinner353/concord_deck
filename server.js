const handler = require('serve-handler');
const http = require('http');

const server = http.createServer((request, response) => {
    // Add cache prevention headers
    response.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    response.setHeader('Pragma', 'no-cache');
    response.setHeader('Expires', '0');
    
    return handler(request, response, {
        public: 'src',
        rewrites: [
            { source: '/assets/**', destination: '/assets/**' }  // Explicitly handle assets path
        ],
        headers: [
            {
                source: '**/*.{html,css,js,png,jpg,jpeg}',
                headers: [{
                    key: 'Cache-Control',
                    value: 'no-cache'
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