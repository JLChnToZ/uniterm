import { spawn } from 'child_process';
import { exists, mkdir, readFile, writeFile } from 'fs';
import { delimiter, dirname, resolve as resolvePath, sep } from 'path';
import { promisify } from 'util';
import * as which from 'which';

export const readFileAsync = promisify(readFile);
export const writeFileAsync = promisify(writeFile);
export const existsAsync = promisify(exists);
export const mkdirAsync = promisify(mkdir);
export const whichAsync = promisify(which);

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

export async function ensureDirectory(dir: string) {
  dir = resolvePath(dir);
  const fragments = dir.split(sep);
  let joint = fragments[0];
  for(let i = 1; i < fragments.length; i++) {
    joint = resolvePath(joint, fragments[i]);
    if(!await existsAsync(joint))
      await mkdirAsync(joint);
  }
}
