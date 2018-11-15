'use strict'
const pty = require('wslpty');
const Shell = require('./execbase');

module.exports = class WSLExecShell extends Shell {
  constructor(argv, cwd, env) {
    if(process.platform !== 'win32')
      throw new Error('WSL is available on Windows only!');
    if(!argv || !argv.length)
      argv = [];
    super(argv, cwd, env);
    this.title = argv[0] || '';
  }
  spawn(cols, rows) {
    if(this.proc) return;
    this.read('\x1b[?25h\x1b[0m');
    this.proc = pty.spawn({
      cols: cols || 80,
      rows: rows || 30,
      cwd: this.cwd,
      env: this.env
    });
    if(this.argv.length)
      this.proc.write(this.argv.join(' ') + '; exit\n');
    this._attachEventListsners();
  }
}
