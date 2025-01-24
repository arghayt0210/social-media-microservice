const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

const validateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if(!token) {
        logger.warn('Access denied. Token is missing');
        return res.status(401).json({success: false, message: 'Access denied.'});
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if(err) {
            logger.warn('Access denied. Invalid token');
            return res.status(401).json({success: false, message: 'Access denied.'});
        }
        req.user = decoded;
        next();
    });
}

module.exports = {validateToken};
