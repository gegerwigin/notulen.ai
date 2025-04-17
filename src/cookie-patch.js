// cookie-patch.js
// This file provides the parse and serialize functions that might be missing from the cookie module

// Simple cookie parser implementation
function parse(str) {
  const obj = {};
  if (typeof str !== 'string' || !str) return obj;
  
  const pairs = str.split(/; */);
  for (let i = 0; i < pairs.length; i++) {
    const pair = pairs[i];
    let eqIdx = pair.indexOf('=');
    
    // Skip things that don't look like key=value
    if (eqIdx < 0) continue;
    
    const key = pair.substr(0, eqIdx).trim();
    let val = pair.substr(++eqIdx, pair.length).trim();
    
    // Quoted values
    if (val[0] === '"') val = val.slice(1, -1);
    
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

// Simple cookie serializer implementation
function serialize(name, value, options) {
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

// Export the functions
export { parse, serialize };
export default { parse, serialize };
