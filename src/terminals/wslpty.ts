import { spawn, IPty } from 'wslpty';
import * as escape from 'shell-escape';
import { TerminalBase, TerminalOptions } from './base';
import { resolveWslPath } from '../pathutils';

export class WslPtyShell extends TerminalBase<IPty> {
  get process() { return this.pty ? this.pty.process : undefined; }

  constructor(options?: TerminalOptions) {
    super(options);
  }

  spawn() {
    if(this.pty) return;
    this.pty = spawn({
      env: this.env,
      cwd: this.cwd,
      cols: this.cols,
      rows: this.rows
    });
    this.pty.on('data', data => this._pushData(data));
    this.pty.on('error', err => this.emit('error', err));
    this.pty.on('exit', () => this.emit('end'));
    this._pushData('\x1b[?25h\x1b[0m');
    if(this.path)
      this.pty.write(`${this.path} ${this.argv && escape(this.argv) || ''}\r\n`);
  }

  resize(cols: number, rows: number) {
    super.resize(cols, rows);
    if(this.pty) this.pty.resize(cols, rows);
  }

  _write(chunk: any, encoding: string, callback: (err?: Error) => void) {
    if(!this.pty) return callback(new Error('Process is not yet attached.'));
    try {
      if(typeof chunk === 'string') {
        if(this.encoding && this.encoding !== encoding)
          chunk = Buffer.from(chunk, encoding).toString(this.encoding);
        this.pty.write(chunk);
      } else if(Buffer.isBuffer(chunk))
        this.pty.write(chunk.toString(this.encoding || 'utf8'));
      else return callback(new Error('Unknown data type'));
      return callback();
    } catch(err) {
      callback(err);
    }
  }

  _destroy(err: Error, callback: () => void) {
    if(this.pty)
      this.pty.kill();
    callback();
  }

  async dropFiles(files: string[]) {
    if(!files.length) return;
    this.pty.write(escape(await Promise.all(files.map(resolveWslPath))));
  }
}