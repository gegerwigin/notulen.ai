// Browser-compatible shim for tls module
export default {
  connect: () => {
    throw new Error('tls.connect is not supported in browser environment');
  },
  TLSSocket: class TLSSocket {
    constructor() {
      throw new Error('tls.TLSSocket is not supported in browser environment');
    }
  }
}; 