'use strict';
const { BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const url = require('url');
const EventEmitter = require('events');

const instances = new Map();

class TerminalHost extends EventEmitter {
  constructor(shell) {
    super();
    const window = this.window = new BrowserWindow({ width: 800, height: 600 });
    const id = this.id = window.webContents.id;
    window.setMenu(null);
    window.loadURL(url.format({
      pathname: path.resolve(__dirname, '../static/index.html'),
      protocol: 'file:',
      slashes: true
    }));
    window.on('closed', () => this._handleClose());
    instances.set(id, this);
    this.shells = [];
    this.pushShell(shell);
  }
  pushShell(shell) {
    if(!shell) return;
    if(this.ready) {
      if(this.shells.length)
        this.shells[this.shells.length - 1].detach(this);
      shell.attach(this);
    }
    this.shells.push(shell);
  }
  detachShell(shell) {
    if(!this.shells.length) return;
    this.shells[this.shells.length - 1].detach(this);
    let i;
    while((i = this.shells.indexOf(shell)) >= 0)
      this.shells.splice(i, 1);
    if(this.shells.length)
      this.shells[this.shells.length - 1].attach(this);
    else
      this.window.close();
  }
  write(data, encoding) {
    if(!data) return;
    if(!(data instanceof Buffer))
      data = new Buffer(data, encoding);
    if(this.ready) {
      this.window.webContents.send(
        'output',
        data.toString('utf8').replace(/(?!\r)\n/g, '\r\n')
      );
      return;
    }
    if(!this.bufferedData)
      this.bufferedData = [];
    this.bufferedData.push(data);
  }
  _handleReady() {
    if(this.ready) return;
    this.ready = true;
    if(this.bufferedData) {
      this.write(Buffer.concat(this.bufferedData));
      this.bufferedData = null;
    }
    if(this.shells.length)
      this.shells[this.shells.length - 1].attach(this);
    this.emit('ready');
  }
  _handleInput(buffer) {
    if(this.shells.length)
      this.shells[this.shells.length - 1].write(buffer);
  }
  _handleResize(columns, rows) {
    Object.assign(this, { columns, rows });
    this.emit('resize', columns, rows);
  }
  _handleClose() {
    instances.delete(this.id);
    this.ready = false;
    this.window = null;
    this.emit('closed');
  }
  static get count() {
    return instances.size;
  }
}

ipcMain.on('terminal-ready', (e) => {
  const instance = instances.get(e.sender.id);
  if(instance) instance._handleReady();
});

ipcMain.on('input', (e, data) => {
  const instance = instances.get(e.sender.id);
  if(instance) instance._handleInput(Buffer.from(data, 'utf8'));
});

ipcMain.on('resize', (e, columns, rows) => {
  const instance = instances.get(e.sender.id);
  if(instance) instance._handleResize(columns, rows);
});

module.exports = TerminalHost;
