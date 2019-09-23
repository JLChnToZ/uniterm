"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const shell_escape_1 = tslib_1.__importDefault(require("shell-escape"));
const wslpty_1 = require("wslpty");
const pathutils_1 = require("../pathutils");
const base_1 = require("./base");
class WslPtyShell extends base_1.TerminalBase {
    get process() { return this.pty ? (this.pty.process || 'WSL Shell') : undefined; }
    constructor(options) {
        super(options);
        // Pass ENV to WSL
        if (options && options.env) {
            const { env } = options;
            const keys = new Map();
            // Capitalize variable names
            for (const key of Object.keys(env)) {
                const KEY = key.toUpperCase();
                if (!(KEY in env) && (key in env))
                    env[KEY] = env[key];
                delete env[key];
                if (!keys.has(KEY))
                    keys.set(KEY, '');
            }
            // Grab already exists configuations
            if (this.env.WSLENV) {
                const wslenv = this.env.WSLENV.split(':');
                for (const keyFlag of wslenv)
                    if (keyFlag.indexOf('/') >= 0) {
                        const [key, ...flags] = keyFlag.split('/');
                        const flagSet = new Set(flags);
                        const addedFlags = keys.get(key);
                        if (addedFlags)
                            [...addedFlags].forEach(flagSet.add, flagSet);
                        if (flagSet.size)
                            keys.set(key, [...flagSet].join(''));
                        else
                            keys.set(key, '');
                    }
                    else if (!keys.has(keyFlag))
                        keys.set(keyFlag, '');
            }
            // No need to reference WSLENV within keys
            keys.delete('WSLENV');
            // Pass back to wslenv
            if (keys.size) {
                this.env.WSLENV = '';
                for (const [key, flags] of keys)
                    this.env.WSLENV +=
                        (this.env.WSLENV && ':') + key +
                            (flags && `/${flags}`);
            }
        }
    }
    spawn() {
        if (this.pty)
            return;
        this.pty = wslpty_1.spawn({
            env: this.env,
            cwd: this.cwd,
            cols: this.cols,
            rows: this.rows,
        });
        this.pty.on('data', this._pushData);
        this.pty.on('error', this.emit.bind(this, 'error'));
        this.pty.on('exit', this.emit.bind(this, 'end'));
        this._pushData(base_1.ANSI_RESET);
        if (this.path)
            this.pty.write(`${this.path} ${this.argv && shell_escape_1.default(this.argv) || ''}\r\n`);
    }
    resize(cols, rows) {
        super.resize(cols, rows);
        if (this.pty)
            this.pty.resize(cols, rows);
    }
    _write(chunk, encoding, callback) {
        if (!this.pty)
            return callback(new Error('Process is not yet attached.'));
        try {
            if (typeof chunk === 'string') {
                if (this.encoding && this.encoding !== encoding)
                    chunk = Buffer.from(chunk, encoding).toString(this.encoding);
                this.pty.write(chunk);
            }
            else if (Buffer.isBuffer(chunk))
                this.pty.write(chunk.toString(this.encoding || 'utf8'));
            else
                return callback(new Error('Unknown data type'));
            return callback();
        }
        catch (err) {
            callback(err);
        }
    }
    _destroy(err, callback) {
        if (this.pty)
            this.pty.kill();
        callback(null);
    }
    async dropFiles(files) {
        if (!files.length)
            return;
        this.pty.write(shell_escape_1.default(await Promise.all(files.map(pathutils_1.resolveWslPath))));
    }
}
exports.WslPtyShell = WslPtyShell;
//# sourceMappingURL=wslpty.js.map