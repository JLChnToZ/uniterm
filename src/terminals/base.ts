import { Duplex, DuplexOptions } from 'stream';
import { bind, readonly } from '../decorators';
import { fixPath } from '../pathutils';

export const ANSI_CLS: string = '\x1b[2J\x1b[1;1H';
export const ANSI_RESET: string = '\x1b[?1000l\x1b[?25h\x1b[0m';

export interface TerminalOptions extends DuplexOptions {
  path?: string;
  argv?: string[];
  cols?: number;
  rows?: number;
  env?: { [key: string]: string };
  cwd?: string;
  _rawPath?: string;
}

export abstract class TerminalBase<TPty> extends Duplex {
  public process?: string;
  public pty?: TPty;
  public path?: string;
  public rawPath?: string;
  public resolvedPath?: string;
  public argv?: string[];
  public cols: number = 80;
  public rows: number = 30;
  public env: { [key: string]: string };
  public cwd?: string;
  public encoding?: string;

  private buffered?: any[];

  protected constructor(options?: TerminalOptions) {
    super(options);
    if(options) {
      this.encoding = options.encoding;
      this.env = Object.assign({}, process.env, options.env);
      this.cols = options.cols || 80;
      this.rows = options.rows || 30;
      this.path = options.path;
      this.rawPath = options._rawPath || '';
      this.argv = options.argv;
      this.cwd = options.cwd;
    } else
      this.env = Object.assign({}, process.env);
    fixPath(this.env);
  }

  public spawn(): void | Promise<void> {}

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

  @readonly @bind
  protected _pushData(data: any) {
    if(this.buffered)
      this.buffered.push(data);
    else if(!this.push(data, this.encoding))
      this.buffered = [];
  }
}
