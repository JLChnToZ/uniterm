const packager = require('electron-packager');
const { rebuild } = require('electron-rebuild');
const { writeFile, exists } = require('fs');
const { resolve } = require('path');
const { callbackify, promisify } = require('util');

const existsAsync = promisify(exists);
const rebuildCb = callbackify(rebuild);

packager({
  dir: __dirname,
  overwrite: true,
  arch: 'all',
  out: 'dist/',
  icon: 'icons/uniterm',
  appCopyright: 'Copyright (c) Jeremy Lam "JLChnToZ" 2017-2018.',
  win32metadata: {
    ProductName: 'uniterm2',
    InternalName: 'uniterm',
    OriginalFilename: 'uniterm.exe',
    FileDescription: 'Universal Terminal Emulator',
    CompanyName: 'Explosive Theorem Lab.',
  },
  asar: {
    unpackDir: 'node_modules/{wslpty,node-pty}',
  },
  ignore: [
    /\.([a-z0-9]*ignore|sln|pdb|md|t?log|ps1|lib|exp|map|tsx?|sass|coffee)$/i,
    /[\\\/](tests?|example|bin)[\\\/]/i,
    /\.gitmodules/i,
    /ts(config|lint).json$/i,
    /\.[a-z]+proj(\.filters)?$/i,
    /\.packager\.js$/i,
    /readme[^\\\/]*$/i,
    /(^|[\\\/])\.[^\\\/]*$/i,
  ],
  afterCopy: [
    (buildPath, electronVersion, platform, arch, callback) => {
      console.log('Rebuild native modules for Electron v%s %s %s...',
        electronVersion,
        platform,
        arch
      );
      rebuildCb({
        buildPath,
        electronVersion,
        arch,
        force: true,
      }, callback);
    },
    async (buildPath, electronVersion, platform, arch, callback) => {
      if(platform !== 'win32')
        return callback();
      const path = resolve(buildPath, '../../uniterm');
      if(await existsAsync(path))
        return callback();
      console.log('Create helper script for use in WSL...');
      writeFile(path,
        '#!/usr/bin/env sh\nuniterm.exe $@\n',
        'utf-8',
        callback
      );
    },
  ],
});