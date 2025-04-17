// Browser-compatible shim for http module
export default {
  Agent: class Agent {
    constructor() {
      // No-op in browser
    }
  },
  request: () => {
    throw new Error('http.request is not supported in browser environment');
  },
  get: () => {
    throw new Error('http.get is not supported in browser environment');
  }
}; 