type LogLevel = 'info' | 'warn' | 'error';

function format(level: LogLevel, module: string, message: string) {
  const ts = new Date().toISOString();
  const levelTag = level === 'error' ? 'ERROR' : level === 'warn' ? 'WARN' : 'INFO';
  return `[${ts}] [${levelTag.padEnd(5)}] [${module}] ${message}`;
}

export function info(module: string, message: string) {
  console.log(format('info', module, message));
}

export function warn(module: string, message: string) {
  console.warn(format('warn', module, message));
}

export function error(module: string, message: string, context?: unknown) {
  const formatted = format('error', module, message);
  if (context !== undefined) {
    console.error(formatted, context);
  } else {
    console.error(formatted);
  }
}

export function taskLog(taskId: string, message: string) {
  info(`task:${taskId}`, message);
}
