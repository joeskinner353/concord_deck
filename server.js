const handler = require('serve-handler');
const http = require('http');

const server = http.createServer((request, response) => {
    return handler(request, response, {
        public: 'src',
        cleanUrls: true,
        directoryListing: false
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