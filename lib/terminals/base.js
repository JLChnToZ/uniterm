"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const stream_1 = require("stream");
const pathutils_1 = require("../pathutils");
exports.ANSI_CLS = '\x1b[2J\x1b[1;1H';
exports.ANSI_RESET = '\x1b[?1000l\x1b[?25h\x1b[0m';
class TerminalBase extends stream_1.Duplex {
    constructor(options) {
        super(options);
        this.cols = 80;
        this.rows = 30;
        if (options) {
            this.encoding = options.encoding;
            this.env = Object.assign({}, process.env, options.env);
            this.cols = options.cols || 80;
            this.rows = options.rows || 30;
            this.path = options.path;
            this.argv = options.argv;
            this.cwd = options.cwd;
        }
        else
            this.env = Object.assign({}, process.env);
        pathutils_1.fixPath(this.env);
    }
    spawn() { }
    _read() {
        if (!this.buffered)
            return;
        for (let i = 0; i < this.buffered.length; i++)
            if (!this.push(this.buffered[i], this.encoding)) {
                this.buffered = this.buffered.slice(i + 1);
                return;
            }
        delete this.buffered;
    }
    resize(cols, rows) {
        this.cols = cols;
        this.rows = rows;
    }
    dropFiles(file) { }
    _pushData(data) {
        if (this.buffered)
            this.buffered.push(data);
        else if (!this.push(data, this.encoding))
            this.buffered = [];
    }
}
exports.TerminalBase = TerminalBase;
//# sourceMappingURL=base.js.map