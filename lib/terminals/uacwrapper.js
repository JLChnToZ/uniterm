"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
const crypto_1 = require("crypto");
const defaultShell = require("default-shell");
const net_1 = require("net");
const path_1 = require("path");
const util_1 = require("util");
const pathutils_1 = require("../pathutils");
const remote_wrapper_1 = require("../remote-wrapper");
const base_1 = require("./base");
const appPathResolver = remote_wrapper_1.electron.app.isPackaged ? '' : `\`"${remote_wrapper_1.electron.app.getAppPath()}\`"`;
const exePath = remote_wrapper_1.electron.app.getPath('exe');
const randomBytesAsync = util_1.promisify(crypto_1.randomBytes);
function closeServer() {
    this.close();
}
class UACClient extends base_1.TerminalBase {
    constructor(options) {
        super(options);
        this.handleConnection = this.handleConnection.bind(this);
        this.handleResponse = this.handleResponse.bind(this);
        this.handleError = this.handleError.bind(this);
        this.handleExit = this.handleExit.bind(this);
        this.handleSpawnerClose = this.handleSpawnerClose.bind(this);
    }
    async spawn() {
        const pipe = `uniterm-${process.pid}-${(await randomBytesAsync(16)).toString('hex')}`;
        net_1.createServer()
            .listen(path_1.join(`\\\\.\\pipe`, pipe))
            .once('connection', this.handleConnection)
            .once('connection', closeServer);
        child_process_1.execFile('powershell', [
            '-NoLogo',
            '-NoProfile',
            '-NonInteractive',
            '-ExecutionPolicy', 'Bypass',
            '-WindowStyle', 'Hidden',
            '-Command', ['Start-Process',
                '-FilePath', `"${exePath}"`,
                '-Verb', 'runAs',
                '-ArgumentList', `"${appPathResolver} --pipe=${pipe}"`,
            ].join(' '),
        ], {
            env: { ELECTRON_RUN_AS_NODE: true },
        }).once('exit', this.handleSpawnerClose);
        const path = this.path || defaultShell;
        this.process = `SUDO: ${path_1.basename(path)}`;
        this.resolvedPath = await pathutils_1.whichAsync(path);
    }
    resize(cols, rows) {
        super.resize(cols, rows);
        if (this.pty) {
            const buf = Buffer.allocUnsafe(5);
            buf.writeUInt8(2 /* Resize */, 0);
            buf.writeUInt16BE(cols || 0, 1);
            buf.writeUInt16BE(rows || 0, 3);
            this.pty.write(buf);
        }
    }
    _write(chunk, encoding, callback) {
        if (!this.pty)
            return callback(new Error('Process is not yet attached.'));
        try {
            if (Buffer.isBuffer(chunk)) {
                const buf = Buffer.allocUnsafe(5);
                buf.writeUInt8(1 /* Data */, 0);
                buf.writeUInt32BE(chunk.length, 1);
                this.pty.write(buf);
                this.pty.write(chunk);
            }
            else if (typeof chunk === 'string') {
                const dataLength = Buffer.byteLength(chunk, encoding);
                const buf = Buffer.allocUnsafe(5 + dataLength);
                buf.writeUInt8(1 /* Data */, 0);
                buf.writeUInt32BE(dataLength, 1);
                buf.write(chunk, 5, dataLength, encoding);
                this.pty.write(buf);
            }
            else
                return callback(new Error('Unknown data type'));
            return callback();
        }
        catch (err) {
            callback(err);
        }
    }
    _destroy(err, callback) {
        if (this.pty) {
            const buf = Buffer.allocUnsafe(1);
            buf.writeUInt8(255 /* Exit */, 0);
            this.pty.write(buf);
            this.pty.end();
            delete this.pty;
        }
        callback();
    }
    handleConnection(client) {
        if (this.pty)
            return;
        this.pty = client;
        client
            .on('data', this.handleResponse)
            .on('error', this.handleError)
            .on('end', this.handleExit);
        const optionsStr = JSON.stringify({
            path: this.path,
            argv: this.argv,
            cwd: this.cwd,
            env: this.env,
            cols: this.cols,
            rows: this.rows,
            encoding: this.encoding,
        });
        const dataLength = Buffer.byteLength(optionsStr, 'utf8');
        const buf = Buffer.allocUnsafe(dataLength + 5);
        buf.writeUInt8(128 /* Spawn */, 0);
        buf.writeUInt32BE(dataLength, 1);
        buf.write(optionsStr, 5, dataLength, 'utf8');
        client.write(buf);
    }
    handleResponse(data) {
        if (!this.rawBuffer)
            this.rawBuffer = data;
        else
            this.rawBuffer = Buffer.concat([this.rawBuffer, data]);
        let dataSize = 1;
        if (this.rawBuffer.length < dataSize)
            return;
        while (this.rawBuffer && this.rawBuffer.length >= dataSize) {
            const { rawBuffer: buffer } = this;
            const cmd = buffer.readUInt8(0);
            try {
                switch (cmd) {
                    case 1 /* Data */:
                        dataSize += buffer.readUInt32BE(1) + 4;
                        if (buffer.length < dataSize)
                            return;
                        this._pushData(buffer.slice(5, dataSize));
                        break;
                    case 255 /* Exit */:
                        dataSize += 4;
                        if (buffer.length < dataSize)
                            return;
                        this.emit('end', buffer.readUInt16BE(1), buffer.readUInt16BE(3));
                        throw new Error('Remote dismissed');
                    default: throw new Error('Invalid Code');
                }
            }
            catch (_a) {
                this.pty.end();
                delete this.pty;
            }
            if (buffer.length > dataSize)
                this.rawBuffer = buffer.slice(dataSize);
            else
                this.rawBuffer = undefined;
        }
    }
    handleError(error) {
        this.emit('error', error);
    }
    handleSpawnerClose(code) {
        if (code && this.pty) {
            this.pty.end();
            delete this.pty;
            this.emit('end');
        }
    }
    handleExit() {
        delete this.pty;
    }
}
exports.UACClient = UACClient;
//# sourceMappingURL=uacwrapper.js.map