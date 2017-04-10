'use strict';
const path = require('path');
const fs = require('fs');
const os = require('os');

function getPathsBuilder(extraPaths) {
  let cwd, paths;
  return function* () {
    if(Array.isArray(extraPaths))
      yield* extraPaths;
    if(!cwd) cwd = process.cwd();
    yield cwd;
    if(!paths) paths = process.env.PATH.split(path.delimiter);
    yield* paths;
  };
}

// Workaround for Windows executable extensions matching
function getExtensionsBuilder(targetPath) {
  const tryExt = os.platform() !== 'win32' || path.extname(targetPath).length;
  let pathext;
  return function* () {
    if(!tryExt) {
      if(!pathext) pathext = process.env.PATHEXT.split(path.delimiter);
      for(const ext of pathext) yield targetPath + ext;
    }
    yield targetPath;
  };
}

function resolveExecutable(targetPath, ...extraPaths) {
  const getPaths = getPathsBuilder(extraPaths);
  const getExtensions = getExtensionsBuilder(targetPath);
  for(const basePath of getPaths())
    for(const extPath of getExtensions()) {
      const resolvedPath = path.resolve(basePath, extPath);
      if(fs.existsSync(resolvedPath) && fs.statSync(resolvedPath).isFile())
        return resolvedPath;
    }
  throw new Error(`"${targetPath}" does not exist.`);
}

Object.assign(module.exports, path);

module.exports.resolveExecutable = resolveExecutable;
