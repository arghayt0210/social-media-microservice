const Media = require("../models/Media")
const { deleteMediaFromCloudinary } = require("../utils/cloudinary")
const logger = require("../utils/logger")

const handlePostDeleted = async (event) => {
    console.log('post deleted event', event)

    const { postId, userId, mediaIds } = event

    try {
        const mediaToDelete = await Media.find({ _id: { $in: mediaIds } })

        if(mediaToDelete.length === 0) {
            logger.info('No media found to delete')
            return
        }

        for(const media of mediaToDelete) {
           
            await deleteMediaFromCloudinary(media.publicId)
            await Media.findByIdAndDelete(media._id)

            logger.info(`Deleted media ${media.publicId} for post ${postId}`)
        }

        logger.info(`Processed deletion of media for post ${postId}`)
    } catch (error) {
        logger.error('Error handling post deleted event', error)
    }

}

module.exports = {
    handlePostDeleted
}