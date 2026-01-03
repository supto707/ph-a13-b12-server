/**
 * Global Error Handling Middleware
 * Standardizes error responses across the API.
 */
const errorHandler = (err, req, res, next) => {
    console.error(`[Error] ${req.method} ${req.url}`);
    console.error(err.stack);

    const statusCode = err.status || 500;
    const message = err.message || 'Internal Server Error';

    res.status(statusCode).json({
        error: message,
        details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
};

module.exports = errorHandler;
