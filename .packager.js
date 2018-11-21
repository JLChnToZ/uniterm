const packager = require('electron-packager');
const { rebuild } = require('electron-rebuild');
const { writeFile, existsSync } = require('fs');
const { resolve } = require('path');

packager({
  dir: __dirname,
  overwrite: true,
  out: 'dist/',
  icon: 'icons/uniterm',
  appCopyright: 'Copyright (c) Jeremy Lam "JLChnToZ" 2017-2018.',
  win32metadata: {
    ProductName: 'uniterm2',
    InternalName: 'uniterm',
    OriginalFilename: 'uniterm.exe',
    FileDescription: 'Universal Terminal Emulator',
    CompanyName: 'Explosive Theorem Lab.'
  },
  asar: {
    unpackDir: 'node_modules/**/{R,r}elease'
  },
  ignore: [
    /\.([a-z0-9]*ignore|gypi?|sln|pdb|md|t?log|cmd|bat|sh|ps1|lib|exp|map|cc|h|tsx?|sass|coffee)$/i,
    /[\\\/](deps|tests?|example|bin)[\\\/]/i,
    /\.gitmodules/i,
    /ts(config|lint).json$/i,
    /\.[a-z]+proj(\.filters)?$/i,
    /\.packager\.js$/i,
    /readme[^\\\/]*$/i,
    /(^|[\\\/])\.[^\\\/]*$/i
  ],
  afterCopy: [
    (buildPath, electronVersion, platform, arch, callback) => {
      console.log('Rebuild native modules...');
      rebuild({
        buildPath,
        electronVersion,
        arch,
      })
      .then(() => callback(), err => callback(err))
    },
    (buildPath, electronVersion, platform, arch, callback) => {
      if(platform !== 'win32')
        return callback();
      const path = resolve(buildPath, '../../uniterm');
      if(existsSync(path))
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