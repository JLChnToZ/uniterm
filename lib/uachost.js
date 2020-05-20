"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectToClient = void 0;
const msgpack_lite_1 = require("msgpack-lite");
const net_1 = require("net");
const path_1 = require("path");
const terminals_1 = require("./terminals");
function connectToClient(path) {
    let host;
    let flushRequested = false;
    const client = net_1.connect(path_1.join('\\\\.\\pipe', path));
    client
        .on('end', handleRemoteClose)
        .on('close', handleRemoteClose)
        .pipe(msgpack_lite_1.createDecodeStream())
        .on('data', handleRequest);
    const writer = msgpack_lite_1.createEncodeStream();
    writer.pipe(client);
    function handleRequest(data) {
        try {
            switch (data[0]) {
                case 3 /* Spawn */:
                    if (host)
                        throw new Error('Host is already spawned.');
                    host = terminals_1.createBackend(data[1]);
                    host
                        .on('data', handleResponse)
                        .on('end', handleClose)
                        .on('error', handleError)
                        .spawn();
                    break;
                case 1 /* Data */:
                    if (!host)
                        throw new Error('Host is not spawned.');
                    host.write(data[1]);
                    break;
                case 2 /* Resize */:
                    if (!host)
                        throw new Error('Host is not spawned.');
                    host.resize(data[1], data[2]);
                    break;
                case 127 /* Exit */:
                    if (!host)
                        throw new Error('Host is not spawned.');
                    host.destroy();
                    break;
                default: throw new Error('Invalid code');
            }
        }
        catch (_a) {
            client.destroy();
        }
    }
    function handleResponse(data) {
        writeAndFlush(1 /* Data */, data);
    }
    function handleClose(code, signal) {
        if (host)
            host = undefined;
        writeAndFlush(127 /* Exit */, code || 0, signal || 0);
    }
    function handleError(error) {
        writeAndFlush(126 /* Error */, error.message);
    }
    function handleRemoteClose() {
        if (host)
            host.destroy();
        process.exit();
    }
    function writeAndFlush(...data) {
        writer.write(data);
        if (flushRequested)
            return;
        flushRequested = true;
        process.nextTick(flush);
    }
    function flush() {
        writer.encoder.flush();
        flushRequested = false;
    }
}
exports.connectToClient = connectToClient;
if (module === process.mainModule)
    connectToClient(process.argv[2]);
//# sourceMappingURL=uachost.js.map