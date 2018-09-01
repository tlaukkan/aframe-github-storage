const model =  require( './model');
const MessageEnvelop = model.MessageEnvelop;
const GetAccessListRequest = model.GetAccessListRequest;
const GetAccessListResponse = model.GetAccessListResponse;
const GrantRequest = model.GrantRequest;
const RevokeRequest = model.RevokeRequest;
const SaveRequest = model.SaveRequest;
const LoadRequest = model.LoadRequest;
const LoadResponse = model.LoadResponse;
const RemoveRequest = model.RemoveRequest;
const GetHeadCommitHashRequest = model.GetHeadCommitHashRequest;
const GetHeadCommitHashResponse = model.GetHeadCommitHashResponse;
const uuidv4 = require('uuid/v4');

class RejectResolve {
    /**
     * @param {(value?: (any)) => void} resolve
     * @param {(value?: (any)) => void} reject
     * @param {Object} sendTimeout
     */
    constructor(resolve, reject, sendTimeout) {
        this.resolve = resolve;
        this.reject = reject;
        this.sendTimeout = sendTimeout;
    }
}

exports.StorageClient = class {
    constructor(WebSocket, url, credentials) {
        this.State = {
            CONNECTING: 'CONNECTING',
            CONNECTION_FAILED: 'CONNECTION_FAILED',
            CONNECTED: 'CONNECTED',
            DISCONNECTED: 'DISCONNECTED'
        };
        this.WebSocket = WebSocket;

        this.url = url;
        this.credentials = credentials;
        this.state = this.State.DISCONNECTED;
        this.webSocket = null;

        /**
         * @type {Map<String, RejectResolve}
         */
        this.messageResolveMap = new Map();
    }

    /**
     * Connects client to storage server.
     * @returns {Promise<any>}
     */
    connect () {
        if (this.state !== this.State.DISCONNECTED && this.state !== this.State.CONNECTION_FAILED) {
            console.log.error("storage client connect() called when in state is not disconnected or connection failed");
            throw new Error("storage client connect() called when in state is not disconnected or connection failed: " + this.state);
        }
        return new Promise((resolve, reject) => {
            this.state = this.State.CONNECTING;
            if (this.webSocket) {
                this.webSocket.close();
            }
            this.webSocket = new this.WebSocket(this.url, 'storage');
            this.webSocket.onerror = (error) => {
                this.processConnectionError(error);
                reject(error);
            };
            this.webSocket.onclose = () => this.processClose();
            this.webSocket.onopen = () => {
                this.processOpen()
                resolve();
            };
            this.webSocket.onmessage = (message) => {
                this.processMessage(message);
            };
            console.log('storage client connecting ' + this.url)
        });
    };

    /**
     * Process connection error.
     * @param error the error
     */
    processConnectionError(error) {
        if (this.state != this.State.CONNECTING) {
            console.log('storage client connection error: ' + error);
            this.onConnectionError(error);
            this.disconnect();
        } else {
            console.log('storage client connect failed:' + error);
            this.state = this.State.CONNECTION_FAILED;
        }
    }

    /**
     * Process connection close.
     */
    processClose() {
        console.log('storage client disconnected');
        this.state = this.State.DISCONNECTED;
        this.onDisconnect();
        this.webSocket.close();
    }

    /**
     * Process connection open.
     */
    processOpen() {
        console.log('storage client connected');
        this.state = this.State.CONNECTED;
    }

    /**
     * Process received message.
     * @param message the message
     */
    processMessage(message) {
        if (typeof message.data === 'string') {
            //console.log('storage client received: ' + message.data);
            /**
             * @type {MessageEnvelop}
             */
            const envelop = JSON.parse(message.data);

            if (this.messageResolveMap.has(envelop.requestId)) {
                /**
                 * @type {RejectResolve}
                 */
                let rejectResolve = this.messageResolveMap.get(envelop.requestId);
                if (rejectResolve.sendTimeout) {
                    clearTimeout(rejectResolve.sendTimeout);
                    rejectResolve.sendTimeout = undefined;
                }
                if (envelop.message.error) {
                    rejectResolve.reject('timeout');
                } else {
                    rejectResolve.resolve(envelop.message);
                }
                this.messageResolveMap.delete(envelop.requestId);
            }
            this.onReceive(message);
        }
    }

    /**
     * Disconnects client.
     */
    disconnect() {
        this.webSocket.close()
    };

    /**
     * Event handler for connection error.
     */
    onConnectionError() {

    };

    /**
     * Event handler for client disconnection.
     */
    onDisconnect() {

    };

    /**
     * @param {MessageEnvelop } envelop
     */
    onReceive(envelop) {

    };

    /**
     * @param {MessageEnvelop} envelop
     */
    send(envelop) {
        if (this.state !== this.State.CONNECTED) {
            throw new Error("storage client send() called when in state is not connected: " + this.state);
        }
        return new Promise((resolve, reject) => {
            const sendTimeout = setTimeout(function () {
                if (this.messageResolveMap.has(envelop.requestId)) {
                    this.messageResolveMap.get(envelop.requestId).reject('storage client send timeout :' + envelop.requestId + ' ' + envelop.message.messageType);
                    this.messageResolveMap.get(envelop.requestId).sendTimeout = undefined;
                    this.messageResolveMap.delete(envelop.requestId);
                }
            }, 10000);
            this.messageResolveMap.set(envelop.requestId, new RejectResolve(resolve, reject, sendTimeout));
            this.webSocket.send(JSON.stringify(envelop));
        });
    };

    /**
     * @param {String} path
     * @returns {Promise<Access[]>}
     */
    async getAccessList(path) {
        /**
         * @type {GetAccessListResponse}
         */
        let response = await this.send(new MessageEnvelop(uuidv4(), new GetAccessListRequest(path), this.credentials));
        return response.accessList;
    }

    /**
     * @param {String} path
     * @param {String} email
     * @param {String} role
     * @returns {Promise<void>}
     */
    async grant(path, email, role) {
        await this.send(new MessageEnvelop(uuidv4(), new GrantRequest(path, email, role), this.credentials));
    }

    /**
     * @param {String} path
     * @param {String} email
     * @param {String} role
     * @returns {Promise<void>}
     */
    async revoke(path, email, role) {
        await this.send(new MessageEnvelop(uuidv4(), new RevokeRequest(path, email, role), this.credentials));
    }

    /**
     * @param {String} path
     * @param {String} content
     * @returns {Promise<void>}
     */
    async save(path, content) {
        await this.send(new MessageEnvelop(uuidv4(), new SaveRequest(path, content), this.credentials));
    }

    /**
     * @param {String} path
     * @returns {Promise<String>}
     */
    async load(path) {
        /**
         * @type {LoadResponse}
         */
        const response = await this.send(new MessageEnvelop(uuidv4(), new LoadRequest(path), this.credentials));
        return response.content;
    }

    /**
     * @param {String} path
     * @returns {Promise<void>}
     */
    async remove(path) {
        await this.send(new MessageEnvelop(uuidv4(), new RemoveRequest(path), this.credentials));
    }

    /**
     * @returns {Promise<String>}
     */
    async getHeadCommitHash() {
        /**
         * @type {GetHeadCommitHashResponse}
         */
        const response = await this.send(new MessageEnvelop(uuidv4(), new GetHeadCommitHashRequest(), this.credentials));
        return response.commitHash;
    }

};

