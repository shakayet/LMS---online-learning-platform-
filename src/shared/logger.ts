import path from 'path';
import DailyRotateFile from 'winston-daily-rotate-file';
import config from '../config';

const { createLogger, format, transports } = require('winston');
const { combine, timestamp, label, printf } = format;

const bdTime = (date = new Date()): string => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Dhaka',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  }).formatToParts(date);

  const get = (type: string) => parts.find(p => p.type === type)?.value || '';
  const yyyy = get('year');
  const mm = get('month');
  const dd = get('day');
  const hh = get('hour');
  const min = get('minute');
  const ss = get('second');
  const dayPeriod = get('dayPeriod');
  return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss} ${dayPeriod}`;
};

const myFormat = printf(
  ({ level, message, label, timestamp }: { level: string; message: string; label: string; timestamp: Date }) => {

    const ts = bdTime(new Date(timestamp));
    return `[${ts}] [${label}] ${level}: ${message}`;
  }
);

const baseTransports = [
  new transports.Console(),
  new DailyRotateFile({
    filename: path.join(process.cwd(), 'winston', 'success', '%DATE%-success.log'),
    datePattern: 'DD-MM-YYYY-HH',
    maxSize: '20m',
    maxFiles: '1d',
  }),
];

const errorTransports = [
  new transports.Console(),
  new DailyRotateFile({
    filename: path.join(process.cwd(), 'winston', 'error', '%DATE%-error.log'),
    datePattern: 'DD-MM-YYYY-HH',
    maxSize: '20m',
    maxFiles: '1d',
  }),
];

const logger = createLogger({
  level: config.node_env === 'development' ? 'debug' : 'info',
  format: combine(label({ label: 'Task Titans' }), timestamp(), myFormat),
  transports: baseTransports,
});

const errorLogger = createLogger({
  level: 'error',
  format: combine(label({ label: 'Task Titans' }), timestamp(), myFormat),
  transports: errorTransports,
});

export const notifyCritical = (title: string, message: string) => {
  if (config.node_env !== 'development') return;
  try {

    const notifier = require('node-notifier');
    notifier.notify({ title, message });
  } catch {

  }
};

export { errorLogger, logger };
