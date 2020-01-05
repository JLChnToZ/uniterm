const { writeFile, exists } = require('fs');
const { resolve } = require('path');
const { promisify, callbackify } = require('util');

const writeFileAsync = promisify(writeFile);
const existsAsync = promisify(exists);

module.exports = callbackify(async function(buildPath, _electronVersion, platform, _arch) {
  if(platform !== 'win32') return; // Only available in Windows
  const path = resolve(buildPath, '../../uniterm');
  if(await existsAsync(path)) return;
  return await writeFileAsync(path,
    '#!/usr/bin/env sh\nuniterm.exe $@\n',
    'utf-8'
  );
});
