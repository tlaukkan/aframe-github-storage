const config = require('config');
const GithubClient = require('../src/node/github-client').GithubClient;
const Storage = require('../src/node/storage').Storage;
const StorageServer = require('../src/node/storage-server').StorageServer;

require('console-stamp')(console, {
    metadata: function () { return ('[' + process.memoryUsage().rss + ']'); },
    colors: { stamp: 'yellow', label: 'white', metadata: 'green' }
});

start()
    .then()
    .catch(e => console.log('error starting storage server: ', e));

async function start() {
    const server = new StorageServer(config.get('Server.host'), config.get('Server.port'));
    await server.listen();

    process.on('exit', function() {
        server.close();
    });
}

