export function logInfo(event, context) {
  process.stdout.write(
    JSON.stringify({ level: 'info', event, ts: new Date().toISOString(), ...context }) + '\n'
  );
}

export function logError(event, context) {
  process.stderr.write(
    JSON.stringify({ level: 'error', event, ts: new Date().toISOString(), ...context }) + '\n'
  );
}
