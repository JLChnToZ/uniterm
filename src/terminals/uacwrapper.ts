import { execFile } from 'child_process';
import { randomBytes } from 'crypto';
import * as defaultShell from 'default-shell';
import { createDecodeStream, createEncodeStream, EncodeStream } from 'msgpack-lite';
import { createServer, Server, Socket } from 'net';
import { basename, join as joinPath } from 'path';
import { promisify } from 'util';
import { whichAsync } from '../pathutils';
import { electron } from '../remote-wrapper';
import { ANSI_CLS, ANSI_RESET, TerminalBase, TerminalOptions } from './base';
import { CMDData, CMDType } from './uachost';

const appPathResolver = electron.app.isPackaged ? '' : `\`"${electron.app.getAppPath()}\`"`;
const exePath = electron.app.getPath('exe');
const randomBytesAsync = promisify(randomBytes);

function closeServer(this: Server) {
  this.close();
}

export class UACClient extends TerminalBase<EncodeStream> {
  private flushRequested?: boolean;

  public constructor(options?: TerminalOptions) {
    super(options);
    this.handleConnection = this.handleConnection.bind(this);
    this.handleResponse = this.handleResponse.bind(this);
    this.handleExit = this.handleExit.bind(this);
    this.handleSpawnerClose = this.handleSpawnerClose.bind(this);
    this.flushEncoder = this.flushEncoder.bind(this);
  }

  public async spawn() {
    const path = this.path || defaultShell;
    this.process = `SUDO: ${basename(path)}`;
    this.resolvedPath = await whichAsync(path);
    // Create a named pipe for IPC between clones.
    const pipe = `uniterm-${process.pid}-${(await randomBytesAsync(16)).toString('hex')}`;
    createServer()
    .listen(joinPath('\\\\.\\pipe', pipe))
    .once('connection', this.handleConnection)
    .once('connection', closeServer);
    this._pushData('SUDO: Waiting to confirm getting administrator privileges...\r\n');
    // Launch a clone with raised privileges via PowerShell.
    // This will triggers UAC prompt if user enables it.
    execFile('powershell', [
      '-NoLogo',
      '-NoProfile',
      '-NonInteractive',
      '-ExecutionPolicy', 'Bypass',
      '-WindowStyle', 'Hidden',
      '-Command', ['Start-Process',
        '-FilePath', `"${exePath}"`,
        '-Verb', 'runAs',
        '-ArgumentList', `"${appPathResolver} --pipe=${pipe}"`,
      ].join(' '),
    ]).once('exit', this.handleSpawnerClose);
  }

  public resize(cols: number, rows: number) {
    super.resize(cols, rows);
    if(this.pty)
      this.writeToRemote(CMDType.Resize, cols || 0, rows || 0);
  }

  public _write(chunk: any, encoding: string, callback: (err?: Error) => void) {
    if(!this.pty) return callback(new Error('Process is not yet attached.'));
    try {
      this.writeToRemote(CMDType.Data, chunk);
      return callback();
    } catch(err) {
      callback(err);
    }
  }

  public _destroy(err: Error | null, callback: (err: Error | null) => void) {
    if(this.pty)
      this.writeToRemote(CMDType.Exit);
    callback(null);
  }

  private handleConnection(client: Socket) {
    if(this.pty) return;
    client
    .on('end', this.handleExit)
    .pipe(createDecodeStream())
    .on('data', this.handleResponse);
    this.pty = createEncodeStream();
    this.pty.pipe(client);
    this.writeToRemote(CMDType.Spawn, {
      path: this.path,
      argv: this.argv,
      cwd: this.cwd,
      env: this.env,
      cols: this.cols,
      rows: this.rows,
      encoding: this.encoding,
    });
    this._pushData(ANSI_CLS + ANSI_RESET);
  }

  private handleResponse(data: CMDData) {
    try {
      switch(data[0]) {
        case CMDType.Data:
          this._pushData(data[1]);
          break;
        case CMDType.Error:
          this.emit('error', new Error(`Remote error: ${data[1]}`));
          break;
        case CMDType.Exit:
          this.emit('end', data[1], data[2]);
          if(this.pty) this.pty.end();
          break;
        default: throw new Error(`Invalid Code: ${data[0]}`);
      }
    } catch(error) {
      console.error(process.type === 'renderer' ? error : (error.message || error));
      if(this.pty) {
        this.pty.end();
        delete this.pty;
      }
    }
  }

  private handleSpawnerClose(code?: number) {
    if(code) {
      if(this.pty) {
        this.pty.end();
        delete this.pty;
      }
      this.emit('error', new Error('Failed to get administator privileges.'));
    }
  }

  private handleExit() {
    delete this.pty;
  }

  private writeToRemote(...data: CMDData) {
    if(!this.pty) return;
    this.pty.write(data);
    if(this.flushRequested) return;
    this.flushRequested = true;
    process.nextTick(this.flushEncoder);
  }

  private flushEncoder() {
    if(!this.pty) return;
    this.pty.encoder.flush();
    this.flushRequested = false;
  }
}
