'use strict';
const Console = console.Console;
const MemoryStream = require('stream').PassThrough;
const Shell = require('../shellbase');

class TTYProxyShell extends Shell {
  constructor() {
    super();
    this.input = new MemoryStream();
    this.input.isRaw = true;

    this.output = new MemoryStream();
    this.output.isTTY = true;
    this.output.on('readable', this.read.bind(this));

    this.console = new Console(this.output);
  }
  read() {
    if(this.attachedHost)
      this.attachedHost.write(this.output.read());
  }
  write(buffer) {
    this.input.write(buffer);
  }
  resize(columns, rows) {
    Object.assign(this.output, { columns, rows });
    this.output.emit('resize');
  }
  attach(host) {
    super.attach(host);
    this.read();
  }
}

module.exports = TTYProxyShell;
