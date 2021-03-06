import { createDecodeStream, createEncodeStream } from 'msgpack-lite';
import { connect as connectServer } from 'net';
import { join as joinPath } from 'path';
import { TerminalLaunchOptions } from './interfaces';
import { createBackend } from './terminals';
import { TerminalBase } from './terminals/base';

export const enum CMDType {
  Data = 0x01,
  Resize = 0x02,
  Spawn = 0x03,
  Priority = 0x04,
  Error = 0x7E,
  Exit = 0x7F,
}

export type CMDData =
  [CMDType.Data, any] |
  [CMDType.Resize, number, number] |
  [CMDType.Spawn, TerminalLaunchOptions] |
  [CMDType.Error, string] |
  [CMDType.Exit, number, number] |
  [CMDType.Priority, number] |
  [CMDType, ...any[]];

export function connectToClient(path: string) {
  let host: TerminalBase<unknown> | undefined;
  let flushRequested = false;
  const client = connectServer(joinPath('\\\\.\\pipe', path));
  client
  .on('end', handleRemoteClose)
  .on('close', handleRemoteClose)
  .pipe(createDecodeStream())
  .on('data', handleRequest);
  const writer = createEncodeStream();
  writer.pipe(client);

  function handleRequest(data: CMDData) {
    try {
      switch(data[0]) {
        case CMDType.Spawn:
          if(host) throw new Error('Host is already spawned.');
          host = createBackend(data[1]);
          host
          .on('data', handleResponse)
          .on('end', handleClose)
          .on('error', handleError)
          .spawn();
          break;
        case CMDType.Data:
          if(!host) throw new Error('Host is not spawned.');
          host.write(data[1]);
          break;
        case CMDType.Priority:
          host.priority = data[1];
          writeAndFlush(CMDType.Priority, host.priority);
          break;
        case CMDType.Resize:
          if(!host) throw new Error('Host is not spawned.');
          host.resize(data[1], data[2]);
          break;
        case CMDType.Exit:
          if(!host) throw new Error('Host is not spawned.');
          host.destroy();
          break;
        default: throw new Error('Invalid code');
      }
    } catch {
      client.destroy();
    }
  }

  function handleResponse(data: string | Buffer) {
    writeAndFlush(CMDType.Data, data);
  }

  function handleClose(code?: number, signal?: number) {
    if(host) host = undefined;
    writeAndFlush(CMDType.Exit, code || 0, signal || 0);
  }

  function handleError(error: Error) {
    writeAndFlush(CMDType.Error, error.message);
  }

  function handleRemoteClose() {
    if(host) host.destroy();
    process.exit();
  }

  function writeAndFlush(...data: CMDData) {
    writer.write(data);
    if(flushRequested) return;
    flushRequested = true;
    process.nextTick(flush);
  }

  function flush() {
    writer.encoder.flush();
    flushRequested = false;
  }
}

if(module === process.mainModule)
  connectToClient(process.argv[2]);
