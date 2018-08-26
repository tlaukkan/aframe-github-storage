const assert = require('assert');
const config = require('config');
const GithubClient = require('../../src/node/github-client').GithubClient;

describe('github', function() {

    it('should commit files', async function() {
        try {
            this.timeout(15000);
            let username = config.get('Github.username');
            let token = config.get('Github.token');
            let client = new GithubClient(username, token);
            await client.setRepo('test');
            await client.setBranch('master');
            await client.writeFile('0/0/0', 'a', 'test-commit');
            console.log(await client.getHeadCommitHash());
            assert.strictEqual(await client.getFile('0/0/0'), 'a');
            await client.deleteFile('0/0/0');
            assert.strictEqual(await client.getFile('0/0/0'), null);
            await client.writeFiles([{path: '0/0/0', content: 'b'}], 'test-commit');
            assert.strictEqual(await client.getFile('0/0/0'), 'b');
            await client.deleteFile('0/0/0');
            assert.strictEqual(await client.getFile('0/0/0'), null);
        } catch (e) {
            console.error(e);
            assert.fail(e.message);
        }
    });

});
