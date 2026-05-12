function write(level, message, context) {
    const payload = {
        ts: new Date().toISOString(),
        level,
        message,
        ...(context ? { context } : {})
    };
    const serialized = JSON.stringify(payload);
    if (level === "error") {
        console.error(serialized);
        return;
    }
    console.log(serialized);
}
export const logger = {
    info(message, context) {
        write("info", message, context);
    },
    warn(message, context) {
        write("warn", message, context);
    },
    error(message, context) {
        write("error", message, context);
    }
};
