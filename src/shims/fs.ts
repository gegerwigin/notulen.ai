// Browser-compatible shim for fs module
export default {
  readFile: () => {
    throw new Error('fs.readFile is not supported in browser environment');
  },
  writeFile: () => {
    throw new Error('fs.writeFile is not supported in browser environment');
  }
}; 