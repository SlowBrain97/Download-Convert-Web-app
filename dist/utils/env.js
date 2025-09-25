export function env(key, defaultValue) {
    const value = process.env[key] ?? defaultValue;
    if (value === undefined) {
        throw new Error(`Missing required env var: ${key}`);
    }
    return value;
}
