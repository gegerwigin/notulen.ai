/**
 * Cookie shim to provide parse and serialize functions
 * This is a replacement for the 'cookie' module that might be causing issues
 */

/**
 * Parse a cookie string into an object
 * @param {string} str - Cookie string to parse
 * @returns {object} Parsed cookie object
 */
export function parse(str: string): Record<string, string> {
  if (typeof str !== 'string') {
    throw new TypeError('Cookie string must be provided');
  }
  
  const obj: Record<string, string> = {};
  const pairs = str.split(/; */);
  
  if (!pairs[0]) {
    return obj;
  }
  
  for (let i = 0; i < pairs.length; i++) {
    const pair = pairs[i];
    let eqIdx = pair.indexOf('=');
    
    // Skip things that don't look like key=value
    if (eqIdx < 0) {
      continue;
    }
    
    const key = pair.substr(0, eqIdx).trim();
    let val = pair.substr(++eqIdx, pair.length).trim();
    
    // Quoted values
    if (val[0] === '"') {
      val = val.slice(1, -1);
    }
    
    // Only assign if not already assigned
    if (obj[key] === undefined) {
      try {
        obj[key] = decodeURIComponent(val);
      } catch (e) {
        obj[key] = val;
      }
    }
  }
  
  return obj;
}

/**
 * Serialize a cookie name-value pair into a string
 * @param {string} name - Cookie name
 * @param {string} value - Cookie value
 * @param {object} options - Cookie options
 * @returns {string} Serialized cookie string
 */
export function serialize(name: string, value: string, options?: any): string {
  const opt = options || {};
  const enc = opt.encode || encodeURIComponent;
  
  if (typeof enc !== 'function') {
    throw new TypeError('option encode is invalid');
  }
  
  if (!fieldContentRegExp.test(name)) {
    throw new TypeError('argument name is invalid');
  }
  
  const encodedValue = enc(value);
  
  if (encodedValue && !fieldContentRegExp.test(encodedValue)) {
    throw new TypeError('argument val is invalid');
  }
  
  let str = name + '=' + encodedValue;
  
  if (opt.maxAge != null) {
    const maxAge = opt.maxAge - 0;
    if (isNaN(maxAge) || !isFinite(maxAge)) {
      throw new TypeError('option maxAge is invalid');
    }
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
    const sameSite = typeof opt.sameSite === 'string'
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

// Regular expression for validating cookie field content
const fieldContentRegExp = /^[\u0009\u0020-\u007e\u0080-\u00ff]+$/;

// Default export to match cookie package structure
export default {
  parse,
  serialize
};
