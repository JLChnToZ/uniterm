Uniterm
=======
An experimental cross-platform terminal emulator based on [hterm](https://chromium.googlesource.com/apps/libapps/+/master/hterm), [node-pty](https://github.com/Tyriar/node-pty) and [Electron](https://electron.atom.io). Most of the code here are adopted from my another experimental project [Replio Standalone](https://github.com/JLChnToZ/replio/tree/standalone).

Install
-------
```bash
$ npm i
```
And then
```bash
$ npm start
```

You may also pack it:
```bash
$ npm run pack
```

```
Usage: uniterm [options] <cmd> [args...]

Options:

  -h, --help        output usage information
  -V, --version     output the version number
  -p, --cwd <path>  Set working directory
  -e, --env [data]  Add/set environment variable
```

License
-------
[MIT](LICENSE)
