'use strict'
const Shell = require('../shellbase');

module.exports = class ExecShellBase extends Shell {
  constructor(argv, cwd, env) {
    super();
    this.env = env || process.env;
    this.cwd = cwd || process.cwd();
    this.argv = argv;
  }
  spawn(cols, rows) {}
  _attachEventListsners() {
    this.proc.on('data', this.read.bind(this));
    this.proc.on('exit', this.end.bind(this));
    this.proc.on('error', err => {
      if(this.attachedHost)
        this.attachedHost.write('\x1b[0m\r\n\x1b[33;1mOops! Terminal backend throws this error: \x1b[31m' +
          (err.message || err) +
          '\x1b[0m\r\nError stack has been printed on the backend standard IO, ' +
          'you should see it if you attached Uniterm to a console. ' +
          'The terminal backend may be still responsible but ' +
          'usually it doesn\'t.\r\nIf you get stuck here, ' +
          'it is sorry to say that you have to kill this tab by ' +
          'clicking the close button yourself.\r\nIf there are any ' +
          'running process(es) attached on this session, ' +
          'they likely to have no life.\r\nSorry about that :(\r\n\r\n');
      console.error(err.stack || err);
    });
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
    if(this.proc && !this.killed) {
      this.killed = true;
      this.proc.kill();
    }
  }
  end() {
    if(this.proc && this.proc.destroy && !this.killed)
      this.proc.destroy();
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
