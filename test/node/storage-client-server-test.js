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
const StorageType = require("../../src/node/model").StorageType;
const StorageDescriptor = require("../../src/node/model").StorageDescriptor;

describe('storage', function() {

    it('should send message to server and disconnect', async function () {
        this.timeout(50000);

        const credentials = new Credentials();
        credentials.email = 'test.user@test';
        credentials.repository = 'test';
        const path = 'test/file2';
        const content = '<a-entity id="1.a"><a-entity id="2.a"><a-entity id="3.a"></a-entity><a-entity id="3.b"></a-entity></a-entity><a-entity id="2.b"></a-entity></a-entity>';
        const testEmail2 = 'test.user2@test';

        const github = new GithubClient(config.get('Github.username'), config.get('Github.token'));
        await github.setRepo('test');
        await github.setBranch('master');

        const server = new StorageServer('127.0.0.1', 1337);
        await server.listen();
        const client = new StorageClient(W3CWebSocket, 'ws://127.0.0.1:1337/', [credentials]);
        await client.connect();

        const storage = new Storage(github);
        credentials.token = await storage.grant(path, credentials.email, Role.ADMIN, credentials);

        const accessList = await client.getAccessList('test', path);
        assert.strictEqual(1, accessList.length);
        assert.strictEqual(credentials.email, accessList[0].email);
        assert.strictEqual(1, accessList[0].roles.length);
        assert.strictEqual(Role.ADMIN, accessList[0].roles[0]);

        await client.grant('test', path, testEmail2, Role.USER);
        await client.revoke('test', path, testEmail2, Role.USER);
        await client.save('test', path, content);
        const loadedContent = await client.load('test', path);
        assert.strictEqual('<a-entity id="1.a">\n' +
            '  <a-entity id="2.a">\n' +
            '    <a-entity id="3.a"/>\n' +
            '    <a-entity id="3.b"/>\n' +
            '  </a-entity>\n' +
            '  <a-entity id="2.b"/>\n' +
            '</a-entity>', loadedContent);
        await client.remove('test', path);
        console.log(await client.getHeadCommitHash('test'));

        client.disconnect();
        server.close();
    });

    it('should test storage descriptor', async function () {
        this.timeout(50000);

        const descriptors = [new StorageDescriptor(StorageType.GITHUB, 'infinity', '^a-', '^id$'),
            new StorageDescriptor(StorageType.GITHUB, 'test', '^a-', '^id$')];

        console.log(JSON.stringify(descriptors));
    })


});