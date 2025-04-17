// Browser-compatible shim for net module
export default {
  Socket: class Socket {
    constructor() {
      throw new Error('net.Socket is not supported in browser environment');
    }
  },
  connect: () => {
    throw new Error('net.connect is not supported in browser environment');
  }
}; 