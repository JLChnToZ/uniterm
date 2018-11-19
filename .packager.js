const packager = require('electron-packager');
const { rebuild } = require('electron-rebuild');

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
    unpackDir: 'node_modules/{node-pty,wslpty}/**'
  },
  ignore: [
    /\.([a-z0-9]*ignore|gypi?|sln|pdb|md|t?log|cmd|bat|sh|ps1|lib|exp|map|cc|h|ts)$/i,
    /[\\\/](deps|tests?|example)[\\\/]/i,
    /\.gitmodules/i,
    /\.[a-z]+proj(\.filters)?$/i,
    /\.packager\.js$/i,
    /readme[^\\\/]*$/i,
    /(^|[\\\/])\.[^\\\/]*$/i
  ],
  afterCopy: [
    (buildPath, electronVersion, platform, arch, callback) =>
      rebuild({ buildPath, electronVersion, arch })
      .then(() => callback(), err => callback(err))
  ],
});