const config = require('config');
const http  = require( 'http');
const WebSocketServer = require('websocket').server;

const GithubClient = require('./github-client').GithubClient;
const Storage = require('./storage').Storage;
const XmlValidator = require('./xml-validator').XmlValidator;

const model =  require( './model');
const StorageDescriptor = model.StorageDescriptor;
const MessageType = model.MessageType;
const MessageEnvelop = model.MessageEnvelop;
const GetAccessListRequest = model.GetAccessListRequest;
const GetAccessListResponse = model.GetAccessListResponse;
const GrantRequest = model.GrantRequest;
const GrantResponse = model.GrantResponse;
const RevokeRequest = model.RevokeRequest;
const RevokeResponse = model.RevokeResponse;
const SaveRequest = model.SaveRequest;
const SaveResponse = model.SaveResponse;
const LoadRequest = model.LoadRequest;
const LoadResponse = model.LoadResponse;
const RemoveRequest = model.RemoveRequest;
const RemoveResponse = model.RemoveResponse;
const GetHeadCommitHashRequest = model.GetHeadCommitHashRequest;
const GetHeadCommitHashResponse = model.GetHeadCommitHashResponse;
const ErrorResponse = model.ErrorResponse;

exports.StorageServer = class {

    /**
     * @param {String} host
     * @param {String} port
     */
    constructor(host, port) {
        this.host = host;
        this.port = port;
        /**
         * @type {Map<String, Storage>}
         */
        this.storages = new Map();
        /**
         * @type {Map<String, XmlValidator>}
         */
        this.validators = new Map();
    }

    async listen() {
        console.log('storage server starting...');

        /**
         * @type {String}
         */
        const descriptorsString = config.get('Storage.descriptors');

        /**
         * @type {Array<StorageDescriptor>}
         */
        const descriptors = JSON.parse(descriptorsString);
        for (const descriptor of descriptors) {
            console.log('Starting up storage: ' + JSON.stringify(descriptor));
            const github = new GithubClient(config.get('Github.username'), config.get('Github.token'));
            await github.setRepo(descriptor.repository);
            await github.setBranch('master');
            this.storages.set(descriptor.repository, new Storage(github));
            this.validators.set(descriptor.repository, new XmlValidator(descriptor.elementRegExpPattern, descriptor.attributeRegExpPattern));
        }

        this.httpServer = http.createServer(function (request, response) {
            if (request.url.endsWith('/health-check')) {
                response.writeHead(200, {'Content-Type': 'text/plain'});
                response.end();
            }
        });

        const webSocketServer = new WebSocketServer({ httpServer: this.httpServer });
        webSocketServer.on('request', (request) => this.processConnection(request));

        this.httpServer.listen(this.port, this.host);

        console.log('storage server started at ws://' + this.host + ':' + this.port + '/');
    }

    /**
     * Closes storage server.
     */
    close() {
        console.log('storage server closing ...');
        this.httpServer.close();
        console.log('storage server closed');
        this.onClosed();
    }

    /**
     * Event handler for called after storage server is closed.
     */
    onClosed() {
    }

    /**
     * Processes connection request.
     * @param request connection request
     */
    processConnection(request) {
        console.log('storage served connected from ' + request.socket.remoteAddress + ':' + request.socket.remotePort);

        const connection = request.accept('storage', request.origin);
        connection.on('message', async (message) => {
            await this.processEnvelop(connection, JSON.parse(message.utf8Data))
        });
        connection.on('close', function () {
            console.log('storage served disconnected from ' + request.socket.remoteAddress + ':' + request.socket.remotePort);
        });
    }

    /**
     * @param {Object} connection
     * @param {MessageEnvelop} envelop
     * @param {Object} response
     */
    sendResponse(connection, envelop, response) {
        connection.sendUTF(JSON.stringify(new MessageEnvelop(envelop.requestId, response)));
    }

    /**
     * @param {Object} connection
     * @param {MessageEnvelop} envelop
     * @param {String} errorMessage
     */
    handleError(connection, envelop, errorMessage) {
        const envelopString = JSON.stringify(new MessageEnvelop(envelop.requestId, new ErrorResponse(errorMessage)));
        connection.sendUTF(envelopString);
    }

    /**
     * @param {Object} connection
     * @param {MessageEnvelop} envelop
     */
    async processEnvelop(connection, envelop) {
        try {
            if (!this.storages.has(envelop.credentials.repository)) {
                this.handleError(connection, envelop, "no such repository: " + envelop.credentials.repository);
            } else if (!envelop.message) {
                this.handleError(connection, envelop, "envelope does not contain message");
            } else if (!envelop.message.messageType) {
                this.handleError(connection, envelop, "envelope.message does not contain messageType");
            } else if (envelop.message.messageType === MessageType.GET_ACCESS_LIST_REQUEST) {
                await this.processGetAccessListRequest(connection, envelop, envelop.message);
            } else if (envelop.message.messageType === MessageType.GRANT_REQUEST) {
                await this.processGrantRequest(connection, envelop, envelop.message);
            } else if (envelop.message.messageType === MessageType.REVOKE_REQUEST) {
                await this.processRevokeRequest(connection, envelop, envelop.message);
            } else if (envelop.message.messageType === MessageType.SAVE_REQUEST) {
                await this.processSaveRequest(connection, envelop, envelop.message);
            } else if (envelop.message.messageType === MessageType.LOAD_REQUEST) {
                await this.processLoadRequest(connection, envelop, envelop.message);
            } else if (envelop.message.messageType === MessageType.REMOVE_REQUEST) {
                await this.processRemoveRequest(connection, envelop, envelop.message);
            } else if (envelop.message.messageType === MessageType.GET_HEAD_COMMIT_HASH_REQUEST) {
                await this.processGetHeadCommitHashRequest(connection, envelop, envelop.message);
            } else {
                this.handleError(connection, envelop, "no such message type: " + envelop.message.messageType);
            }
        } catch (e) {
            console.log(e.stack);
            this.handleError(connection, envelop, e.name + ': ' + e.message);
        }
    }

    /**
     * @param {Object} connection
     * @param {MessageEnvelop} envelop
     * @param {GetAccessListRequest} request
     * @returns {Promise<void>}
     */
    async processGetAccessListRequest(connection, envelop, request) {
        let accessList = await (this.storages.get(envelop.credentials.repository).getAccessList(request.path, envelop.credentials));
        this.sendResponse(connection, envelop, new GetAccessListResponse(accessList));
    }

    /**
     * @param {Object} connection
     * @param {MessageEnvelop} envelop
     * @param {GrantRequest} request
     * @returns {Promise<void>}
     */
    async processGrantRequest(connection, envelop, request) {
        await this.storages.get(envelop.credentials.repository).grant(request.path, request.email, request.role, envelop.credentials);
        this.sendResponse(connection, envelop, new GrantResponse());
    }


    /**
     * @param {Object} connection
     * @param {MessageEnvelop} envelop
     * @param {RevokeRequest} request
     * @returns {Promise<void>}
     */
    async processRevokeRequest(connection, envelop, request) {
        await this.storages.get(envelop.credentials.repository).revoke(request.path, request.email, request.role, envelop.credentials);
        this.sendResponse(connection, envelop, new RevokeResponse());
    }


    /**
     * @param {Object} connection
     * @param {MessageEnvelop} envelop
     * @param {SaveRequest} request
     * @returns {Promise<void>}
     */
    async processSaveRequest(connection, envelop, request) {
        const errors = this.validators.get(envelop.credentials.repository).validate(request.content);
        if (errors.length > 0) {
            console.log(envelop.credentials.email + " save failed due to validation error: " + errors);
            this.handleError(connection, envelop, JSON.stringify(errors));
        } else {
            await this.storages.get(envelop.credentials.repository).save(request.path, await this.validators.get(envelop.credentials.repository).format(request.content), envelop.credentials);
            this.sendResponse(connection, envelop, new SaveResponse());
        }
    }


    /**
     * @param {Object} connection
     * @param {MessageEnvelop} envelop
     * @param {LoadRequest} request
     * @returns {Promise<void>}
     */
    async processLoadRequest(connection, envelop, request) {
        const content = await this.storages.get(envelop.credentials.repository).load(request.path, envelop.credentials);
        this.sendResponse(connection, envelop, new LoadResponse(content));
    }


    /**
     * @param {Object} connection
     * @param {MessageEnvelop} envelop
     * @param {RemoveRequest} request
     * @returns {Promise<void>}
     */
    async processRemoveRequest(connection, envelop, request) {
        await this.storages.get(envelop.credentials.repository).remove(request.path, envelop.credentials);
        this.sendResponse(connection, envelop, new RemoveResponse());
    }

    /**
     * @param {Object} connection
     * @param {MessageEnvelop} envelop
     * @param {GetHeadCommitHashRequest} request
     * @returns {Promise<void>}
     */
    async processGetHeadCommitHashRequest(connection, envelop, request) {
        const commitHash = await this.storages.get(envelop.credentials.repository).getHeadCommitHash();
        this.sendResponse(connection, envelop, new GetHeadCommitHashResponse(commitHash));
    }
};
