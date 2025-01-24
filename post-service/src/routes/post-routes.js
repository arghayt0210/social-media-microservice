const express = require('express');
const { createPost, getPosts, getPostById, deletePost } = require('../controllers/post-controller');

// middleware -> auth
const authenticateRequest = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authenticateRequest);

router.post('/create-post', createPost);
router.get('/all-posts', getPosts);
router.get('/:id', getPostById);
router.delete('/:id', deletePost);
module.exports = router;
