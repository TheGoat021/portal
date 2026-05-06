type Context = Record<string, unknown>

function write(level: string, message: string, context?: Context) {
  const payload = {
    ts: new Date().toISOString(),
    level,
    message,
    ...(context ? { context } : {})
  }

  const serialized = JSON.stringify(payload)

  if (level === "error") {
    console.error(serialized)
    return
  }

  console.log(serialized)
}

export const logger = {
  info(message: string, context?: Context) {
    write("info", message, context)
  },
  warn(message: string, context?: Context) {
    write("warn", message, context)
  },
  error(message: string, context?: Context) {
    write("error", message, context)
  }
}
