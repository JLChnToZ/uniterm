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
  (Yarn)[https://yarnpkg.com/] and requirements for building Node.js native modules)
  ```sh
  $ yarn
  ```
3. Build and package it.
  ```sh
  $ yarn package
  ```
4. You will find your fresh build inside `dist/` folder.

Or if you are lazy to do it/does not meet the requirements to build it, but
you want to use/try it, you may go to [releases](https://github.com/JLChnToZ/uniterm/releases)
and download the prebuilt binaries. (Currently Windows x64 is available only,
sorry for other platforms)

## Using

Mainly, when you double-clicked the entry file (`uniterm.exe` for Windows, `uniterm.app` for OSX and `uniterm` for Linux),
it launches the default shell of your system (cmd, bash, etc.), but if you want more control on how it launches
(for example you want to launch a different shell, start from a specified directory, pass more environment variables, etc.),
you can pass arguments to it (via any external shell or even the shell opened inside Uniterm).

Here is the command-line usage, that is, what you will get when you pass `--help`:
```text
Usage: uniterm.exe --help [options] [--] [shellargs..]

Options:
  --cwd, -c         Working directory to start shell.                   [string]
  --env, -e         Add/modify environment variable passed into the shell.
                                                                         [array]
  --new-window, -n  Open the shell in a new window                     [boolean]
  --pause, -p       Pauses after shell/program exits                   [boolean]
  --config          Opens the config file                              [boolean]
  --reset-config    Resets the config file                             [boolean]
  --version         Show version number                                [boolean]
  --help            Show help                                          [boolean]
```

Additionally, you can have full WSL integration if you launch WSL with Uniterm by pass `wsl` as the shell exactly
such as `uniterm [options] [--] wsl [args..]` (Of cause this is a Windows only feature, this won't works on other platforms).
Your system's firewall may complain if you first time to launch the WSL with Uniterm,
as Uniterm needs to seek a free TCP port and open it to localhost for communicate between Windows side and Linux side.
When it asks for such permission, just allow it or it will not work.

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

Here has an example working mod, which make all the tabs reorderable by dragging them:
https://gist.github.com/JLChnToZ/f9e6ce2edf40820fe276a92c65b119bc

## License

[MIT](LICENSE)
