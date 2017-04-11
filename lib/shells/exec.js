'use strict'
const pty = require('node-pty');
const Shell = require('../shellbase');
const pathUtils = require('../pathutils');

class ExecShell extends Shell {
  constructor(argv, cwd, env) {
    super();
    if(!argv || !argv.length)
      throw new Error('Attempt to launch empty command');
    this.env = env || process.env;
    this.cwd = cwd || process.cwd();
    this.argv = argv;
    this.path = pathUtils.resolveExecutable(this.argv.shift(), this.cwd);
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
    this.proc.on('data', this.read.bind(this));
    this.proc.on('exit', this.end.bind(this));
    this.proc.on('error', err => console.error(err.stack || err));
  }
  read(data) {
    if(!data || !data.length) return;
    if(this.attachedHost) {
      this.attachedHost.write(data);
      return;
    }
    if(!this.bufferedData)
      this.bufferedData = [];
    this.bufferedData.push(data);
  }
  write(buffer) {
    if(buffer instanceof Buffer)
      buffer = buffer.toString('utf8');
    buffer = buffer.replace(/\r\n|(?!\r)\n/, '\r');
    if(this.proc) this.proc.write(buffer);
  }
  resize(columns, rows) {
    super.resize(columns, rows);
    setImmediate(() => {
      if(this.proc && columns && rows)
        this.proc.resize(columns, rows);
    });
  }
  close() {
    if(this.proc) this.proc.kill();
  }
  end() {
    if(this.proc) this.proc.destroy();
    this.proc = null;
    super.end();
  }
  attach(host) {
    super.attach(host);
    if(this.bufferedData) {
      this.read(Buffer.concat(this.bufferedData));
      this.bufferedData = null;
    }
    this.spawn(host.columns, host.rows);
  }
}

module.exports = ExecShell;