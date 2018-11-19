import * as defaultShell from 'default-shell';
import { IPty, spawn } from 'node-pty';
import * as escape from 'shell-escape';
import { resolveExecutable } from '../pathutils';
import { TerminalBase, TerminalOptions } from './base';

export class PtyShell extends TerminalBase<IPty> {
  get pid() { return this.pty ? this.pty.pid : undefined; }
  get process() { return this.pty ? this.pty.process : undefined; }

  constructor(options?: TerminalOptions) {
    super(options);

    // Pass ENV to WSL
    if(options && options.env) {
      const { env } = options;
      const keys = new Map<string, string>();

      // Capitalize variable names
      for(const key of Object.keys(env)) {
        const KEY = key.toUpperCase();
        if(!(KEY in env) && (key in env))
          env[KEY] = env[key];
        delete env[key];
        if(!keys.has(KEY))
          keys.set(KEY, '');
      }

      // Grab already exists configuations
      const wslenv = (this.env.WSLENV || '').split(':');
      for(const keyFlag of wslenv) {
        const [key, ...flags] = keyFlag.split('/');
        const flagSet = new Set<string>(flags);
        if(keys.has(key))
          [...keys.get(key)].forEach(flagSet.add, flagSet);
        keys.set(key, [...flagSet].join(''));
      }

      // Pass back to wslenv
      if(keys.size) {
        this.env.WSLENV = '';
        for(const [key, flags] of keys)
          this.env.WSLENV +=
            (this.env.WSLENV ? ':' : '') +
            (flags ? `${key}/${flags}` : key);
      }
    }
  }

  public async spawn() {
    if(this.pty) return;
    this.pty = spawn(this.path ?
      await resolveExecutable(this.path) :
      defaultShell,
      this.argv || [], {
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

  public _destroy(err: Error, callback: () => void) {
    if(this.pty)
      this.pty.kill();
    callback();
  }

  public dropFiles(files: string[]) {
    if(files.length)
      this.pty.write(escape(files));
  }
}
