'use strict';
const childProcess = require('child_process');
const ExecShell = require('./shells/exec');
const path = require('./pathutils');

function bind(list) {
  try {
    const busyBoxPath = path.resolveExecutable('busybox', process.execPath);
    childProcess.execFile(busyBoxPath, ['--list'], (err, stdout, stderr) => {
      if(err) return;
      for(const command of stdout.split(/\r\n|\r|\n/g))
        if(command && !(command in list)) list[command] = {
          args: '',
          description: `\x1b[30;1m(External command from BusyBox, type \`\x1b[0;36m${command} --help\x1b[30;1m\` for help)\x1b[0m`,
          action(line) {
            line.unshift(busyBoxPath, command);
            const shell = new ExecShell(line, this.cwd, this.env);
            shell.title = command;
            this.attachedHost.pushShell(shell);
          }
        };
    });
  } catch(e) {}
};

module.exports.bind = bind;
