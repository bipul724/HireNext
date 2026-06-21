function formatLog(level, args) {
  const message = args.map(arg => (typeof arg === 'object' ? JSON.stringify(arg) : arg)).join(' ');
  return JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    service: 'ws-server',
    message
  });
}

export const logger = {
  info: (...args) => console.log(formatLog('INFO', args)),
  warn: (...args) => console.warn(formatLog('WARN', args)),
  error: (...args) => console.error(formatLog('ERROR', args)),
};
