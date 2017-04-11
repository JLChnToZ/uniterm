'use strict';
const { BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const url = require('url');
const EventEmitter = require('events');

const prepareTabs = [];
const preapreInstances = [];
const instances = new Map();
const windows = new Map();
let lastActiveWindow;

class TerminalHost extends EventEmitter {
  constructor(shell) {
    super();
    preapreInstances.push(this);
    createTab();
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
    else if(this.ready)
      this.webContents.send('end');
  }
  write(data, encoding) {
    if(!data) return;
    if(!(data instanceof Buffer))
      data = new Buffer(data, encoding);
    if(this.ready) {
      this.webContents.send(
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

function getWindow() {
  if(lastActiveWindow) return lastActiveWindow;
  const entry = {
    hostIds: new Set(),
    window: new BrowserWindow({ width: 800, height: 600 }),
    ready: false
  };
  const { window, hostIds } = entry;
  const windowId = window.webContents.id;
  window.setMenu(null);
  window.loadURL(url.format({
    pathname: path.resolve(__dirname, '../static/tabhost.html'),
    protocol: 'file:',
    slashes: true
  }));
  window.webContents.once('did-finish-load', () => {
    entry.ready = true;
  });
  window.on('closed', () => {
    windows.delete(windowId);
    for(const id of hostIds) {
      const instance = instances.get(id);
      if(instance) instance._handleClose();
      else instances.delete(id);
    }
    if(lastActiveWindow === entry) {
      lastActiveWindow = undefined;
      for(const otherWnd of windows.values()) {
        lastActiveWindow = otherWnd; break;
      }
    }
  });
  windows.set(windowId, entry);
  lastActiveWindow = entry;
  return entry;
}

function createTab() {
  if(prepareTabs.length) {
    const instance = preapreInstances.pop();
    const webContents = prepareTabs.pop();
    instances.set(webContents.id, instance);
    instance.webContents = webContents;
    setImmediate(() => instance._handleReady());
    return;
  }
  const windowEntry = getWindow();
  const { webContents } = windowEntry.window;
  if(windowEntry.ready) webContents.send('addtab');
  else webContents.once('did-finish-load', () =>
    webContents.send('addtab'));
}

ipcMain.on('terminal-ready', (e) => {
  if(preapreInstances.length) {
    const instance = preapreInstances.pop();
    instances.set(e.sender.id, instance);
    instance.webContents = e.sender;
    instance._handleReady();
  } else {
    prepareTabs.push(e.sender);
    if(TerminalHost.onrequestshell)
      TerminalHost.onrequestshell();
  }
});

ipcMain.on('input', (e, data) => {
  const instance = instances.get(e.sender.id);
  if(instance) instance._handleInput(Buffer.from(data, 'utf8'));
});

ipcMain.on('resize', (e, columns, rows) => {
  const instance = instances.get(e.sender.id);
  if(instance) instance._handleResize(columns, rows);
});

ipcMain.on('end', (e, hostId) => {
  const instance = instances.get(hostId);
  if(instance) instance._handleClose();
  const windowEntry = windows.get(e.sender.id);
  if(windowEntry) windowEntry.hostIds.delete(hostId);
});

module.exports = TerminalHost;