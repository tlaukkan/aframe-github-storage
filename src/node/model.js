
exports.Role = {
    ADMIN: 'ADMIN',
    USER: 'USER'
};

exports.AccessStatus = {
    NONE: 'NONE',
    NOT_FOUND: 'NOT_FOUND',
    INVALID_TOKEN: 'INVALID_TOKEN',
    NO_TOKEN: 'NO_TOKEN',
    DENIED: 'DENIED',
    GRANTED: 'GRANTED'
};

exports.Access = class {
    constructor() {
        /** @type {String} */
        this.email = '';
        /** @type {String[]} */
        this.roles = [];
        /** @type {String} */
        this.tokenHash = '';
    }
};

exports.Credentials = class {
    /**
     * @param {String} email
     * @param {String} token
     * @param {String} repository
     */
    constructor(email, token, repository) {
        this.repository = repository;
        this.email=email;
        this.token=token;
    }
};

exports.Entity = class {
    constructor() {
        this.position = new Vector3();
    }
};

exports.Vector3 = class {
    constructor() {
        this.x = 0;
        this.y = 0;
        this.z = 0;
    }
};

exports.MessageType = {
    GET_ACCESS_LIST_REQUEST: 'GET_ACCESS_LIST_REQUEST',
    GET_ACCESS_LIST_RESPONSE: 'GET_ACCESS_LIST_RESPONSE',
    GRANT_REQUEST: 'GRANT_REQUEST',
    GRANT_RESPONSE: 'GRANT_RESPONSE',
    REVOKE_REQUEST: 'REVOKE_REQUEST',
    REVOKE_RESPONSE: 'REVOKE_RESPONSE',
    SAVE_REQUEST: 'SAVE_REQUEST',
    SAVE_RESPONSE: 'SAVE_RESPONSE',
    LOAD_REQUEST: 'LOAD_REQUEST',
    LOAD_RESPONSE: 'LOAD_RESPONSE',
    REMOVE_REQUEST: 'REMOVE_REQUEST',
    REMOVE_RESPONSE: 'REMOVE_RESPONSE',
    GET_CDN_URL_PREFIX_REQUEST: 'GET_HEAD_COMMIT_HASH_REQUEST',
    GET_CDN_URL_PREFIX_RESPONSE: 'GET_HEAD_COMMIT_HASH_RESPONSE',
    ERROR_RESPONSE: 'ERROR_RESPONSE'
};

exports.MessageEnvelop = class {
    /**
     * @param {String} requestId
     * @param {String} json
     * @param {Credentials} credentials
     */
    constructor(requestId, message, credentials) {
        this.requestId = requestId;
        this.message = message;
        this.credentials = credentials;
    }
};

exports.GetAccessListRequest = class {
    /**
     * @param {String} path
    */
    constructor(path) {
        this.path = path;
        this.messageType = exports.MessageType.GET_ACCESS_LIST_REQUEST;
    }
};

exports.GetAccessListResponse = class {
    /**
     * @param {Access[]} accessList
     */
    constructor(accessList) {
        this.accessList = accessList;
        this.messageType = exports.MessageType.GET_ACCESS_LIST_RESPONSE;
    }
};

exports.GrantRequest = class {
  /**
   * @param {String} path
   * @param {String} email
   * @param {String} role
   */
  constructor(path, email, role) {
      this.path = path;
      this.email = email;
      this.role = role;
      this.messageType = exports.MessageType.GRANT_REQUEST;
  }
};

exports.GrantResponse = class {
    /**
     */
    constructor() {
        this.messageType = exports.MessageType.GRANT_RESPONSE;
    }
};

exports.RevokeRequest = class {
    /**
     * @param {String} path
     * @param {String} email
     * @param {String} role
     */
    constructor(path, email, role) {
        this.path = path;
        this.email = email;
        this.role = role;
        this.messageType = exports.MessageType.REVOKE_REQUEST;
    }
};

exports.RevokeResponse = class {
    /**
     */
    constructor() {
        this.messageType = exports.MessageType.REVOKE_RESPONSE;
    }
};

exports.SaveRequest = class {
    /**
     * @param {String} path
     * @param {String} content
     */
    constructor(path, content) {
        this.path = path;
        this.content = content;
        this.messageType = exports.MessageType.SAVE_REQUEST;
    }
};

exports.SaveResponse = class {
    /**
     */
    constructor() {
        this.messageType = exports.MessageType.SAVE_RESPONSE;
    }
};

exports.LoadRequest = class {
    /**
     * @param {String} path
     */
    constructor(path,) {
        this.path = path;
        this.messageType = exports.MessageType.LOAD_REQUEST;
    }
};

exports.LoadResponse = class {
    /**
     * @param {String} content
     */
    constructor(content) {
        this.content = content;
        this.messageType = exports.MessageType.LOAD_RESPONSE;
    }
};

exports.RemoveRequest = class {
    /**
     * @param {String} path
     */
    constructor(path,) {
        this.path = path;
        this.messageType = exports.MessageType.REMOVE_REQUEST;
    }
};

exports.RemoveResponse = class {
    /**
     */
    constructor() {
        this.messageType = exports.MessageType.REMOVE_RESPONSE;
    }
};

exports.GetCdnUrlPrefix = class {
    /**
     */
    constructor() {
        this.messageType = exports.MessageType.GET_CDN_URL_PREFIX_REQUEST;
    }
};

exports.GetCdnUrlPrefixResponse = class {
    /**
     * @param {String} commitHash
     */
    constructor(commitHash) {
        this.commitHash = commitHash;
        this.messageType = exports.MessageType.GET_CDN_URL_PREFIX_RESPONSE;
    }
};

exports.ErrorResponse = class {
    /**
     * @param {String} error
     */
    constructor(error) {
        this.error = error;
        this.messageType = exports.MessageType.ERROR_RESPONSE;
    }
};

exports.StorageType = {
    GITHUB: 'GITHUB'
};

exports.StorageDescriptor = class {
    /**
     * @param {String} storageType
     * @param {String} repository
     * @param {String} elementRegExpPattern
     * @param {String} attributeRegExpPattern
     */
    constructor(storageType, repository, elementRegExpPattern, attributeRegExpPattern) {
        this.storageType = storageType;
        this.repository = repository;
        this.elementRegExpPattern = elementRegExpPattern;
        this.attributeRegExpPattern = attributeRegExpPattern;
    }
};