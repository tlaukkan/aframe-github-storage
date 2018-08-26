const assert = require('assert');
const config = require('config');
const GithubClient = require('../../src/node/github-client').GithubClient;
const Storage = require('../../src/node/storage').Storage;
const Credentials = require('../../src/node/model').Credentials;
const Role = require('../../src/node/model').Role;

describe('storage', function() {

    it('should create and remove file', async function() {
        try {
            this.timeout(50000);
            let credentials = new Credentials();
            credentials.email = 'test.user@test';

            let testEmail2 = 'test.user2@test';
            //           credentials.token = 'test-token';

            let path = 'test/file';
            let content = 'test-content';

            let github = new GithubClient(config.get('Github.username'), config.get('Github.token'));
            await github.setRepo('test');
            await github.setBranch('master');

            let storage = new Storage(github);
            credentials.token = await storage.grant(path, credentials.email, Role.ADMIN, credentials);
            await storage.save(path, content, credentials);
            assert.strictEqual(content, await storage.load(path, credentials));

            await storage.grant(path, testEmail2, Role.USER, credentials);

            assert.strictEqual(2, (await storage.getAccessList(path, credentials)).length);

            await storage.revoke(path, testEmail2, Role.USER, credentials);

            await storage.remove(path, credentials);
            console.log(await storage.getHeadCommitHash());
            assert.strictEqual(null, await storage.load(path, credentials));
        } catch (e) {
            console.error(e);
            assert.fail(e.message);
        }
    });

});
