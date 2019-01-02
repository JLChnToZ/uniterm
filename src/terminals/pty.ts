import * as defaultShell from 'default-shell';
import { IPty, spawn } from 'node-pty';
import { basename, relative } from 'path';
import * as escape from 'shell-escape';
import { whichAsync } from '../pathutils';
import { electron } from '../remote-wrapper';
import { TerminalBase, TerminalOptions } from './base';

const exePath = electron.app.getPath('exe');

export class PtyShell extends TerminalBase<IPty> {
  get pid() { return this.pty ? this.pty.pid : undefined; }
  get process() { return this.pty ? this.pty.process : undefined; }

  constructor(options?: TerminalOptions) {
    super(options);
    if(!this.path) this.path = defaultShell;
  }

  public async spawn() {
    if(this.pty) return;
    this.resolvedPath = await whichAsync(this.path);
    if(!relative(exePath, this.resolvedPath))
      throw new Error('Here I am!');
    this.pty = spawn(this.resolvedPath,
      this.argv || [], {
      name: basename(this.path),
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

  public resize(cols: number, rows: number) {
    super.resize(cols, rows);
    if(this.pty) this.pty.resize(cols, rows);
  }

  public _write(chunk: any, encoding: string, callback: (err?: Error) => void) {
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

  public _destroy(err: Error | null, callback: (err: Error | null) => void) {
    if(this.pty)
      this.pty.kill();
    callback(null);
  }

  public dropFiles(files: string[]) {
    if(files.length)
      this.pty.write(escape(files));
  }
}
