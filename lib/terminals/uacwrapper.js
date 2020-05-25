"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UACClient = void 0;
const tslib_1 = require("tslib");
const child_process_1 = require("child_process");
const crypto_1 = require("crypto");
const default_shell_1 = tslib_1.__importDefault(require("default-shell"));
const msgpack_lite_1 = require("msgpack-lite");
const net_1 = require("net");
const path_1 = require("path");
const util_1 = require("util");
const decorators_1 = require("../decorators");
const pathutils_1 = require("../pathutils");
const base_1 = require("./base");
const randomBytesAsync = util_1.promisify(crypto_1.randomBytes);
const psLaunchArgs = [
    '-NoLogo',
    '-NoProfile',
    '-ExecutionPolicy', 'Bypass',
    '-WindowStyle', 'Hidden',
    '-EncodedCommand',
];
const psLaunchArgsStr = psLaunchArgs.join(' ');
function closeServer() {
    this.close();
}
let UACClient = /** @class */ (() => {
    class UACClient extends base_1.TerminalBase {
        constructor(options) {
            super(options);
            this._priority = 0;
        }
        get priority() {
            return this._priority;
        }
        set priority(value) {
            this._priority = value;
            this.writeToRemote(4 /* Priority */, value);
        }
        async spawn() {
            const path = this.path || default_shell_1.default;
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
            const exeDir = path_1.dirname(pathutils_1.exePath);
            const appPath = path_1.relative(exeDir, path_1.join(pathutils_1.appPathResolver, 'lib/uachost'));
            const innerCmd = Buffer.from([
                '$Env:ELECTRON_RUN_AS_NODE = 1',
                `Start-Process -FilePath '${pathutils_1.exePath}' -WorkingDirectory '${exeDir}' -ArgumentList '${appPath} ${pipe}'`,
            ].join(';'), 'utf16le').toString('base64');
            const outerCmd = Buffer.from(`Start-Process -FilePath powershell -Verb RunAs -WindowStyle Hidden -ArgumentList '${psLaunchArgsStr} ${innerCmd}'`, 'utf16le').toString('base64');
            child_process_1.execFile('powershell', psLaunchArgs.concat([outerCmd])).once('exit', this.handleSpawnerClose);
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
            if (!this.env.ELECTRON_RUN_AS_NODE)
                this.env.ELECTRON_RUN_AS_NODE = '';
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
                    case 4 /* Priority */:
                        this._priority = data[1];
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
    tslib_1.__decorate([
        decorators_1.readonly,
        decorators_1.bind
    ], UACClient.prototype, "handleConnection", null);
    tslib_1.__decorate([
        decorators_1.readonly,
        decorators_1.bind
    ], UACClient.prototype, "handleResponse", null);
    tslib_1.__decorate([
        decorators_1.readonly,
        decorators_1.bind
    ], UACClient.prototype, "handleSpawnerClose", null);
    tslib_1.__decorate([
        decorators_1.readonly,
        decorators_1.bind
    ], UACClient.prototype, "handleExit", null);
    tslib_1.__decorate([
        decorators_1.readonly,
        decorators_1.bind
    ], UACClient.prototype, "flushEncoder", null);
    return UACClient;
})();
exports.UACClient = UACClient;
//# sourceMappingURL=uacwrapper.js.map