const logger = {
  info: (message, data = {}) => {
    console.log(JSON.stringify({
      level: 'INFO',
      timestamp: new Date().toISOString(),
      message,
      ...data
    }));
  },

  warn: (message, data = {}) => {
    console.warn(JSON.stringify({
      level: 'WARN',
      timestamp: new Date().toISOString(),
      message,
      ...data
    }));
  },

  error: (message, error = {}) => {
    console.error(JSON.stringify({
      level: 'ERROR',
      timestamp: new Date().toISOString(),
      message,
      error: error.message || error,
      stack: error.stack
    }));
  },

  webhook: (endpoint, payload) => {
    console.log(JSON.stringify({
      level: 'WEBHOOK',
      timestamp: new Date().toISOString(),
      endpoint,
      payload: JSON.stringify(payload).substring(0, 500) // Truncate large payloads
    }));
  }
};

module.exports = logger;
