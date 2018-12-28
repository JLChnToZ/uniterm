const packager = require('electron-packager');
const { rebuild } = require('electron-rebuild');
const { writeFile, exists } = require('fs');
const { resolve } = require('path');
const { callbackify, promisify } = require('util');

const existsAsync = promisify(exists);
const writeFileAsync = promisify(writeFile);
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
    /[\\\/](tests?|example|bin|obj|build)[\\\/]/i,
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
    callbackify(async (buildPath, electronVersion, platform, arch) => {
      if(platform !== 'win32') return;
      const path = resolve(buildPath, '../../uniterm');
      if(await existsAsync(path)) return;
      console.log('Create helper script for use in WSL...');
      return await writeFileAsync(path,
        '#!/usr/bin/env sh\nuniterm.exe $@\n',
        'utf-8'
      );
    }),
  ],
});