export function notFound(_req, res) {
    res.status(404).json({ error: true, message: 'Route not found' });
}
