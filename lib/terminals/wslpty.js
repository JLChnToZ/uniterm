"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const escape = require("shell-escape");
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
            const wslenv = (this.env.WSLENV || '').split(':');
            for (const keyFlag of wslenv) {
                const [key, ...flags] = keyFlag.split('/');
                const flagSet = new Set(flags);
                if (keys.has(key))
                    [...keys.get(key)].forEach(flagSet.add, flagSet);
                keys.set(key, [...flagSet].join(''));
            }
            // Pass back to wslenv
            if (keys.size) {
                this.env.WSLENV = '';
                for (const [key, flags] of keys)
                    this.env.WSLENV +=
                        (this.env.WSLENV ? ':' : '') +
                            (flags ? `${key}/${flags}` : key);
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
        this.pty.on('data', data => this._pushData(data));
        this.pty.on('error', err => this.emit('error', err));
        this.pty.on('exit', () => this.emit('end'));
        this._pushData('\x1b[?25h\x1b[0m');
        if (this.path)
            this.pty.write(`${this.path} ${this.argv && escape(this.argv) || ''}\r\n`);
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
        callback();
    }
    async dropFiles(files) {
        if (!files.length)
            return;
        this.pty.write(escape(await Promise.all(files.map(pathutils_1.resolveWslPath))));
    }
}
exports.WslPtyShell = WslPtyShell;
//# sourceMappingURL=wslpty.js.map