import winston from "winston";

const { combine, timestamp, printf, colorize, json } = winston.format;

// Standard log format for development
const devFormat = combine(
  colorize(),
  timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  printf(({ level, message, timestamp, reqId, ...metadata }) => {
    let msg = `${timestamp} [${level}]`;
    if (reqId) msg += ` [ReqID: ${reqId}]`;
    msg += `: ${message}`;
    if (Object.keys(metadata).length > 0) {
      msg += ` ${JSON.stringify(metadata)}`;
    }
    return msg;
  })
);

// Structured JSON format for production (e.g. for Datadog, ELK, etc.)
const prodFormat = combine(
  timestamp(),
  json()
);

export const logger = winston.createLogger({
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
  format: process.env.NODE_ENV === "production" ? prodFormat : devFormat,
  transports: [
    new winston.transports.Console()
  ],
});
