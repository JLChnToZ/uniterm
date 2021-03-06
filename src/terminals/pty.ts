import defaultShell from 'default-shell';
import { getPriority, setPriority } from 'os';
import { IPty, spawn } from 'node-pty';
import { basename, relative } from 'path';
import escape from 'shell-escape';
import { trueCasePath } from 'true-case-path';
import { exePath, whichAsync } from '../pathutils';
import { ANSI_RESET, TerminalBase, TerminalOptions } from './base';

export interface PtyTerminalOptions extends TerminalOptions {
  experimentalUseConpty?: boolean;
} 

export class PtyShell extends TerminalBase<IPty> {
  private experimentalUseConpty?: boolean;

  public get pid() { return this.pty ? this.pty.pid : undefined; }
  public get process() { return this.pty ? this.pty.process : undefined; }

  public get priority() {
    const pid = this.pty?.pid;
    return pid ? getPriority(pid) : 0;
  }
  public set priority(value: number) {
    const pid = this.pty?.pid;
    if(pid) setPriority(pid, value);
  }

  constructor(options?: TerminalOptions) {
    super(options);
    if(!this.path) this.path = defaultShell;
    this.experimentalUseConpty = (options as PtyTerminalOptions).experimentalUseConpty;
  }

  public async spawn() {
    if(this.pty) return;
    this.resolvedPath = await whichAsync(this.path) as string;
    if(!relative(exePath, this.resolvedPath))
      throw new Error('Here I am!');
    this.resolvedPath = await trueCasePath(this.resolvedPath);
    this.pty = spawn(this.resolvedPath,
      this.argv || [], {
      name: basename(this.path),
      env: this.env,
      cwd: this.cwd,
      cols: this.cols,
      rows: this.rows,
      encoding: this.encoding,
      useConpty: this.experimentalUseConpty,
    });
    this.pty.on('data', this._pushData);
    this.pty.on('exit', this.emit.bind(this, 'end'));
    this._pushData(ANSI_RESET);
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
          chunk = Buffer.from(chunk, encoding as BufferEncoding).toString(this.encoding);
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
