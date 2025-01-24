const logger = require("../utils/logger");

const authenticateRequest = (req, res, next) => {
    const userId = req.headers['x-user-id'];

    if(!userId) {
        logger.warn('Access denied. User ID is missing');
        return res.status(401).json({success: false, message: 'Access denied.'});
    }

    req.user = { userId };
    next();
}

module.exports = authenticateRequest;
