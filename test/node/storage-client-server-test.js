require('console-stamp')(console, {
    metadata: function () {
        return ('[' + process.memoryUsage().rss + ']');
    },
    colors: {
        stamp: 'yellow',
        label: 'white',
        metadata: 'green'
    }
});

const config = require('config');
const GithubClient = require('../../src/node/github-client').GithubClient;
const Storage = require('../../src/node/storage').Storage;
const Credentials = require('../../src/node/model').Credentials;
const Role = require('../../src/node/model').Role;

const StorageClient = require('../../src/node/storage-client').StorageClient;
const StorageServer = require('../../src/node/storage-server').StorageServer;
const W3CWebSocket = require('websocket').w3cwebsocket;

const assert = require ('assert');

describe('storage', function() {

    it('should send message to server and disconnect', async function () {
        this.timeout(50000);

        const credentials = new Credentials();
        credentials.email = 'test.user@test';
        const path = 'test/file2';
        const content = '<a-entity id="1.a"><a-entity id="2.a"><a-entity id="3.a"></a-entity><a-entity id="3.b"></a-entity></a-entity><a-entity id="2.b"></a-entity></a-entity>';
        const testEmail2 = 'test.user2@test';

        const github = new GithubClient(config.get('Github.username'), config.get('Github.token'));
        await github.setRepo('test');
        await github.setBranch('master');

        const storage = new Storage(github);
        credentials.token = await storage.grant(path, credentials.email, Role.ADMIN, credentials);

        const server = new StorageServer(github, '127.0.0.1', 1337);
        const client = new StorageClient(W3CWebSocket, 'ws://127.0.0.1:1337/', credentials);
        await client.connect();

        const accessList = await client.getAccessList(path);
        assert.strictEqual(1, accessList.length);
        assert.strictEqual(credentials.email, accessList[0].email);
        assert.strictEqual(1, accessList[0].roles.length);
        assert.strictEqual(Role.ADMIN, accessList[0].roles[0]);

        await client.grant(path, testEmail2, Role.USER);
        await client.revoke(path, testEmail2, Role.USER);
        await client.save(path, content);
        const loadedContent = await client.load(path);
        assert.strictEqual('<a-entity id="1.a">\n' +
            '  <a-entity id="2.a">\n' +
            '    <a-entity id="3.a"/>\n' +
            '    <a-entity id="3.b"/>\n' +
            '  </a-entity>\n' +
            '  <a-entity id="2.b"/>\n' +
            '</a-entity>', loadedContent);
        await client.remove(path);
        console.log(await client.getHeadCommitHash());

        client.disconnect();
        server.close();
    })
});