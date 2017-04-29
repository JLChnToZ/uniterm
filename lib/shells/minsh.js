'use strict';
const path = require('path');
const SplitArgv = require('argv-split');
const TerminalHost = require('../termhost');
const ReadLineShell = require('./readline');
const ExecShell = require('./exec');

class MinShell extends ReadLineShell {
  constructor(cwd, env) {
    super();
    const { console, readline } = this;
    this.cwd = cwd || process.cwd();
    this.env = Object.assign({}, process.env, env);
    this.title = 'MinSh';
    console.log('Minimal Shell for Uniterm\n');
    readline.setPrompt('@> ');
    readline.prompt();
    this.on('line', this.line.bind(this));
  }
  line(line) {
    line = SplitArgv(line);
    const { console, readline } = this;
    if(!line.length)
      return readline.prompt();
    try {
      const command = line.shift();
      switch(command) {
        case 'help':
          console.log('There are no too many built-in commands in this shell, except for:');
          console.log('  `help`: Show this help message');
          console.log('  `cd [path]`: Change or show current working directory');
          console.log('  `set key1 value1 [key2 value2 [...]]`: Add or modify an environment variable');
          console.log('  `unset key1 [key2 [...]]`: Removes an environment variable');
          console.log('  `listenv`: Display current environment variables');
          console.log('  `config`: Open a config window');
          console.log('  `start command [args...]`: Run an external command in new tab');
          console.log('  `exit`: Close this shell');
          console.log('All other commands will be parsed as external command with arguments and run directly in current tab.\n');
          break;
        case 'config':
          TerminalHost.showConfig();
          break;
        case 'set':
          for(let i = 0; i < line.length; i += 2)
            this.env[line[i]] = line[i + 1];
          break;
        case 'unset':
          for(let i = 0; i < line.length; i++)
            delete this.env[line[i]];
          break;
        case 'cd':
          if(line.length)
            this.cwd = path.resolve(this.cwd, line[0]);
          else
            console.log(this.cwd);
          break;
        case 'start':
          new TerminalHost(line.length ? new ExecShell(line, this.cwd, this.env) : new MinShell(this.cwd, this.env));
          break;
        case 'exit':
          this.end();
          return;
        default:
          line.unshift(command);
          this.attachedHost.pushShell(new ExecShell(line, this.cwd, this.env));
          break;
      }
    } catch(e) {
      console.log(e.message || e);
    }
    readline.prompt();
  }
}

module.exports = MinShell;
