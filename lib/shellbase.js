'use strict';
const EventEmitter = require('events');

class Shell extends EventEmitter {
  constructor() { super(); }
  write(buffer) {
    if(this.attachedHost)
      this.attachedHost.write(buffer);
  }
  resize(columns, rows) {}
  end() {
    if(this.attachedHost)
      this.attachedHost.detachShell(this);
    this.emit('end');
  }
  close() {}
  attach(host) {
    if(this.attachedHost)
      throw new Error('Current shell is already attached to a host.');
    this.attachedHost = host;
    this._close = this._close || this.close.bind(this);
    host.on('close', this._close);
    this._resize = this._resize || this.resize.bind(this);
    host.on('resize', this._resize);
    this.resize(host.columns, host.rows);
    this.emit('attach');
  }
  detach(host) {
    if(host === this.attachedHost)
      this.attachedHost = null;
    host.removeListener('close', this._close);
    host.removeListener('resize', this._resize);
    this.emit('detach');
  }
}

module.exports = Shell;
