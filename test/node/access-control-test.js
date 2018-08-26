const assert = require('assert');
const config = require('config');
const GithubClient = require('../../src/node/github-client').GithubClient;
const AccessControl = require('../../src/node/access-control').AccessControl;
const Role = require('../../src/node/model').Role;
const AccessStatus = require('../../src/node/model').AccessStatus;

describe('access-control', function() {

    it('should grant and revoke access', async function() {
        try {
            this.timeout(120000);
            let path = '0/0/0';
            let anonymous = 'anonymous';
            let email = 'test-user';
            let token = 'test-token';
            let email2 = 'test-user-2';
            let token2 = 'test-token-2';

            let github = new GithubClient(config.get('Github.username'), config.get('Github.token'));
            await github.setRepo('test');
            await github.setBranch('master');

            let control = new AccessControl(github);

            await control.remove(path, anonymous);
            await control.remove(path, email);
            await control.remove(path, email2);

            assert.strictEqual(await control.check(path, email, token, [Role.ADMIN, Role.USER]), AccessStatus.NONE);
            assert.strictEqual(await control.check(path, email, token, [Role.USER]), AccessStatus.NONE);
            assert.strictEqual(await control.check(path, email, token, [Role.ADMIN]), AccessStatus.NONE);
            assert.strictEqual(await control.check(path, email, token2, [Role.USER]), AccessStatus.NONE);
            assert.strictEqual(await control.check(path, email2, token2, [Role.USER]), AccessStatus.NONE);

            await control.grant(path, anonymous, Role.USER);
            assert.strictEqual(await control.check(path, email, token2, [Role.USER]), AccessStatus.GRANTED);
            await control.revoke(path, anonymous, Role.USER);
            assert.strictEqual(await control.check(path, email, token2, [Role.USER]), AccessStatus.NOT_FOUND);

            await control.setToken(path, email, token);

            assert.strictEqual(await control.check(path, email, token, [Role.ADMIN, Role.USER]), AccessStatus.DENIED);
            assert.strictEqual(await control.check(path, email, token, [Role.USER]), AccessStatus.DENIED);
            assert.strictEqual(await control.check(path, email, token, [Role.ADMIN]), AccessStatus.DENIED);
            assert.strictEqual(await control.check(path, email, token2, [Role.USER]), AccessStatus.INVALID_TOKEN);
            assert.strictEqual(await control.check(path, email2, token2, [Role.USER]), AccessStatus.NOT_FOUND);

            await control.setToken(path, email2, token2);
            await  control.grant(path, email, Role.USER);
            await  control.grant(path, email2, Role.ADMIN);

            assert.strictEqual((await control.getAccessList(path)).length, 3)

            assert.strictEqual(await control.check(path, email, token, [Role.ADMIN, Role.USER]), AccessStatus.GRANTED);
            assert.strictEqual(await control.check(path, email, token, [Role.USER]), AccessStatus.GRANTED);
            assert.strictEqual(await control.check(path, email, token, [Role.ADMIN]), AccessStatus.DENIED);
            assert.strictEqual(await control.check(path, email, token2, [Role.USER]), AccessStatus.INVALID_TOKEN);
            assert.strictEqual(await control.check(path, email2, token2, [Role.USER]), AccessStatus.DENIED);

            await  control.revoke(path, email, Role.USER);

            assert.strictEqual(await control.check(path, email, token, [Role.ADMIN, Role.USER]), AccessStatus.DENIED);
            assert.strictEqual(await control.check(path, email, token, [Role.USER]), AccessStatus.DENIED);
            assert.strictEqual(await control.check(path, email, token, [Role.ADMIN]), AccessStatus.DENIED);
            assert.strictEqual(await control.check(path, email, token2, [Role.USER]), AccessStatus.INVALID_TOKEN);
            assert.strictEqual(await control.check(path, email2, token2, [Role.USER]), AccessStatus.DENIED);

            await control.remove(path, anonymous);
            await control.remove(path, email);
            await control.remove(path, email2);

            assert.strictEqual(await control.check(path, email, token, [Role.ADMIN, Role.USER]), AccessStatus.NONE);
            assert.strictEqual(await control.check(path, email, token, [Role.USER]), AccessStatus.NONE);
            assert.strictEqual(await control.check(path, email, token, [Role.ADMIN]), AccessStatus.NONE);
            assert.strictEqual(await control.check(path, email, token2, [Role.USER]), AccessStatus.NONE);
            assert.strictEqual(await control.check(path, email2, token2, [Role.USER]), AccessStatus.NONE);

        } catch (e) {
            console.error(e);
            assert.fail(e.message);
        }
    });

});
