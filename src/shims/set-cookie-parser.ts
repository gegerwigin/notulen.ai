/**
 * Shim untuk set-cookie-parser
 * Menyediakan implementasi lengkap untuk modul set-cookie-parser
 */

// Implementasi splitCookiesString
export function splitCookiesString(cookiesString: string): string[] {
  if (!cookiesString) return [];
  
  var cookiesStrings = [];
  var pos = 0;
  var start;
  var ch;
  var lastComma;
  var nextStart;
  var cookiesSeparatorFound;

  function skipWhitespace() {
    while (pos < cookiesString.length && /\s/.test(cookiesString.charAt(pos))) {
      pos += 1;
    }
    return pos < cookiesString.length;
  }

  function notSpecialChar() {
    ch = cookiesString.charAt(pos);
    return ch !== '=' && ch !== ';' && ch !== ',';
  }

  while (pos < cookiesString.length) {
    start = pos;
    cookiesSeparatorFound = false;

    while (skipWhitespace()) {
      ch = cookiesString.charAt(pos);
      if (ch === ',') {
        // ',' is a cookie separator if we have later first '=', not ';' or ','
        lastComma = pos;
        pos += 1;

        skipWhitespace();
        nextStart = pos;

        while (pos < cookiesString.length && notSpecialChar()) {
          pos += 1;
        }

        // currently special character
        if (pos < cookiesString.length && cookiesString.charAt(pos) === '=') {
          // we found cookies separator
          cookiesSeparatorFound = true;
          // pos is inside the next cookie, so back up and return it.
          pos = nextStart;
          cookiesStrings.push(cookiesString.substring(start, lastComma));
          start = pos;
        } else {
          // in param ',' or param separator ';'
          pos = lastComma + 1;
        }
      } else {
        pos += 1;
      }
    }

    if (!cookiesSeparatorFound || pos >= cookiesString.length) {
      cookiesStrings.push(cookiesString.substring(start, cookiesString.length));
    }
  }

  return cookiesStrings;
}

// Implementasi parseString
export function parseString(cookieString: string, options?: any): any {
  if (!cookieString) {
    return {};
  }

  const parts = cookieString.split(';').filter(Boolean);
  const nameValue = parts.shift()?.split('=') || [];
  const name = nameValue[0]?.trim();
  const value = nameValue[1]?.trim();

  if (!name) return {};

  const cookie: any = {
    name,
    value: value || ''
  };

  parts.forEach(part => {
    const sides = part.split('=');
    const key = sides[0]?.trim().toLowerCase();
    const value = sides[1]?.trim();

    if (key === 'expires') {
      cookie.expires = new Date(value);
    } else if (key === 'max-age') {
      cookie.maxAge = parseInt(value, 10);
    } else if (key === 'secure') {
      cookie.secure = true;
    } else if (key === 'httponly') {
      cookie.httpOnly = true;
    } else if (key === 'samesite') {
      cookie.sameSite = value || true;
    } else if (key && value) {
      cookie[key] = value;
    }
  });

  return cookie;
}

// Implementasi parse
export function parse(cookieHeader: string, options?: any): any[] {
  if (!cookieHeader) {
    return [];
  }

  const cookieStrings = splitCookiesString(cookieHeader);
  const cookies = cookieStrings.map(cookieString => parseString(cookieString, options));

  return cookies;
}

// Default export
export default {
  parse,
  parseString,
  splitCookiesString
};
