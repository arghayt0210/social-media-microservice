const Post = require("../models/Post");
const logger = require("../utils/logger");
const { publishEvent } = require("../utils/rabbitmq");
const { validateCreatePost } = require("../utils/validation");

async function invalidatePostCache(req, input) {
    const cacheKey = `post:${input}`;
    await req.redisClient.del(cacheKey);
    const keys = await req.redisClient.keys(`posts:*`);
    if(keys.length > 0) {
        await req.redisClient.del(keys);
    }
}

const createPost = async (req, res) => {
    logger.info('Create post endpoint hit');
    try {
        const { error } = validateCreatePost(req.body);
        if(error) {
            logger.warn('Invalid post data', error);
            return res.status(400).json({success: false, message: error.details[0].message});
        }
        const { content, mediaIds } = req.body;
        const newlyCreatedPost = new Post({
            user: req.user.userId,
            content,
            mediaIds: mediaIds || []
        })

        await newlyCreatedPost.save();

        await publishEvent('post.created', {
            postId: newlyCreatedPost._id.toString(),
            userId: newlyCreatedPost.user.toString(),
            content: newlyCreatedPost.content,
            createdAt: newlyCreatedPost.createdAt
        });
        await invalidatePostCache(req, newlyCreatedPost._id.toString());
        logger.info('Post created successfully', newlyCreatedPost);
        res.status(201).json({
            success: true,
            message: 'Post created successfully',
            post: newlyCreatedPost
        });

    } catch (error) {
        logger.error('Error creating post', error);
        res.status(500).json({success: false, message: 'Internal server error'});
    }
}

const getPosts = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const startIndex = (page - 1) * limit;

        const cacheKey = `posts:${page}:${limit}`;
        const cachedPosts = await req.redisClient.get(cacheKey);

        if(cachedPosts) {
            return res.status(200).json({
                success: true, 
                message: 'Posts fetched from cache', 
                data: JSON.parse(cachedPosts)
            });
        }

        const posts = await Post
        .find({})
        .sort({createdAt: -1})
        .skip(startIndex)
        .limit(limit)


        const total = await Post.countDocuments();

        const result = {
            posts,
            total,
            page,
            limit
        }

        // save post in redis cache
        await req.redisClient.setex(cacheKey, 300, JSON.stringify(result));

        res.status(200).json({
            success: true, 
            message: 'Posts fetched from database', 
            data: result
        });


    } catch (error) {
        logger.error('Error getting posts', error);
        res.status(500).json({success: false, message: 'Internal server error'});
    }
}

const getPostById = async (req, res) => {
    try {
        const postId = req.params.id;
        const cacheKey = `post:${postId}`;
        const cachedPost = await req.redisClient.get(cacheKey);
        if(cachedPost) {
            return res.status(200).json({
                success: true, 
                message: 'Post fetched from cache', 
                data: JSON.parse(cachedPost)
            });
        }

        const post = await Post.findById(postId);
        if(!post) {
            return res.status(404).json({success: false, message: 'Post not found'});
        }

        await req.redisClient.setex(cacheKey, 3600, JSON.stringify(post));
        res.status(200).json({success: true, message: 'Post fetched from database', data: post});

    } catch (error) {
        logger.error('Error getting post by id', error);
        res.status(500).json({success: false, message: 'Internal server error'});
    }
}

const deletePost = async (req, res) => {
    try {
        const postId = req.params.id;
        const post = await Post.findOneAndDelete({
            _id: postId,
            user: req.user.userId
        });
        if(!post) {
            return res.status(404).json({success: false, message: 'Post not found'});
        }

        // publish post deleted event
        await publishEvent('post.deleted', {
            postId: post._id.toString(),
            userId: req.user.userId,
            mediaIds: post.mediaIds
        });

        await invalidatePostCache(req, postId);
        res.status(200).json({success: true, message: 'Post deleted successfully'});
    } catch (error) {
        logger.error('Error deleting post', error);
        res.status(500).json({success: false, message: 'Internal server error'});
    }
}

module.exports = {
    createPost,
    getPosts,
    getPostById,
    deletePost
}
