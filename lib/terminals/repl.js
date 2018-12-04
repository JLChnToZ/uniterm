"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const splitArgv = require("argv-split");
const child_process_1 = require("child_process");
const console_1 = require("console");
const electron_1 = require("electron");
const repl_1 = require("repl");
const stream_1 = require("stream");
const remote_wrapper_1 = require("../remote-wrapper");
const base_1 = require("./base");
const intro = `Welcome! This is an embedded Node.js REPL shell,
it runs on top of Electron (renderer process) and V8 which Uniterm is based on,
it also exposes full electron namespace inside the context
(for main process-only APIs, it implicitly uses remote).
You may use this as a normal Node.js REPL,
or type '.help' to see available commands.`.replace(/\r\n|\r|\n/g, ' ') + '\n';
async function exec(args) {
    this.pause();
    this.console.log(await new Promise((resolve, reject) => {
        const instance = child_process_1.spawn(remote_wrapper_1.electron.app.getPath('exe'), args && splitArgv(args) || ['--help']);
        let output = '';
        instance.stdout.on('data', data => output += data);
        instance.on('error', err => reject(err));
        instance.on('close', code => {
            if (code === 0)
                resolve(output.trim());
            else
                reject(new Error(`Uniterm instance exits with code: ${code}`));
        });
    }));
    this.resume();
    this.displayPrompt(true);
}
class ReplPty extends base_1.TerminalBase {
    constructor(options) {
        super(options);
        this.inputShell = new stream_1.PassThrough(options);
        this.inputShell.isRaw = true;
        this.outputShell = new stream_1.PassThrough(options);
        Object.assign(this.outputShell, {
            columns: this.cols,
            rows: this.rows,
            isTTY: true,
        });
        this.outputShell.on('data', this._pushData.bind(this));
        this.process = 'Embedded Node REPL';
    }
    spawn() {
        if (this.pty)
            return;
        const console = new console_1.Console(this.outputShell, this.outputShell);
        console.log(intro);
        this.pty = Object.assign(repl_1.start({
            input: this.inputShell,
            output: this.outputShell,
        }).on('reset', context => {
            Object.defineProperties(context, {
                electron: { value: remote_wrapper_1.electron },
                process: { value: process.type !== 'main' ? electron_1.remote.process : process },
                console: { value: console },
            });
            console.log('Resetted:', Object.getOwnPropertyNames(context).join(', '));
        }).on('exit', () => this.emit('end', 0)), {
            console,
        });
        this.pty.defineCommand('uniterm', {
            help: 'Call Uniterm command / Launch new terminal',
            action: exec,
        });
        this.pty.emit('reset', this.pty.context);
    }
    resize(rows, cols) {
        super.resize(cols, rows);
        Object.assign(this.outputShell, {
            rows,
            columns: cols,
        });
        this.outputShell.emit('resize');
    }
    _write(chunk, encoding, callback) {
        if (!this.pty)
            return callback(new Error('Process is not yet attached.'));
        try {
            if (typeof chunk === 'string' && this.encoding && this.encoding !== encoding)
                chunk = Buffer.from(chunk, encoding).toString(this.encoding);
            this.inputShell.write(chunk);
            return callback();
        }
        catch (err) {
            callback(err);
        }
    }
    _destroy(err, callback) {
        if (this.pty)
            this.pty.close();
        callback();
    }
    _pushData(data) {
        if (Buffer.isBuffer(data))
            data = data.toString(this.encoding || 'utf8');
        if (typeof data === 'string')
            data = data.replace(/\r\n|(?!\r)\n/g, '\r\n');
        super._pushData(data);
    }
}
exports.ReplPty = ReplPty;
//# sourceMappingURL=repl.js.map