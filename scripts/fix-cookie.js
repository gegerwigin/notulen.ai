// fix-cookie.js
// Script untuk memperbaiki masalah dengan modul cookie setelah instalasi

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('Menjalankan script perbaikan cookie...');

// Lokasi modul cookie di dalam node_modules react-router
const reactRouterCookiePath = path.resolve(__dirname, '../node_modules/react-router/node_modules/cookie/dist/index.js');

// Implementasi cookie yang benar dengan fungsi parse dan serialize
const cookieImplementation = `
// Cookie module implementation with parse and serialize functions
'use strict';

/**
 * Module exports.
 * @public
 */

exports.parse = parse;
exports.serialize = serialize;

/**
 * Module variables.
 * @private
 */

var decode = decodeURIComponent;
var encode = encodeURIComponent;
var pairSplitRegExp = /; */;

/**
 * RegExp to match field-content in RFC 7230 sec 3.2
 *
 * field-content = field-vchar [ 1*( SP / HTAB ) field-vchar ]
 * field-vchar   = VCHAR / obs-text
 * obs-text      = %x80-FF
 */

var fieldContentRegExp = /^[\\u0009\\u0020-\\u007e\\u0080-\\u00ff]+$/;

/**
 * Parse a cookie header.
 *
 * Parse the given cookie header string into an object
 * The object has the various cookies as keys(names) => values
 *
 * @param {string} str
 * @param {object} [options]
 * @return {object}
 * @public
 */

function parse(str, options) {
  if (typeof str !== 'string') {
    throw new TypeError('argument str must be a string');
  }

  var obj = {}
  var opt = options || {};
  var pairs = str.split(pairSplitRegExp);
  var dec = opt.decode || decode;

  for (var i = 0; i < pairs.length; i++) {
    var pair = pairs[i];
    var eq_idx = pair.indexOf('=');

    // skip things that don't look like key=value
    if (eq_idx < 0) {
      continue;
    }

    var key = pair.substr(0, eq_idx).trim()
    var val = pair.substr(++eq_idx, pair.length).trim();

    // quoted values
    if ('"' == val[0]) {
      val = val.slice(1, -1);
    }

    // only assign once
    if (undefined == obj[key]) {
      obj[key] = tryDecode(val, dec);
    }
  }

  return obj;
}

/**
 * Serialize data into a cookie header.
 *
 * Serialize the a name value pair into a cookie string suitable for
 * http headers. An optional options object specified cookie parameters.
 *
 * serialize('foo', 'bar', { httpOnly: true })
 *   => "foo=bar; httpOnly"
 *
 * @param {string} name
 * @param {string} val
 * @param {object} [options]
 * @return {string}
 * @public
 */

function serialize(name, val, options) {
  var opt = options || {};
  var enc = opt.encode || encode;

  if (typeof enc !== 'function') {
    throw new TypeError('option encode is invalid');
  }

  if (!fieldContentRegExp.test(name)) {
    throw new TypeError('argument name is invalid');
  }

  var value = enc(val);

  if (value && !fieldContentRegExp.test(value)) {
    throw new TypeError('argument val is invalid');
  }

  var str = name + '=' + value;

  if (null != opt.maxAge) {
    var maxAge = opt.maxAge - 0;
    if (isNaN(maxAge)) throw new Error('maxAge should be a Number');
    str += '; Max-Age=' + Math.floor(maxAge);
  }

  if (opt.domain) {
    if (!fieldContentRegExp.test(opt.domain)) {
      throw new TypeError('option domain is invalid');
    }

    str += '; Domain=' + opt.domain;
  }

  if (opt.path) {
    if (!fieldContentRegExp.test(opt.path)) {
      throw new TypeError('option path is invalid');
    }

    str += '; Path=' + opt.path;
  }

  if (opt.expires) {
    if (typeof opt.expires.toUTCString !== 'function') {
      throw new TypeError('option expires is invalid');
    }

    str += '; Expires=' + opt.expires.toUTCString();
  }

  if (opt.httpOnly) {
    str += '; HttpOnly';
  }

  if (opt.secure) {
    str += '; Secure';
  }

  if (opt.sameSite) {
    var sameSite = typeof opt.sameSite === 'string'
      ? opt.sameSite.toLowerCase() : opt.sameSite;

    switch (sameSite) {
      case true:
        str += '; SameSite=Strict';
        break;
      case 'lax':
        str += '; SameSite=Lax';
        break;
      case 'strict':
        str += '; SameSite=Strict';
        break;
      case 'none':
        str += '; SameSite=None';
        break;
      default:
        throw new TypeError('option sameSite is invalid');
    }
  }

  return str;
}

/**
 * Try decoding a string using a decoding function.
 *
 * @param {string} str
 * @param {function} decode
 * @private
 */

function tryDecode(str, decode) {
  try {
    return decode(str);
  } catch (e) {
    return str;
  }
}

// Default export for ES modules
exports.default = {
  parse: parse,
  serialize: serialize
};
`;

// Cek apakah direktori scripts ada, jika tidak, buat
const scriptsDir = path.resolve(__dirname, '../scripts');
if (!fs.existsSync(scriptsDir)) {
  fs.mkdirSync(scriptsDir, { recursive: true });
}

// Cek apakah file cookie di react-router ada
try {
  if (fs.existsSync(reactRouterCookiePath)) {
    // Backup file asli
    const backupPath = reactRouterCookiePath + '.backup';
    if (!fs.existsSync(backupPath)) {
      fs.copyFileSync(reactRouterCookiePath, backupPath);
      console.log(`File asli dicadangkan ke: ${backupPath}`);
    }
    
    // Tulis implementasi baru
    fs.writeFileSync(reactRouterCookiePath, cookieImplementation);
    console.log(`Berhasil memperbaiki modul cookie di: ${reactRouterCookiePath}`);
  } else {
    console.log(`File cookie tidak ditemukan di: ${reactRouterCookiePath}`);
    console.log('Mencari modul cookie di lokasi lain...');
    
    // Cari semua modul cookie di node_modules
    const nodeModulesPath = path.resolve(__dirname, '../node_modules');
    
    // Fungsi rekursif untuk mencari file cookie
    function findCookieModules(dir, results = []) {
      const files = fs.readdirSync(dir);
      
      for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
          if (file === 'cookie' && fs.existsSync(path.join(filePath, 'dist/index.js'))) {
            results.push(path.join(filePath, 'dist/index.js'));
          } else if (file !== 'node_modules') { // Hindari rekursi ke dalam node_modules bersarang
            findCookieModules(filePath, results);
          }
        }
      }
      
      return results;
    }
    
    const cookieModules = findCookieModules(nodeModulesPath);
    
    if (cookieModules.length > 0) {
      console.log(`Ditemukan ${cookieModules.length} modul cookie:`);
      
      for (const modulePath of cookieModules) {
        console.log(`Memperbaiki: ${modulePath}`);
        
        // Backup file asli
        const backupPath = modulePath + '.backup';
        if (!fs.existsSync(backupPath)) {
          fs.copyFileSync(modulePath, backupPath);
        }
        
        // Tulis implementasi baru
        fs.writeFileSync(modulePath, cookieImplementation);
      }
      
      console.log('Semua modul cookie berhasil diperbaiki.');
    } else {
      console.log('Tidak ditemukan modul cookie.');
    }
  }
} catch (error) {
  console.error('Terjadi kesalahan:', error);
}

console.log('Script perbaikan cookie selesai.');
