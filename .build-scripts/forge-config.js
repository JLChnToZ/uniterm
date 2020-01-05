module.exports = {
  packagerConfig: {
    icon: 'icons/uniterm',
    appCopyright: 'Copyright (C) Jeremy Lam "JLChnToZ" 2017-2020. Distrubuted under MIT license.',
    win32metadata: {
      ProductName: 'uniterm2',
      InternalName: 'uniterm',
      OriginalFilename: 'uniterm.exe',
      FileDescription: 'Universal Terminal Emulator',
      CompanyName: 'Explosive Theorem Lab.',
    },
    ignore: [
      /\.([a-z0-9]*ignore|sln|pdb|md|t?log|ps1|lib|exp|map|tsx?|sass|coffee)$/i,
      /(?<!upath)[\\\/](tests?|example|bin|obj|build|@types)([\\\/]|$)/i,
      /\.gitmodules/i,
      /ts(config|lint).json$/i,
      /yarn.lock$/i,
      /\.[a-z]+proj(\.filters)?$/i,
      /\.build-scripts/i,
      /\.intro/i,
      /readme[^\\\/]*$/i,
      /(^|[\\\/])\.[^\\\/]*$/i,
    ],
    asar: {
      unpackDir: 'node_modules/wslpty/backend/**/*',
    },
    afterExtract: [
      require('./create-wsl'),
    ]
  },
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        name: 'uniterm',
      },
    },
    {
      name: '@electron-forge/maker-zip',
    },
    {
      name: '@electron-forge/maker-deb',
      config: {},
    },
    {
      name: '@electron-forge/maker-rpm',
      config: {},
    },
  ],
  plugins: [
    ['@electron-forge/plugin-auto-unpack-natives']
  ],
};