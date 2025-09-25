export function initSSE(res) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();
}
export function sendSSE(res, event, data) {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
}
export function keepAlive(res) {
    const iv = setInterval(() => {
        try {
            res.write(`: keep-alive\n\n`);
        }
        catch {
            clearInterval(iv);
        }
    }, 15000);
    return () => clearInterval(iv);
}
