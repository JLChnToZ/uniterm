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
  public process?: string;
  public pty?: TPty;
  public path?: string;
  public argv?: string[];
  public cols: number = 80;
  public rows: number = 30;
  public env: { [key: string]: string };
  public cwd?: string;
  public encoding: string = 'utf8';

  private buffered?: any[];

  protected constructor(options?: TerminalOptions) {
    super(options);
    if(options) {
      this.encoding = options.encoding || 'utf8';
      this.env = Object.assign({}, process.env, options.env);
      this.cols = options.cols || 80;
      this.rows = options.rows || 30;
      this.path = options.path;
      this.argv = options.argv;
    } else
      this.env = Object.assign({}, process.env);
  }

  public spawn() {}

  public _read() {
    if(!this.buffered) return;
    for(let i = 0; i < this.buffered.length; i++)
      if(!this.push(this.buffered[i], this.encoding)) {
        this.buffered = this.buffered.slice(i + 1);
        return;
      }
    delete this.buffered;
  }

  public resize(cols: number, rows: number) {
    this.cols = cols;
    this.rows = rows;
  }

  public dropFiles(file: string[]) {}

  protected _pushData(data: any) {
    if(this.buffered)
      this.buffered.push(data);
    else if(!this.push(data, this.encoding))
      this.buffered = [];

  }
}
