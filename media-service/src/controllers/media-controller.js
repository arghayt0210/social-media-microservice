const logger = require('../utils/logger');
const { uploadMediaToCloudinary } = require('../utils/cloudinary');
const Media = require('../models/Media');

const uploadMedia = async (req, res) => {
    logger.info('Uploading media...');
    try {
        if(!req.file) {
            logger.warn('No file uploaded');
            return res.status(400).json({message: 'No file uploaded'});
        }

        const {originalname, mimetype, buffer} = req.file;
        const userId = req.user.userId;

        logger.info(`File details: ${originalname}, ${mimetype}`);

        logger.info(`Uploading to Cloudinary started...`);
        const result = await uploadMediaToCloudinary(req.file);
        
        logger.info(`Upload to Cloudinary completed...Public ID: ${result.public_id}`);

        const newlyCreatedMedia = await Media.create({
            publicId: result.public_id,
            originalName: originalname,
            mimeType: mimetype,
            url: result.secure_url,
            userId
        });

        logger.info(`Media created successfully: ${newlyCreatedMedia._id}`);

        res.status(201).json({message: 'Media uploaded successfully', media: newlyCreatedMedia});
    } catch (error) {
        logger.error('Error uploading media', error);
        res.status(500).json({message: 'Internal server error'});
    }
}

const getAllMedia = async (req, res) => {
    try {
        const result = await Media.find({});
        res.status(200).json({message: 'Media fetched successfully', media: result});
    } catch (error) {
        logger.error('Error getting all media', error);
        res.status(500).json({message: 'Internal server error'});
    }
}

module.exports = {
    uploadMedia,
    getAllMedia
}