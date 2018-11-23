# Uniterm2

An evolution of Uniterm pseudo terminal emulator.

Difference between Uniterm2 and old Uniterm:
- Uniterm2 is based on xterm.js and the old one is Google's hterm.
- Uniterm2 has removed built-in MinSH component which exists in the old one.
- Uniterm2 is written with TypeScript and the old one is plain JavaScript.
- Uniterm2 supports dropping files that the old one does not.
- Uniterm2 built-in supports powerline decorations.
- Uniterm2 has a simple modding mechanism that does not exists in the old one.
  (see modding section below for details)

The features that exists in both Uniterm in Uniterm2:
- Cross platform pseudo terminal emulator
- Full Windows Subsystem for Linux intergration
- Tabs!
- Open source!

## Building

1. Clone this repository and get into it.
  ```sh
  $ git clone https://github.com/JLChnToZ/uniterm.git
  $ cd uniterm
  ```
2. Install dependencies. (Assume you have installed Node.js,
  NPM and requirements for building Node.js native modules)
  ```sh
  $ npm i
  ```
3. Build and package it.
  ```sh
  $ npm run package
  ```
4. You will find your fresh build inside `dist/` folder.

## Modding

It is quite tricky but not very hard to try it yourself. The mod files themselves
works like [userscripts](https://en.wikipedia.org/wiki/Userscript) but without
header and reloads everytime the config file has been updated.
Also Uniterm is already make the necessary stuffs (including class declarations
and some events) exposed to `window` namespace. To start modding, you may have
a look to [renderer.tsx](src/renderer.tsx) and its imports to figure out what is
it doing.

Once you created your mod or grabbed one from someone who made it, type
`uniterm --config` inside the Uniterm terminal, you should opened up a
[YAML](http://yaml.org/) config file with your favourite text editor, scroll to
bottom and you will see the hints: save/put the mod script file into the folder
it wrotes and add the filename under the mods field.

When you saved the config file, the terminal should immediately load/reloads
all mod files.

## License

[MIT](LICENSE)
