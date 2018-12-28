"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const net_1 = require("net");
const path_1 = require("path");
const selector_1 = require("./selector");
function connectToClient(path) {
    let buffer;
    let host;
    const client = net_1.connect(path_1.join('\\\\.\\pipe', path));
    client
        .on('data', handleRequest)
        .on('close', handleRemoteClose)
        .on('error', handleRemoteClose);
    function handleRequest(data) {
        if (!buffer)
            buffer = data;
        else
            buffer = Buffer.concat([buffer, data]);
        let dataSize = 1;
        while (buffer && buffer.length >= dataSize) {
            const cmd = buffer.readUInt8(0);
            try {
                switch (cmd) {
                    case 128 /* Spawn */:
                        dataSize += buffer.readUInt32BE(1) + 4;
                        if (buffer.length < dataSize)
                            return;
                        if (host)
                            throw new Error('Host is already spawned.');
                        host = selector_1.createBackend(JSON.parse(buffer.slice(5, dataSize).toString('utf8')));
                        host
                            .on('data', handleResponse)
                            .on('end', handleClose)
                            .on('error', handleError)
                            .spawn();
                        break;
                    case 1 /* Data */:
                        dataSize += buffer.readUInt32BE(1) + 4;
                        if (buffer.length < dataSize)
                            return;
                        if (!host)
                            throw new Error('Host is not spawned.');
                        host.write(buffer.slice(5, dataSize));
                        break;
                    case 2 /* Resize */:
                        dataSize += 4;
                        if (buffer.length < dataSize)
                            return;
                        if (!host)
                            throw new Error('Host is not spawned.');
                        host.resize(buffer.readUInt16BE(1), buffer.readUInt16BE(3));
                        break;
                    case 255 /* Exit */:
                        if (!host)
                            throw new Error('Host is not spawned.');
                        host.end();
                        host = undefined;
                        throw new Error('Host closed.');
                    default: throw new Error('Invalid code');
                }
            }
            catch (_a) {
                client.end();
                process.exit();
            }
            if (buffer.length > dataSize)
                buffer = buffer.slice(dataSize);
            else
                buffer = undefined;
        }
    }
    function handleResponse(data) {
        const encoding = host && host.encoding || 'utf8';
        if (Buffer.isBuffer(data)) {
            const buf = Buffer.allocUnsafe(5);
            buf.writeUInt8(1 /* Data */, 0);
            buf.writeUInt32BE(data.length, 1);
            client.write(buf);
            client.write(data);
        }
        else {
            const dataLength = Buffer.byteLength(data, encoding);
            const buf = Buffer.allocUnsafe(5 + dataLength);
            buf.writeUInt8(1 /* Data */, 0);
            buf.writeUInt32BE(dataLength, 1);
            buf.write(data, 5, dataLength, encoding);
            client.write(buf);
        }
    }
    function handleClose(code, signal) {
        const buf = Buffer.allocUnsafe(5);
        buf.writeUInt8(255 /* Exit */, 0);
        buf.writeUInt16BE(code || 0, 1);
        buf.writeUInt16BE(signal || 0, 3);
        client.write(buf);
        client.end();
        process.exit();
    }
    function handleError(error) {
        const message = error.message || JSON.stringify(error);
        const dataLength = Buffer.byteLength(message, 'utf8');
        const buf = Buffer.allocUnsafe(5 + dataLength);
        buf.writeUInt8(254 /* Error */, 0);
        buf.writeUInt32BE(dataLength, 1);
        buf.write(message, 5, dataLength, 'utf8');
        client.write(buf);
    }
    function handleRemoteClose() {
        if (host)
            host.end();
        host = undefined;
        process.exit();
    }
}
exports.connectToClient = connectToClient;
//# sourceMappingURL=uachost.js.map