declare module 'set-cookie-parser' {
  export interface CookieOptions {
    name: string;
    value: string;
    path?: string;
    expires?: Date;
    maxAge?: number;
    domain?: string;
    secure?: boolean;
    httpOnly?: boolean;
    sameSite?: 'strict' | 'lax' | 'none' | boolean;
  }

  export interface ParseOptions {
    decode?: (value: string) => string;
    map?: boolean;
  }

  export function parse(cookieHeader: string, options?: ParseOptions): CookieOptions[];
  export function parseString(cookieString: string, options?: ParseOptions): CookieOptions;
  export function splitCookiesString(cookiesString: string): string[];
}
