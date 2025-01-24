const Search = require("../models/Search")
const logger = require("../utils/logger")

const handlePostCreated = async (post) => {
    try {
        const { postId, userId, content, createdAt } = post
        const newSearchPost = new Search({
            postId,
            userId,
            content,
            createdAt
        })

        await newSearchPost.save()
        logger.info(`Search post created for post ${postId}`)
    } catch (error) {
       logger.error('Error in handlePostCreated', error)
       throw error
    }
}

module.exports = { handlePostCreated }