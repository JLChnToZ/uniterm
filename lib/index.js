'use strict';
const { app, dialog } = require('electron');
const commander = require('commander');
const TerminalHost = require('./termhost');
const ExecShell = require('./shells/exec');

function getArgv(argv) {
  argv = argv || process.argv;
  if(!process.defaultApp) argv.unshift(process.execPath);
  return argv;
}

function createWindow() {
  try {
    if(commander.config) {
      TerminalHost.showConfig();
      return;
    }
    const args = commander.args || [];
    if(!args.length)
      switch(process.platform) {
        case 'win32': args.push('cmd'); break;
        default: args.push('sh'); break;
      }
    return new TerminalHost(new ExecShell(args, commander.cwd, Object.assign({}, process.env, commander.env)));
  } catch(e) {
    console.error(e.stack || e);
    dialog.showMessageBox({
      type: 'error',
      title: 'Error!',
      message: e.message
    });
    if(TerminalHost.count <= 0) app.exit(1);
  }
}

function resetArgs() {
  Object.assign(commander, {
    args: [],
    cwd: process.cwd(),
    env: {},
    config: false
  });
}

commander.version(app.getVersion())
.usage('[options] <cmd> [args...]')
.option('--config', 'Show config')
.option('-p, --cwd <path>', 'Set working directory')
.option('-e, --env [data]', 'Add/set environment variable', (v, m) => {
  const matches = /(?:^|[^\\])=/.exec(v);
  if(matches) {
    const idx = matches.index + matches[0].length - 1;
    v = [v.substr(0, idx), v.substr(idx + 1)];
  } else {
    v = [v, ''];
  }
  const [k, cv] = v.map(v => v.replace(/\\(x([0-9A-F]{1,2})|.)/gi, (v, s, l) => {
    if(s && l) return String.fromCharCode(parseInt(s, 16));
    switch(l) {
      case '0': return '\x00';
      case 'A': case 'a': return '\x07';
      case 'B': case 'b': return '\x08';
      case 'E': case 'e': return '\x1B';
      case 'F': case 'f': return '\x0C';
      case 'N': case 'n': return '\x0A';
      case 'R': case 'r': return '\x0D';
      case 'T': case 't': return '\x0B';
      case '\\': case '\'': case '\"':
      case '?': case '=': return l;
      default: return '';
    }
  }));
  m[k] = cv;
  return m;
}, {})
.parse(getArgv());

if(app.makeSingleInstance((argv, cwd) => {
  resetArgs();
  commander.parse(getArgv(argv));
  commander.cwd = commander.cwd || cwd;
  createWindow(cwd);
})) {
  app.quit();
} else {
  TerminalHost.onrequestshell = function() {
    resetArgs();
    createWindow();
  }

  commander.cwd = commander.cwd || process.cwd();

  app.on('ready', createWindow);

  app.on('window-all-closed', () => {
    if(process.platform !== 'darwin') app.quit();
  });

  app.on('activate', () => {
    if(TerminalHost.count <= 0) createWindow();
  });
}
