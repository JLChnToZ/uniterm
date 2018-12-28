import { execFile } from 'child_process';
import { randomBytes } from 'crypto';
import * as defaultShell from 'default-shell';
import { createServer, Server, Socket } from 'net';
import { basename, join as joinPath } from 'path';
import { promisify } from 'util';
import { whichAsync } from '../pathutils';
import { electron } from '../remote-wrapper';
import { TerminalBase, TerminalOptions } from './base';
import { CMDType } from './uachost';

const appPathResolver = electron.app.isPackaged ? '' : `\`"${electron.app.getAppPath()}\`"`;
const exePath = electron.app.getPath('exe');
const randomBytesAsync = promisify(randomBytes);

function closeServer(this: Server) {
  this.close();
}

export class UACClient extends TerminalBase<Socket> {
  private rawBuffer?: Buffer;

  public constructor(options?: TerminalOptions) {
    super(options);
    this.handleConnection = this.handleConnection.bind(this);
    this.handleResponse = this.handleResponse.bind(this);
    this.handleError = this.handleError.bind(this);
    this.handleExit = this.handleExit.bind(this);
    this.handleSpawnerClose = this.handleSpawnerClose.bind(this);
  }

  public async spawn() {
    // Create a named pipe for IPC between clones.
    const pipe = `uniterm-${process.pid}-${(await randomBytesAsync(16)).toString('hex')}`;
    createServer()
    .listen(joinPath(`\\\\.\\pipe`, pipe))
    .once('connection', this.handleConnection)
    .once('connection', closeServer);
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
    ], {
      env: { ELECTRON_RUN_AS_NODE: true },
    }).once('exit', this.handleSpawnerClose);
    const path = this.path || defaultShell;
    this.process = `SUDO: ${basename(path)}`;
    this.resolvedPath = await whichAsync(path);
  }

  public resize(cols: number, rows: number) {
    super.resize(cols, rows);
    if(this.pty) {
      const buf = Buffer.allocUnsafe(5);
      buf.writeUInt8(CMDType.Resize, 0);
      buf.writeUInt16BE(cols || 0, 1);
      buf.writeUInt16BE(rows || 0, 3);
      this.pty.write(buf);
    }
  }

  public _write(chunk: any, encoding: string, callback: (err?: Error) => void) {
    if(!this.pty) return callback(new Error('Process is not yet attached.'));
    try {
      if(Buffer.isBuffer(chunk)) {
        const buf = Buffer.allocUnsafe(5);
        buf.writeUInt8(CMDType.Data, 0);
        buf.writeUInt32BE(chunk.length, 1);
        this.pty.write(buf);
        this.pty.write(chunk);
      } else if(typeof chunk === 'string') {
        const dataLength = Buffer.byteLength(chunk, encoding);
        const buf = Buffer.allocUnsafe(5 + dataLength);
        buf.writeUInt8(CMDType.Data, 0);
        buf.writeUInt32BE(dataLength, 1);
        buf.write(chunk, 5, dataLength, encoding);
        this.pty.write(buf);
      } else
        return callback(new Error('Unknown data type'));
      return callback();
    } catch(err) {
      callback(err);
    }
  }

  public _destroy(err: Error, callback: () => void) {
    if(this.pty) {
      const buf = Buffer.allocUnsafe(1);
      buf.writeUInt8(CMDType.Exit, 0);
      this.pty.write(buf);
      this.pty.end();
      delete this.pty;
    }
    callback();
  }

  private handleConnection(client: Socket) {
    if(this.pty) return;
    this.pty = client;
    client
    .on('data', this.handleResponse)
    .on('error', this.handleError)
    .on('end', this.handleExit);
    const optionsStr = JSON.stringify({
      path: this.path,
      argv: this.argv,
      cwd: this.cwd,
      env: this.env,
      cols: this.cols,
      rows: this.rows,
      encoding: this.encoding,
    } as TerminalOptions);
    const dataLength = Buffer.byteLength(optionsStr, 'utf8');
    const buf = Buffer.allocUnsafe(dataLength + 5);
    buf.writeUInt8(CMDType.Spawn, 0);
    buf.writeUInt32BE(dataLength, 1);
    buf.write(optionsStr, 5, dataLength, 'utf8');
    client.write(buf);
  }

  private handleResponse(data: Buffer) {
    if(!this.rawBuffer) this.rawBuffer = data;
    else this.rawBuffer = Buffer.concat([this.rawBuffer, data]);
    let dataSize = 1;
    if(this.rawBuffer.length < dataSize) return;
    while(this.rawBuffer && this.rawBuffer.length >= dataSize) {
      const { rawBuffer: buffer } = this;
      const cmd = buffer.readUInt8(0) as CMDType;
      try {
        switch(cmd) {
          case CMDType.Data:
            dataSize += buffer.readUInt32BE(1) + 4;
            if(buffer.length < dataSize) return;
            this._pushData(buffer.slice(5, dataSize));
            break;
          case CMDType.Exit:
            dataSize += 4;
            if(buffer.length < dataSize) return;
            this.emit('end', buffer.readUInt16BE(1), buffer.readUInt16BE(3));
            throw new Error('Remote dismissed');
          default: throw new Error('Invalid Code');
        }
      } catch {
        this.pty.end();
        delete this.pty;
      }
      if(buffer.length > dataSize)
        this.rawBuffer = buffer.slice(dataSize);
      else
        this.rawBuffer = undefined;
    }
  }

  private handleError(error?: Error) {
    this.emit('error', error);
  }

  private handleSpawnerClose(code?: number) {
    if(code && this.pty) {
      this.pty.end();
      delete this.pty;
      this.emit('end');
    }
  }

  private handleExit() {
    delete this.pty;
  }
}
