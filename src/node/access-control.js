const config = require('config');
const GithubClient = require('./github-client').GithubClient;
const Access = require('./model').Access;
const AccessStatus = require('./model').AccessStatus;
const crypto = require('crypto');

exports.AccessControl = class {

    /**
     * Constructor for setting github repository name.
     * @param {GithubClient} github
     */
    constructor(github) {
        /**
         * @type {GithubClient}
         */
        this.github = github;
        this.tokenHashSeed = config.get('Storage.tokenHashSeed');
        this.encryptionPassword = config.get('Storage.encryptionPassword');
    }

    /**
     * Set user token hash for file.
     * @param {String} path
     * @param {String} email
     * @param {String} token
     * @returns {Promise<void>}
     */
    async setToken(path, email_, token) {
        const email = this.encryptEmail(path, email_);
        let accessMap = await this.loadAccessMap(path);
        if (accessMap.has(email)) {
            accessMap.get(email).tokenHash = this.hash(token);
        } else {
            let access = new Access();
            access.email = email;
            access.tokenHash = this.hash(token);
            accessMap.set(email, access);
        }
        await this.saveAccessMap(email, path, accessMap);
    }

    /**
     * Grant access role to file.
     * @param {String} path
     * @param {String} email
     * @param {String} role
     * @returns {Promise<void>}
     */
    async grant(path, email_, role) {
        const email = this.encryptEmail(path, email_);
        let accessMap = await this.loadAccessMap(path);
        if (accessMap.has(email)) {
            let access = accessMap.get(email);
            if (access.roles.indexOf(role) === -1) {
                access.roles.push(role);
            }
        } else {
            let access = new Access();
            access.email = email;
            access.roles.push(role);
            accessMap.set(email, access);
        }
        await this.saveAccessMap(email, path, accessMap);
    }

    /**
     * Revokes access role to file.
     * @param {String} path
     * @param {String} email
     * @returns {Promise<void>}
     */
    async revoke(path, email_, role) {
        const email = this.encryptEmail(path, email_);
        let accessMap = await this.loadAccessMap(path);
        if (accessMap.has(email)) {
            let access = accessMap.get(email);
            access.roles = access.roles.filter(function(r) { return r != role; });
        }
        await this.saveAccessMap(email, path, accessMap);
    }

    /**
     * Removes user access.
     * @param {String} path
     * @param {String} email
     * @returns {Promise<void>}
     */
    async remove(path, email_) {
        const email = this.encryptEmail(path, email_);
        let accessMap = await this.loadAccessMap(path);
        if (accessMap.has(email)) {
            accessMap.delete(email);
        }
        await this.saveAccessMap(email, path, accessMap);
    }

    /**
     * Check if user has correct token hash and one of the given roles granted to file.
     * @param {String} path
     * @param {String} email
     * @param {String[]} roles
     * @returns {Promise<Object>}
     */
    async check(path, email_, token, roles) {
        const email = this.encryptEmail(path, email_);
        let accessMap = await this.loadAccessMap(path);
        if (accessMap.size === 0) {
            return AccessStatus.NONE;
        }

        if (accessMap.has('anonymous')) {
            let found = false;
            for (let i = 0; i < roles.length; i++) {
                if (accessMap.get('anonymous').roles.indexOf(roles[i]) > -1) {
                    found = true;
                }
                if (found === true) {
                    break;
                }
            }
            if (found) {
                return AccessStatus.GRANTED;
            }
        }

        if (!accessMap.has(email)) {
            return AccessStatus.NOT_FOUND;
        }
        let access = accessMap.get(email);
        if (!token) {
            return AccessStatus.NO_TOKEN;
        }
        if (access.tokenHash !== this.hash(token)) {
            return AccessStatus.INVALID_TOKEN;
        } else {
            let found = false;
            for (let i = 0; i < roles.length; i++) {
                if (access.roles.indexOf(roles[i]) > -1) {
                    found = true;
                }
                if (found === true) {
                    break;
                }
            }

            if (found) {
                return AccessStatus.GRANTED;
            } else {
                return AccessStatus.DENIED;
            }
        }
    }

    /**
     * Gets path access list.
     * @param {String} path the path
     * @returns {Promise<Access[]>} the access list
     */
    async getAccessList(path) {
        return Array.from(await this.loadAccessMap(path)).map( ([key, value]) => {
            value.email = this.decryptEmail(path, value.email);
            delete value.tokenHash;
            return value;
        });
    }

    /**
     * Saves access for file
     * @param {String} path
     * @param {Map<String, Access>} accessMap the access map
     * @returns {Promise<void>}
     */
    async saveAccessMap(email, path, accessMap) {
        let accessMapPath = path + '.access';
        let json = JSON.stringify([...accessMap], null, 2);
        await this.github.writeFile(accessMapPath, json, email + ' saved file: ' + path + '.access');
    }

    /**
     * Loads access for file.
     * @param {String} path
     * @returns {Promise<Map<String, Access>>}
     */
    async loadAccessMap(path) {
        /** @type {String} */
        let json = await this.github.getFile(path + '.access');
        return json ? new Map(JSON.parse(json)) : new Map();
    }

    /**
     * Encrypts email.
     * @param {string} iv the initialization vector
     * @param {string} email the email to encrypt
     * @returns {string}
     */
    encryptEmail(iv, email) {
        if (email === 'anonymous') {
            return email;
        }
        return this.encrypt(iv, email);
    }

    /**
     * Decrypts email.
     * @param {string} iv the initialization vector
     * @param {string} encryptedEmail the email to encrypt
     * @returns {string}
     */
    decryptEmail(iv, encryptedEmail) {
        if (encryptedEmail === 'anonymous') {
            return encryptedEmail;
        }
        return this.decrypt(iv, encryptedEmail);
    }


    /**
     * Encrypts given plain text.
     * @param {string} iv the initialization vector
     * @param {string} plainText the plain text to encrypt
     * @returns {string}
     */
    encrypt(iv, plainText) {
        const cipher = crypto.createCipheriv('aes-256-cbc', this.encryptionPassword, this.hash(iv).slice(0, 16));
        let cipherText = cipher.update(plainText,'utf8','base64')
        cipherText += cipher.final('base64');
        return cipherText;
    }

    /**
     * Decrypts given cipher text.
     * @param {string} iv the initialization vector
     * @param {string} cipherText the cipher text to encrypt
     * @returns {string}
     */
    decrypt(iv, plainText) {
        const cipher = crypto.createDecipheriv('aes-256-cbc', this.encryptionPassword, this.hash(iv).slice(0, 16));
        let cipherText = cipher.update(plainText, 'base64', 'utf8')
        cipherText += cipher.final('utf8');
        return cipherText;
    }

    /**
     * Gets hash of given content.
     * @param {string} content the content
     * @returns {string} the hash
     */
    hash(content) {
        return crypto.createHmac('sha256', this.tokenHashSeed)
            .update(content)
            .digest('base64');
    }

};
