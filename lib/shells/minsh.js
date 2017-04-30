'use strict';
const fs = require('fs');
const path = require('path');
const errno = require('errno');
const SplitArgv = require('argv-split');
const TerminalHost = require('../termhost');
const ReadLineShell = require('./readline');
const ExecShell = require('./exec');

const shellCommands = {
  'help': {
    args: '',
    description: 'Show this help message',
    action() {
      let message = 'There are no too many built-in commands in this shell, except for:\n';
      for(let cmdname in shellCommands) {
        const cmd = shellCommands[cmdname];
        message += `  ${cmdname}${cmd.args ? (' ' + cmd.args) : ''}: ${cmd.description}\n`;
      }
      message += 'All other commands will be parsed as external command with ' +
        'arguments and run directly in current tab.\n' +
        'Have a notice that this is not a complete interactive shell, ' +
        'it is made exclusively for launching other terminal applications and ' +
        'controlling the behaviour of Uniterm ' +
        'so it is lack of many standard shell functionalities.\n' +
        'It is recommanded to launch a complete shell by typing `sh` or `bash` on *nix environment ' +
        'and `cmd` or `powershell` on Windows environment.';
      this.console.log(message);
    }
  },
  'config': {
    args: '',
    description: 'Open a config window',
    action() { TerminalHost.showConfig(); }
  },
  'cd': {
    args: '[path]',
    description: 'Change or display current working directory',
    action(line) {
      if(line.length) {
        const newPath = path.resolve(this.cwd, line[0]);
        if(!fs.existsSync(newPath))
          throw new Error(errno.ENOENT.description);
        if(!fs.statSync(newPath).isDirectory())
          throw new Error(errno.ENOTDIR.description);
        this.cwd = path.resolve(this.cwd, line[0]);
      }
      this.console.log('Current working directory is:', this.cwd);
    }
  },
  'set': {
    args: 'key1 value1 [key2 value2 [...]]',
    description: 'Add or modify environment variable(s)',
    action(line) {
      for(let i = 0; i < line.length; i += 2)
        this.env[line[i]] = line[i + 1];
    }
  },
  'unset': {
    args: 'key1 [key2 [...]]',
    description: 'Removes an environment variable(s)',
    action(line) {
      for(let i = 0; i < line.length; i++)
        delete this.env[line[i]];
    }
  },
  'listenv': {
    args: '',
    description: 'Display current environment variables',
    action() {
      let message = 'Registered environment variables:\n';
      for(let key of this.env)
        message += `  ${key} = ${this.env[key]}`;
      this.console.log(message);
    }
  },
  'start': {
    args: 'command [args...]',
    description: 'Run an external command in new tab',
    action(line) {
      this.console.log(`Launch "${line[0]}" in new tab...`);
      new TerminalHost(line.length ? new ExecShell(line, this.cwd, this.env) : new MinShell(this.cwd, this.env));
    }
  },
  'exit': {
    args: '',
    description: 'Close this shell',
    action() { this.end(); }
  }
};

class MinShell extends ReadLineShell {
  constructor(cwd, env) {
    super();
    const { console, readline } = this;
    this.cwd = cwd || process.cwd();
    this.env = Object.assign({}, process.env, env);
    this.title = 'MinSh';
    console.log('Minimal Shell for Uniterm\nType `help` for more info.');
    readline.setPrompt('ζ ');
    this.on('line', this.line.bind(this));
    this.nextPrompt();
  }
  line(line) {
    line = SplitArgv(line);
    const { console, readline } = this;
    if(!line.length)
      return readline.prompt();
    try {
      const command = line.shift();
      if(command in shellCommands) {
        shellCommands[command].action.call(this, line);
      } else {
        line.unshift(command);
        this.attachedHost.pushShell(new ExecShell(line, this.cwd, this.env));
      }
    } catch(e) {
      console.log('Error:',
        (e.errno && e.errno in errno) ?
        errno[e.errno].description :
        (e.message || e)
      );
    }
    if(this.readline)
      this.nextPrompt();
  }
  nextPrompt() {
    this.console.log('\x1b[0m');
    this.readline.prompt();
  }
}

module.exports = MinShell;
