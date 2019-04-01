"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
const crypto_1 = require("crypto");
const defaultShell = require("default-shell");
const msgpack_lite_1 = require("msgpack-lite");
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
        this.handleExit = this.handleExit.bind(this);
        this.handleSpawnerClose = this.handleSpawnerClose.bind(this);
        this.flushEncoder = this.flushEncoder.bind(this);
    }
    async spawn() {
        const path = this.path || defaultShell;
        this.process = `SUDO: ${path_1.basename(path)}`;
        this.resolvedPath = await pathutils_1.whichAsync(path);
        // Create a named pipe for IPC between clones.
        const pipe = `uniterm-${process.pid}-${(await randomBytesAsync(16)).toString('hex')}`;
        net_1.createServer()
            .listen(path_1.join('\\\\.\\pipe', pipe))
            .once('connection', this.handleConnection)
            .once('connection', closeServer);
        this._pushData('SUDO: Waiting to confirm getting administrator privileges...\r\n');
        // Launch a clone with raised privileges via PowerShell.
        // This will triggers UAC prompt if user enables it.
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
        ]).once('exit', this.handleSpawnerClose);
    }
    resize(cols, rows) {
        super.resize(cols, rows);
        if (this.pty)
            this.writeToRemote(2 /* Resize */, cols || 0, rows || 0);
    }
    _write(chunk, encoding, callback) {
        if (!this.pty)
            return callback(new Error('Process is not yet attached.'));
        try {
            this.writeToRemote(1 /* Data */, chunk);
            return callback();
        }
        catch (err) {
            callback(err);
        }
    }
    _destroy(err, callback) {
        if (this.pty)
            this.writeToRemote(127 /* Exit */);
        callback(null);
    }
    handleConnection(client) {
        if (this.pty)
            return;
        client
            .on('end', this.handleExit)
            .pipe(msgpack_lite_1.createDecodeStream())
            .on('data', this.handleResponse);
        this.pty = msgpack_lite_1.createEncodeStream();
        this.pty.pipe(client);
        this.writeToRemote(3 /* Spawn */, {
            path: this.path,
            argv: this.argv,
            cwd: this.cwd,
            env: this.env,
            cols: this.cols,
            rows: this.rows,
            encoding: this.encoding,
        });
        this._pushData(base_1.ANSI_CLS + base_1.ANSI_RESET);
    }
    handleResponse(data) {
        try {
            switch (data[0]) {
                case 1 /* Data */:
                    this._pushData(data[1]);
                    break;
                case 126 /* Error */:
                    this.emit('error', new Error(`Remote error: ${data[1]}`));
                    break;
                case 127 /* Exit */:
                    this.emit('end', data[1], data[2]);
                    if (this.pty)
                        this.pty.end();
                    break;
                default: throw new Error(`Invalid Code: ${data[0]}`);
            }
        }
        catch (error) {
            console.error(process.type === 'renderer' ? error : (error.message || error));
            if (this.pty) {
                this.pty.end();
                delete this.pty;
            }
        }
    }
    handleSpawnerClose(code) {
        if (code) {
            if (this.pty) {
                this.pty.end();
                delete this.pty;
            }
            this.emit('error', new Error('Failed to get administator privileges.'));
        }
    }
    handleExit() {
        delete this.pty;
    }
    writeToRemote(...data) {
        if (!this.pty)
            return;
        this.pty.write(data);
        if (this.flushRequested)
            return;
        this.flushRequested = true;
        process.nextTick(this.flushEncoder);
    }
    flushEncoder() {
        if (!this.pty)
            return;
        this.pty.encoder.flush();
        this.flushRequested = false;
    }
}
exports.UACClient = UACClient;
//# sourceMappingURL=uacwrapper.js.map