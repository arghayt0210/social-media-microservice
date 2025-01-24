const express = require('express');
const multer = require('multer');
const { uploadMedia, getAllMedia } = require('../controllers/media-controller');
const authenticateRequest = require('../middleware/authMiddleware');
const logger = require('../utils/logger');

const router = express.Router();

// configure multer for file upload
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB
    }
}).single('file');

router.post(
    '/upload', 
    authenticateRequest,
    (req, res, next) => {
        upload(req, res, function(err) {
            if(err instanceof multer.MulterError) {
                logger.error('Multer error file upload', err);
            return res.status(400).json({message: 'Multer error file upload', error: err.message, stack: err.stack});
        } else if(err) {
            logger.error('Unknown error file upload', err);
            return res.status(500).json({message: 'Unknown error file upload', error: err.message, stack: err.stack});
        }

        if(!req.file) {
            logger.warn('No file uploaded');
            return res.status(400).json({message: 'No file uploaded'});
        }

        next();
    })
}, uploadMedia);

router.get('/get', authenticateRequest, getAllMedia);

module.exports = router;

