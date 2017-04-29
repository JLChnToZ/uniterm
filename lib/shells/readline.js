'use strict'
const readline = require('readline');
const TTYProxyShell = require('./ttyproxy');

class ReadLineShell extends TTYProxyShell {
  constructor() {
    super();
    this.readline = readline.createInterface(this);
    this.readline.on('close', this.end.bind(this));
    this.readline.on('line', this.emit.bind(this, 'line'));
    this.readline.on('pause', this.emit.bind(this, 'pause'));
    this.readline.on('resume', this.emit.bind(this, 'resume'));
  }
  close() {
    if(this.readline) this.readline.close();
  }
  end() {
    this.readline = null;
    super.end();
  }
}

module.exports = ReadLineShell;
