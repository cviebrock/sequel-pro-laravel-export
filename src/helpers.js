import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';

/**
 * https://stackoverflow.com/a/37949642/1327340
 */
export const str_replace = (findArray, replaceArray, str) => {
  const regex = [],
    map = {};
  for (let i = 0; i < findArray.length; i++) {
    regex.push(findArray[i].replace(/([-[\]{}()*+?.\\^$|#,])/g, '\\$1'));
    map[findArray[i]] = replaceArray[i];
  }
  regex = regex.join('|');
  str = str.replace(new RegExp(regex, 'g'), function (matched) {
    return map[matched];
  });
  return str;
};

export const file_get_contents = (path) => {
  return readFileSync(path).toString();
};

export const file = (path) => {
  return file_get_contents(path).split('\n');
};

export const ucfirst = (str) => {
  return str.substr(0, 1).toUpperCase() + str.substr(1);
};

export const ucwords = (str) => {
  return str
    .split(' ')
    .map((w) => ucfirst(w))
    .join(' ');
};

export const studly = (str) => {
  const value = ucwords(str_replace(['-', '_'], ' ', str));

  return str_replace(' ', '', value);
};

export const removeEmpty = (o) => !!o;

export const method_exists = (object, methodName) => {
  return object != null && typeof object[methodName] === 'function';
};

/**
 * https://stackoverflow.com/a/13735363/1327340
 */
export const pbcopy = (data) => {
  const proc = spawn('pbcopy');
  proc.stdin.write(data);
  proc.stdin.end();
};

export const to_array = (data) => (typeof data === 'array' ? data : [data]);

export const is_numeric = (data) => data === 0 || isFinite(data);

export const addslashes = (str) => {
  return (str + '').replace(/([\\"'])/g, '\\$1').replace(/\0/g, '\\0');
};
