import escape from 'shell-escape';
import { IPty, spawn } from 'wslpty';
import { resolveWslPath } from '../pathutils';
import { ANSI_RESET, TerminalBase, TerminalOptions } from './base';

export class WslPtyShell extends TerminalBase<IPty> {
  get process() { return this.pty ? (this.pty.process || 'WSL Shell') : undefined; }

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
      if(this.env.WSLENV) {
        const wslenv = this.env.WSLENV.split(':');
        for(const keyFlag of wslenv)
          if(keyFlag.indexOf('/') >= 0) {
            const [key, ...flags] = keyFlag.split('/');
            const flagSet = new Set<string>(flags);
            const addedFlags = keys.get(key);
            if(addedFlags) [...addedFlags].forEach(flagSet.add, flagSet);
            if(flagSet.size) keys.set(key, [...flagSet].join(''));
            else keys.set(key, '');
          } else if(!keys.has(keyFlag))
            keys.set(keyFlag, '');
      }

      // No need to reference WSLENV within keys
      keys.delete('WSLENV');

      // Pass back to wslenv
      if(keys.size) {
        this.env.WSLENV = '';
        for(const [key, flags] of keys)
          this.env.WSLENV +=
            (this.env.WSLENV && ':') + key +
            (flags && `/${flags}`);
      }
    }
  }

  public spawn() {
    if(this.pty) return;
    this.pty = spawn({
      env: this.env,
      cwd: this.cwd,
      cols: this.cols,
      rows: this.rows,
    });
    this.pty.on('data', data => this._pushData(data));
    this.pty.on('error', err => this.emit('error', err));
    this.pty.on('exit', () => this.emit('end'));
    this._pushData(ANSI_RESET);
    if(this.path)
      this.pty.write(`${this.path} ${this.argv && escape(this.argv) || ''}\r\n`);
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

  public async dropFiles(files: string[]) {
    if(!files.length) return;
    this.pty.write(escape(await Promise.all(files.map(resolveWslPath))));
  }
}
