import { spawn } from 'child_process';
import { exists, stat } from 'fs';
import { delimiter, dirname, extname, resolve as resolvePath } from 'path';
import { promisify } from 'util';

const existsAsync = promisify(exists);
const statAsync = promisify(stat);

function getPathsBuilder(extraPaths: string | string[]) {
  let cwd: string | undefined;
  let paths: string[] | undefined;
  return function*() {
    if(Array.isArray(extraPaths))
      yield* extraPaths;
    yield cwd || (cwd = process.cwd());
    yield* paths || (paths = process.env.PATH.split(delimiter));
  };
}

// Workaround for Windows executable extensions matching
function getExtensionsBuilder(targetPath: string) {
  if (process.platform !== 'win32' || extname(targetPath).length) {
    const p = [targetPath];
    return () => p;
  }
  let pathext: string[] | undefined;
  return function*() {
    for(const ext of pathext || (pathext = process.env.PATHEXT.toLowerCase().split(delimiter)))
      yield targetPath + ext;
    yield targetPath;
  };
}

export async function resolveExecutable(targetPath: string, ...extraPaths: string[]) {
  const extensions = Array.from(getExtensionsBuilder(targetPath)());
  for(const basePath of getPathsBuilder(extraPaths)())
    for(const extPath of extensions) {
      const resolvedPath = resolvePath(basePath, extPath);
      if(await existsAsync(resolvedPath) && (await statAsync(resolvedPath)).isFile())
        return resolvedPath;
    }
  throw new Error(`"${targetPath}" does not exist.`);
}

// Function borrowed from wslpty
export async function resolveWslPath(originalPath: string): Promise<string> {
  if(process.platform !== 'win32')
    throw new Error('This utility is Windows specific.');
  if(!await existsAsync(originalPath))
    throw new Error('Path does not exists');
  return await new Promise<string>((resolve, reject) => {
    const finder = spawn('wsl.exe', ['wslpath', originalPath.replace(/\\/g, '\\\\')]);
    let output = '';
    finder.stdout.on('data', data => output += data);
    finder.on('error', err => reject(err));
    finder.on('close', code => {
      if(code === 0) resolve(output.trim());
      else reject(new Error(`Failed to resolve WSL path: ${code}`));
    });
  });
}

export function tryResolvePath(cwd: string, target?: string) {
  try {
    if(!target)
      return cwd;
    if(process.platform === 'win32' && /^[\/\~]/.test(target))
      return target;
    return resolvePath(cwd, target);
  } catch {
    return cwd;
  }
}

export function fixPath(env: { [key: string]: string }) {
  for (const key of Object.keys(process.env)) {
    if(!/^path$/i.test(key)) continue;
    if(env[key])
      env[key] += delimiter + dirname(process.argv0);
    else
      env[key] = process.env[key] + delimiter + dirname(process.argv0);
  }
  return env;
}

export function fileUrl(path: string) {
  let pathName = resolvePath(path).replace(/\\/g, '/');
  if(pathName[0] !== '/')
    pathName = '/' + pathName;
  return encodeURI('file://' + pathName);
}
