// ANSI color helpers
const c = {
  reset:  '\x1b[0m',
  dim:    '\x1b[2m',
  bold:   '\x1b[1m',
  green:  '\x1b[32m',
  yellow: '\x1b[33m',
  red:    '\x1b[31m',
  cyan:   '\x1b[36m',
  gray:   '\x1b[90m',
};

type LogLevel = 'info' | 'warn' | 'error';

function timestamp(): string {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  return `${c.gray}${hh}:${mm}:${ss}${c.reset}`;
}

function levelTag(level: LogLevel): string {
  if (level === 'error') return `${c.bold}${c.red} ERR${c.reset}`;
  if (level === 'warn')  return `${c.bold}${c.yellow}WARN${c.reset}`;
  return `${c.bold}${c.green}INFO${c.reset}`;
}

function moduleTag(module: string): string {
  return `${c.cyan}${module}${c.reset}`;
}

function format(level: LogLevel, module: string, message: string) {
  return `${timestamp()} ${levelTag(level)} ${c.dim}[${moduleTag(module)}${c.dim}]${c.reset} ${message}`;
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
