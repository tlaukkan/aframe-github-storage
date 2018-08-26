const config = require('config');
const GithubClient = require('../src/node/github-client').GithubClient;
const StorageServer = require('../src/node/storage-server').StorageServer;

require('console-stamp')(console, {
    metadata: function () { return ('[' + process.memoryUsage().rss + ']'); },
    colors: { stamp: 'yellow', label: 'white', metadata: 'green' }
});

start()
    .then()
    .catch(e => console.log('error starting storage server: ', e));

async function start() {
    const github = new GithubClient(config.get('Github.username'), config.get('Github.token'));
    await github.setRepo(config.get('Github.repository'));
    await github.setBranch('master');

    const server = new StorageServer(github, config.get('Server.host'), config.get('Server.port'));

    process.on('exit', function() {
        server.close();
    });
}

