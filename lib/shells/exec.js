'use strict'
const pty = require('node-pty');
const Shell = require('./execbase');
const pathUtils = require('../pathutils');

module.exports = class ExecShell extends Shell {
  constructor(argv, cwd, env) {
    if(!argv || !argv.length)
      throw new Error('Attempt to launch empty command');
    super(argv, cwd, env);
    const origPath = this.argv.shift();
    this.path = pathUtils.resolveExecutable(origPath, this.cwd);
    this.title = pathUtils.basename(origPath) || origPath;
  }
  spawn(cols, rows) {
    if(this.proc) return;
    this.proc = pty.spawn(this.path, this.argv, {
      name: 'xterm-color',
      cols: cols || 80,
      rows: rows || 30,
      cwd: this.cwd,
      env: this.env
    });
    this._attachEventListsners();
  }
}
