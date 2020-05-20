"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PtyShell = void 0;
const tslib_1 = require("tslib");
const default_shell_1 = tslib_1.__importDefault(require("default-shell"));
const node_pty_1 = require("node-pty");
const path_1 = require("path");
const shell_escape_1 = tslib_1.__importDefault(require("shell-escape"));
const true_case_path_1 = require("true-case-path");
const pathutils_1 = require("../pathutils");
const base_1 = require("./base");
class PtyShell extends base_1.TerminalBase {
    constructor(options) {
        super(options);
        if (!this.path)
            this.path = default_shell_1.default;
        this.experimentalUseConpty = options.experimentalUseConpty;
    }
    get pid() { return this.pty ? this.pty.pid : undefined; }
    get process() { return this.pty ? this.pty.process : undefined; }
    async spawn() {
        if (this.pty)
            return;
        this.resolvedPath = await pathutils_1.whichAsync(this.path);
        if (!path_1.relative(pathutils_1.exePath, this.resolvedPath))
            throw new Error('Here I am!');
        this.resolvedPath = await true_case_path_1.trueCasePath(this.resolvedPath);
        this.pty = node_pty_1.spawn(this.resolvedPath, this.argv || [], {
            name: path_1.basename(this.path),
            env: this.env,
            cwd: this.cwd,
            cols: this.cols,
            rows: this.rows,
            encoding: this.encoding,
            useConpty: this.experimentalUseConpty,
        });
        this.pty.on('data', this._pushData);
        this.pty.on('exit', this.emit.bind(this, 'end'));
        this._pushData(base_1.ANSI_RESET);
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
    dropFiles(files) {
        if (files.length)
            this.pty.write(shell_escape_1.default(files));
    }
}
exports.PtyShell = PtyShell;
//# sourceMappingURL=pty.js.map