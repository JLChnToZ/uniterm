import { connect as connectServer } from 'net';
import { join as joinPath } from 'path';
import { TerminalBase } from './base';
import { createBackend } from './selector';

export const enum CMDType {
  Data = 0x01,
  Resize = 0x02,
  Spawn = 0x80,
  Error = 0xFE,
  Exit = 0xFF,
}

export function connectToClient(path: string) {
  let buffer: Buffer | undefined;
  let host: TerminalBase<unknown> | undefined;
  const client = connectServer(joinPath('\\\\.\\pipe', path));
  client
  .on('data', handleRequest)
  .on('close', handleRemoteClose)
  .on('error', handleRemoteClose);

  function handleRequest(data: Buffer) {
    if(!buffer) buffer = data;
    else buffer = Buffer.concat([buffer, data]);
    let dataSize = 1;
    while(buffer && buffer.length >= dataSize) {
      const cmd: CMDType = buffer.readUInt8(0);
      try {
        switch(cmd) {
          case CMDType.Spawn:
            dataSize += buffer.readUInt32BE(1) + 4;
            if(buffer.length < dataSize) return;
            if(host) throw new Error('Host is already spawned.');
            host = createBackend(JSON.parse(buffer.slice(5, dataSize).toString('utf8')));
            host
            .on('data', handleResponse)
            .on('end', handleClose)
            .on('error', handleError)
            .spawn();
            break;
          case CMDType.Data:
            dataSize += buffer.readUInt32BE(1) + 4;
            if(buffer.length < dataSize) return;
            if(!host) throw new Error('Host is not spawned.');
            host.write(buffer.slice(5, dataSize));
            break;
          case CMDType.Resize:
            dataSize += 4;
            if(buffer.length < dataSize) return;
            if(!host) throw new Error('Host is not spawned.');
            host.resize(buffer.readUInt16BE(1), buffer.readUInt16BE(3));
            break;
          case CMDType.Exit:
            if(!host) throw new Error('Host is not spawned.');
            host.end();
            host = undefined;
            throw new Error('Host closed.');
          default: throw new Error('Invalid code');
        }
      } catch {
        client.end();
        process.exit();
      }
      if(buffer.length > dataSize)
        buffer = buffer.slice(dataSize);
      else
        buffer = undefined;
    }
  }

  function handleResponse(data: string | Buffer) {
    const encoding = host && host.encoding || 'utf8';
    if(Buffer.isBuffer(data)) {
      const buf = Buffer.allocUnsafe(5);
      buf.writeUInt8(CMDType.Data, 0);
      buf.writeUInt32BE(data.length, 1);
      client.write(buf);
      client.write(data);
    } else {
      const dataLength = Buffer.byteLength(data, encoding);
      const buf = Buffer.allocUnsafe(5 + dataLength);
      buf.writeUInt8(CMDType.Data, 0);
      buf.writeUInt32BE(dataLength, 1);
      buf.write(data, 5, dataLength, encoding);
      client.write(buf);
    }
  }

  function handleClose(code?: number, signal?: number) {
    const buf = Buffer.allocUnsafe(5);
    buf.writeUInt8(CMDType.Exit, 0);
    buf.writeUInt16BE(code || 0, 1);
    buf.writeUInt16BE(signal || 0, 3);
    client.write(buf);
    client.end();
    process.exit();
  }

  function handleError(error: Error) {
    const message = error.message || JSON.stringify(error);
    const dataLength = Buffer.byteLength(message, 'utf8');
    const buf = Buffer.allocUnsafe(5 + dataLength);
    buf.writeUInt8(CMDType.Error, 0);
    buf.writeUInt32BE(dataLength, 1);
    buf.write(message, 5, dataLength, 'utf8');
    client.write(buf);
  }

  function handleRemoteClose() {
    if(host) host.end();
    host = undefined;
    process.exit();
  }
}
