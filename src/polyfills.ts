// Polyfills for Node.js modules in browser environment
import { Buffer } from 'buffer';
import process from 'process';

// Make sure we have required globals
if (typeof global === 'undefined') {
  (window as any).global = window;
}

// Initialize process if needed
if (typeof process === 'undefined') {
  (window as any).process = {
    env: import.meta.env,
    browser: true,
    version: '',
    platform: 'browser'
  };
}

// Initialize Buffer if needed
if (typeof Buffer === 'undefined') {
  (window as any).Buffer = Buffer;
}

// Extend Window interface
declare global {
  interface Window {
    Buffer: typeof Buffer;
    process: typeof process;
    global: Window;
    module?: any;
    require?: any;
  }
}

// CommonJS module compatibility
if (typeof window.module === 'undefined') {
  const moduleProxy = {
    exports: {},
    get(target: any, prop: string) {
      if (prop === 'exports') return target.exports;
      return undefined;
    },
    set(target: any, prop: string, value: any) {
      if (prop === 'exports') target.exports = value;
      return true;
    }
  };

  window.module = new Proxy({ exports: {} }, moduleProxy);
}

if (typeof window.require === 'undefined') {
  window.require = (id: string) => {
    // Handle common Node.js modules
    switch (id) {
      case 'buffer':
        return { Buffer };
      case 'process':
        return process;
      default:
        console.warn(`require('${id}') is not supported in browser environment`);
        return {};
    }
  };
}
