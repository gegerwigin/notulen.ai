// Browser-compatible shim for path module
export default {
  join: (...args: string[]) => args.join('/'),
  resolve: (...args: string[]) => args.join('/'),
  dirname: (path: string) => {
    const parts = path.split('/');
    parts.pop();
    return parts.join('/');
  }
}; 