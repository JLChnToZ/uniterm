module.exports = {
  make_targets: {
    win32: [
      'squirrel'
    ],
    darwin: [
      'zip'
    ],
    linux: [
      'deb',
      'rpm'
    ]
  },
  electronPackagerConfig: {
    icon: 'icons/uniterm',
    appCopyright: 'Copyright (c) Jeremy Lam "JLChnToZ" 2017.',
    win32metadata: {
      ProductName: 'uniterm',
      InternalName: 'uniterm',
      OriginalFilename: 'uniterm.exe',
      FileDescription: 'Universal Terminal Emulator',
      CompanyName: ''
    },
    asar: {
      unpackDir: 'node_modules/node-pty/{bin,build}/**'
    },
    ignore: [
      /\.[t]?log$/i,
      /forge\.config\.js$/i
    ]
  },
  electronWinstallerConfig: {
    name: ''
  },
  electronInstallerDebian: {},
  electronInstallerRedhat: {},
  github_repository: {
    owner: 'JLChnToZ',
    name: 'uniterm',
    draft: true,
    prerelease: true
  },
  windowsStoreConfig: {
    packageName: ''
  }
};