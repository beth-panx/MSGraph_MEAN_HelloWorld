'use strict';
const request = require('superagent');
const packageInfo = require('../package.json');
const oDataQueryNames = ["$select", "$expand", "$orderby", "$filter", "$top", "$skip", "$skipToken", "$count"];
const DEFAULT_VERSION = "v1.0";
const GRAPH_BASE_URL = "https://graph.microsoft.com/";
class GraphRequest {
    constructor(config, path) {
        this.config = config;
        this.urlParamSubstitutions = {};
        this._headers = {};
        this.urlComponents = {
            host: this.config.baseUrl,
            version: this.config.defaultVersion,
            oDataQueryParams: {},
            otherURLQueryParams: {}
        };
        this.parsePath(path);
    }
    header(headerKey, headerValue) {
        this._headers[headerKey] = headerValue;
        return this;
    }
    headers(headers) {
        for (let key in headers) {
            this._headers[key] = headers[key];
        }
        return this;
    }
    parsePath(rawPath) {
        var startsWithBaseUrlPattern = /^https:[\/][\/]/i;
        if (rawPath.indexOf("https://") != -1) {
            rawPath = rawPath.replace("https://", "");
            let endOfHostStrPos = rawPath.indexOf("/");
            this.urlComponents.host = "https://" + rawPath.substring(0, endOfHostStrPos);
            rawPath = rawPath.substring(endOfHostStrPos + 1, rawPath.length);
            let endOfVersionStrPos = rawPath.indexOf("/");
            this.urlComponents.version = rawPath.substring(0, endOfVersionStrPos);
            rawPath = rawPath.substring(endOfVersionStrPos + 1, rawPath.length);
        }
        if (rawPath.charAt(0) == "/") {
            rawPath = rawPath.substr(1);
        }
        let queryStrPos = rawPath.indexOf("?");
        if (queryStrPos == -1) {
            this.urlComponents.path = rawPath;
        }
        else {
            this.urlComponents.path = rawPath.substr(0, queryStrPos);
            let queryParams = rawPath.substring(queryStrPos + 1, rawPath.length).split("&");
            for (let queryParam of queryParams) {
                let param = queryParam.split("=");
                let key = param[0];
                let value = param[1];
                if (oDataQueryNames.indexOf(key)) {
                    this.urlComponents.oDataQueryParams[key] = value;
                }
                else {
                    this.urlComponents.otherURLQueryParams[key] = value;
                }
            }
        }
    }
    urlJoin(urlSegments) {
        const tr = (s) => s.replace(/\/+$/, '');
        const tl = (s) => s.replace(/^\/+/, '');
        const joiner = (pre, cur) => [tr(pre), tl(cur)].join('/');
        const parts = Array.prototype.slice.call(urlSegments);
        return parts.reduce(joiner);
    }
    buildFullUrl() {
        let pathForSubstitutingParams = this.urlComponents.path;
        for (var param in this.urlParamSubstitutions) {
            pathForSubstitutingParams = pathForSubstitutingParams.replace(new RegExp("{" + param + "}", 'g'), this.urlParamSubstitutions[param]);
        }
        let url = this.urlJoin([this.urlComponents.host,
            this.urlComponents.version,
            pathForSubstitutingParams])
            + this.createQueryString();
        if (this.config.debugLogging) {
            console.log(url);
        }
        return url;
    }
    version(v) {
        this.urlComponents.version = v;
        return this;
    }
    select(properties) {
        this.addCsvQueryParamater("$select", properties);
        return this;
    }
    expand(properties) {
        this.addCsvQueryParamater("$expand", properties);
        return this;
    }
    orderby(properties) {
        this.addCsvQueryParamater("$orderby", properties);
        return this;
    }
    filter(filterStr) {
        this.urlComponents.oDataQueryParams["$filter"] = filterStr;
        return this;
    }
    top(n) {
        this.urlComponents.oDataQueryParams["$top"] = n;
        return this;
    }
    skip(n) {
        this.urlComponents.oDataQueryParams["$skip"] = n;
        return this;
    }
    skipToken(token) {
        this.urlComponents.oDataQueryParams["$skipToken"] = token;
        return this;
    }
    count(count) {
        this.urlComponents.oDataQueryParams["$count"] = count.toString();
        return this;
    }
    addCsvQueryParamater(propertyName, propertyValue) {
        this.urlComponents.oDataQueryParams[propertyName] = this.urlComponents.oDataQueryParams[propertyName] ? this.urlComponents.oDataQueryParams[propertyName] + "," : "";
        if (typeof propertyValue === "string") {
            this.urlComponents.oDataQueryParams[propertyName] += propertyValue;
        }
        else if (propertyValue instanceof Array) {
            this.urlComponents.oDataQueryParams[propertyName] += propertyValue.join(",");
        }
        else {
            console.error(propertyName, "accepts a string or array");
        }
    }
    get(callback) {
        let url = this.buildFullUrl();
        this.onEnd(callback, request
            .get(url));
    }
    delete(callback) {
        let url = this.buildFullUrl();
        this.onEnd(callback, request.del(url));
    }
    patch(content, callback) {
        let url = this.buildFullUrl();
        this.onEnd(callback, request
            .patch(url)
            .send(content));
    }
    post(content, callback) {
        let url = this.buildFullUrl();
        this.onEnd(callback, request
            .post(url)
            .send(content));
    }
    setParam(params) {
        for (let key in params) {
            this.urlParamSubstitutions[key] = params[key];
        }
        return this;
    }
    create(content, callback) {
        this.post(content, callback);
    }
    update(content, callback) {
        this.patch(content, callback);
    }
    del(callback) {
        this.delete(callback);
    }
    onEnd(callback, requestBuilder) {
        this.config.authProvider((err, accessToken) => {
            if (err === null && accessToken !== null) {
                let request = this.configureRequest(requestBuilder, accessToken);
                request.end((err, res) => this.handleResponse(err, res, callback));
            }
            else {
                callback(err, null, null);
            }
        });
    }
    getStream(callback) {
        this.config.authProvider((err, accessToken) => {
            if (err === null && accessToken !== null) {
                let url = this.buildFullUrl();
                callback(null, this.configureRequest(request.get(url), accessToken));
            }
            else {
                callback(err, null);
            }
        });
    }
    put(stream, errorCallback) {
        this.config.authProvider((err, accessToken) => {
            if (err === null && accessToken !== null) {
                let url = this.buildFullUrl();
                let req = this.configureRequest(request.put(url), accessToken);
                req.type('application/octet-stream');
                stream.pipe(req).on('error', errorCallback);
            }
        });
    }
    configureRequest(requestBuilder, accessToken) {
        return requestBuilder
            .set('Authorization', 'Bearer ' + accessToken)
            .set(this._headers)
            .set('SdkVersion', "graph-js-" + packageInfo.version);
    }
    getResultIterator() {
        let values = [];
        let nextLink;
        let get = (url) => {
            return (callback) => {
                if (values.length > 0) {
                    callback(null, values.splice(0, 1)[0]);
                }
                else {
                    if (nextLink != null) {
                        url = nextLink;
                    }
                    _this.onEnd((err, res) => {
                        if (err) {
                            callback(err, null);
                            return;
                        }
                        values = values.concat(res.value);
                        nextLink = res["@odata.nextLink"];
                        callback(err, values[0]);
                    }, request.get(url));
                }
            };
        };
        let _this = this;
        return function* () {
            let url = _this.buildFullUrl();
            while (true) {
                yield get(url);
            }
        }();
    }
    query(queryDictionary) {
        for (let key in queryDictionary) {
            this.urlComponents.otherURLQueryParams[key] = queryDictionary[key];
        }
        return this;
    }
    handleResponse(err, res, callback) {
        if (res) {
            callback(err, res.body, res);
        }
        else {
            callback(err, null, res);
        }
    }
    createQueryString() {
        let q = [];
        if (Object.keys(this.urlComponents.oDataQueryParams).length != 0) {
            for (let property in this.urlComponents.oDataQueryParams) {
                q.push(property + "=" + this.urlComponents.oDataQueryParams[property]);
            }
        }
        if (Object.keys(this.urlComponents.otherURLQueryParams).length != 0) {
            for (let property in this.urlComponents.otherURLQueryParams) {
                q.push(property + "=" + this.urlComponents.otherURLQueryParams[property]);
            }
        }
        if (q.length > 0) {
            return "?" + q.join("&");
        }
        return "";
    }
}
exports.GraphRequest = GraphRequest;
module.exports = class MicrosoftGraphClient {
    constructor() {
        this.config = {
            debugLogging: false,
            parseDates: true,
            defaultVersion: DEFAULT_VERSION,
            baseUrl: GRAPH_BASE_URL
        };
    }
    static init(clientOptions) {
        var graphClient = new MicrosoftGraphClient();
        for (let key in clientOptions) {
            graphClient.config[key] = clientOptions[key];
        }
        return graphClient;
    }
    api(path) {
        return new GraphRequest(this.config, path);
    }
}
;
//# sourceMappingURL=index.js.map