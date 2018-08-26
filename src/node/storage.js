const crypto = require('crypto');
const nodemailer = require('nodemailer');
const GithubClient = require('./github-client').GithubClient;
const AccessControl = require('../../src/node/access-control').AccessControl;
const Role = require('../../src/node/model').Role;
const AccessStatus = require('../../src/node/model').AccessStatus;
const Credentials = require('../../src/node/model').Credentials;
const config = require('config');

exports.Storage = class {

    /**
     * Constructor for setting github repository name.
     * @param {GithubClient} github
     */
    constructor(github) {
        this.accessControl = new AccessControl(github);
        /**
         * @type {GithubClient}
         */
        this.github = github;
    }

    /**
     * List file access list.
     * @param path the path
     * @param credentials the credentials
     * @returns {Promise<Access[]>} list of users
     */
    async getAccessList(path, credentials) {
        let accessStatus = await this.accessControl.check(path, credentials.email, credentials.token, [Role.ADMIN]);
        if (accessStatus === AccessStatus.NONE) {
            return [];
        } else if (accessStatus !== AccessStatus.GRANTED) {
            throw new Error(accessStatus.toString());
        }
        return await this.accessControl.getAccessList(path);
    }

    /**
     * Grants user access to file and emails access token to the user.
     * @param {String} path the path
     * @param {String} email the user email
     * @param {String} role the user role
     * @returns {Promise<string>} the access token
     */
    async grant(path, email, role, credentials) {
        let accessStatus = await this.accessControl.check(path, credentials.email, credentials.token, [Role.ADMIN]);
        if (accessStatus === AccessStatus.NONE) {
            if (role === Role.ADMIN) {
                console.log(email + ' self granting ADMIN role to ' + path);
            } else {
                throw new Error("Self grant of ADMIN role only allowed.");
            }
        } else if (accessStatus !== AccessStatus.GRANTED) {
            throw new Error(accessStatus.toString());
        }

        const token = crypto.randomBytes(32).toString('base64');
        if (this.sendEmailConfigured()) {
            await this.sendEmail(email, 'Storage access grant ' + path, 'Path: ' + path + '\nRole: ' + role + '\nToken:\n' + token);
        } else {
            console.log("access token (email not configured): " + email  + ":" + path + ":" + role + ":" + token);
        }

        console.log(credentials.email + " granted " + email + " " + role + " role for " + path);
        await this.accessControl.setToken(path, email, token);
        await this.accessControl.grant(path, email, role);
        return token;
    }

    /**
     * Revokes user access from file.
     * @param {String} path the path
     * @param {String} email the email
     * @param {String} role the role
     * @param {Credentials}  credentials the credentials
     * @returns {Promise<void>}
     */
    async revoke(path, email, role, credentials) {
        let accessStatus = await this.accessControl.check(path, credentials.email, credentials.token, [Role.ADMIN]);
        if (accessStatus !== AccessStatus.GRANTED) {
            throw new Error("Access denied, access status for path: " + path + " is " + accessStatus.toString());
        }
        if (email !== credentials.email && role === Role.ADMIN) {
            throw new Error("ADMIN role can not be revoked from other users.");
        }

        console.log(credentials.email + " revoked " + email + " " + role + " role for " + path);
        await this.accessControl.revoke(path, credentials.email, role);
    }

    /**
     * Save content to file.
     * @param {String} path the file path
     * @param {String} content the file content
     * @param {Credentials} credentials the email and token
     * @returns {Promise<void>}
     */
    async save(path, content, credentials) {
        if (path.endsWith('.access')) {
            throw new Error(".access files can not be used as storage paths: " + path);
        }
        let accessStatus = await this.accessControl.check(path, credentials.email, credentials.token, [Role.ADMIN, Role.USER]);
        if (accessStatus !== AccessStatus.GRANTED) {
            throw new Error(accessStatus.toString());
        }
        console.log(credentials.email + " saved " + path);
        await this.github.writeFile(path, content, this.accessControl.encryptEmail(path, credentials.email) + ' saved file: ' + path);
    }

    /**
     * Load content from file.
     * @param {String} path the file path
     * @param {Credentials} credentials the email and token
     * @returns {Promise<String>} promise of content
     */
    async load(path, credentials) {
        let accessStatus = await this.accessControl.check(path, credentials.email, credentials.token, [Role.ADMIN, Role.USER]);
        if (accessStatus === AccessStatus.NONE) {
            return null;
        }
        if (accessStatus !== AccessStatus.GRANTED) {
            throw new Error(accessStatus.toString());
        }
        return await this.github.getFile(path);
    }

    /**
     * Remove file.
     * @param {String} path the file path
     * @param {Credentials} credentials the email and token
     * @returns {Promise<void>}
     */
    async remove(path, credentials) {
        let accessStatus = await this.accessControl.check(path, credentials.email, credentials.token, [Role.ADMIN, Role.USER]);
        if (accessStatus !== AccessStatus.GRANTED) {
            throw new Error(accessStatus.toString());
        }
        console.log(credentials.email + " deleted " + path);
        await this.github.deleteFile(path);
        await this.github.deleteFile(path + '.access');
    }

    /**
     * Gets current branch head commit hash.
     * @returns {Promise<String>}
     */
    async getHeadCommitHash() {
        return await this.github.getHeadCommitHash();
    }

    /**
     * Checks if email sending is configured.
     * @returns {value}
     */
    sendEmailConfigured() {
        return config.get('SMTP.host');
    }

    /**
     * Sends email.
     * @param {String} email
     * @param {String} subject
     * @param {String} text
     * @returns {Promise<any>} email send info
     */
    async sendEmail(email, subject, text) {
        return new Promise(function(resolve, reject) {
            const transporter = nodemailer.createTransport(config.get('SMTP.username') ?
                {
                    host: config.get('SMTP.host'),
                    port: config.get('SMTP.port'),
                    secure: ('true' === config.get('SMTP.secure').toString()),
                    auth: {user: config.get('SMTP.username'), pass: config.get('SMTP.password')}
                } :
                {
                    host: config.get('SMTP.host'),
                    port: config.get('SMTP.port'),
                    secure: ('true' === config.get('SMTP.secure').toString())
                }
            );

            const mailOptions = {
                from: config.get('SMTP.from'),
                to: email,
                subject: subject,
                text: text
            };

            if (email.includes("@")) {
                transporter.sendMail(mailOptions, function (error, info) {
                    if (error) {
                        reject(error);
                    } else {
                        resolve(info);
                    }
                });
            } else {
                console.log('email to ' + email + ' ignored. subject:' + subject + ' text:' + text);
                resolve();
            }
        })
    }

    //let regionPosition = this.getRegionPosition(entity.position);
    /**
     * Calculates region position from position.
     * @param {Vector3} position
     * @returns {Vector3} the region position
     */
    /*getRegionPosition(position) {
        return new Vector3(Math.round(position.x / 100) * 100, Math.round(position.y / 100) * 100, Math.round(position.z / 100) * 100)
    }*/
}