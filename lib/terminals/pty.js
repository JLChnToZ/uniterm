"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const defaultShell = require("default-shell");
const node_pty_1 = require("node-pty");
const path_1 = require("path");
const escape = require("shell-escape");
const pathutils_1 = require("../pathutils");
const base_1 = require("./base");
class PtyShell extends base_1.TerminalBase {
    get pid() { return this.pty ? this.pty.pid : undefined; }
    get process() { return this.pty ? this.pty.process : undefined; }
    constructor(options) {
        super(options);
        if (!this.path)
            this.path = defaultShell;
    }
    async spawn() {
        if (this.pty)
            return;
        this.resolvedPath = await pathutils_1.whichAsync(this.path);
        this.pty = node_pty_1.spawn(this.resolvedPath, this.argv || [], {
            name: path_1.basename(this.path),
            env: this.env,
            cwd: this.cwd,
            cols: this.cols,
            rows: this.rows,
            encoding: this.encoding,
        });
        this.pty.on('data', data => this._pushData(data));
        this.pty.on('exit', (code, signal) => this.emit('end', code, signal));
        this._pushData('\x1b[?25h\x1b[0m');
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
    dropFiles(files) {
        if (files.length)
            this.pty.write(escape(files));
    }
}
exports.PtyShell = PtyShell;
//# sourceMappingURL=pty.js.map