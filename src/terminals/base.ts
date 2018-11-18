import { Duplex, DuplexOptions } from 'stream';

export interface TerminalOptions extends DuplexOptions {
  path?: string;
  argv?: string[];
  cols?: number;
  rows?: number;
  env?: { [key: string]: string };
  cwd?: string;
}

export abstract class TerminalBase<TPty> extends Duplex {
  process?: string;
  pty?: TPty;
  path?: string;
  argv?: string[];
  cols: number = 80;
  rows: number = 30;
  env: { [key: string]: string };
  cwd?: string;
  encoding: string = 'utf8';

  private _buffered?: any[];

  protected constructor(options?: TerminalOptions) {
    super(options);
    if(options) {
      this.encoding = options.encoding || 'utf8';
      this.env = Object.assign({}, process.env, options.env);
      this.cols = options.cols || 80;
      this.rows = options.rows || 30;
      this.path = options.path;
      this.argv = options.argv;
    } else {
      this.env = Object.assign({}, process.env);
    }
  }

  spawn() {}

  protected _pushData(data: any) {
    if(this._buffered)
      this._buffered.push(data);
    else if(!this.push(data, this.encoding))
      this._buffered = [];
    
  }

  _read() {
    if(!this._buffered) return;
    for(let i = 0; i < this._buffered.length; i++)
      if(!this.push(this._buffered[i], this.encoding)) {
        this._buffered = this._buffered.slice(i + 1);
        return;
      }
    delete this._buffered;
  }

  resize(cols: number, rows: number) {
    this.cols = cols;
    this.rows = rows;
  }

  dropFiles(file: string[]) {}
}