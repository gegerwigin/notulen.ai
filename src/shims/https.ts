// Browser-compatible shim for https module
export default {
  Agent: class Agent {
    constructor() {
      // No-op in browser
    }
  },
  request: () => {
    throw new Error('https.request is not supported in browser environment');
  },
  get: () => {
    throw new Error('https.get is not supported in browser environment');
  }
}; 