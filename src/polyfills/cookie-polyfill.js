// Simple cookie parser polyfill
// Provides basic functionality for cookie parsing in the browser

/**
 * Parse a cookie string into an object
 * @param {string} str - Cookie string to parse
 * @param {object} options - Options for parsing
 * @returns {object} Parsed cookie object
 */
export function parse(str, options) {
  if (typeof str !== 'string') {
    throw new TypeError('Cookie string must be provided');
  }
  
  const obj = {};
  const opt = options || {};
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
export function serialize(name, value, options) {
  const opt = options || {};
  
  if (!fieldContentRegExp.test(name)) {
    throw new TypeError('Cookie name must be a valid string');
  }
  
  const encodedValue = encodeURIComponent(value);
  
  if (encodedValue && !fieldContentRegExp.test(encodedValue)) {
    throw new TypeError('Cookie value must be a valid string');
  }
  
  let str = name + '=' + encodedValue;
  
  if (opt.maxAge != null) {
    const maxAge = opt.maxAge - 0;
    
    if (isNaN(maxAge) || !isFinite(maxAge)) {
      throw new TypeError('maxAge should be a valid number');
    }
    
    str += '; Max-Age=' + Math.floor(maxAge);
  }
  
  if (opt.domain) {
    if (!fieldContentRegExp.test(opt.domain)) {
      throw new TypeError('domain should be a valid string');
    }
    
    str += '; Domain=' + opt.domain;
  }
  
  if (opt.path) {
    if (!fieldContentRegExp.test(opt.path)) {
      throw new TypeError('path should be a valid string');
    }
    
    str += '; Path=' + opt.path;
  }
  
  if (opt.expires) {
    if (typeof opt.expires.toUTCString !== 'function') {
      throw new TypeError('expires should be a valid Date');
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
    const sameSite = typeof opt.sameSite === 'string' ? opt.sameSite.toLowerCase() : opt.sameSite;
    
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
        throw new TypeError('sameSite should be a boolean or string');
    }
  }
  
  return str;
}

// Regular expression for validating cookie field content
const fieldContentRegExp = /^[\u0009\u0020-\u007e\u0080-\u00ff]+$/;

// Default export
export default {
  parse,
  serialize
};
