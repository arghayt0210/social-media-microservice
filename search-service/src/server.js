require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const Redis = require('ioredis');
const cors = require('cors');
const helmet = require('helmet');
const logger = require('./utils/logger');
const searchRoutes = require('./routes/search-routes');
const errorHandler = require('./middleware/errorHandler');
const { connectRabbitMQ, consumeEvent } = require('./utils/rabbitmq');
const { handlePostCreated } = require('./eventHandlers/search-event-handlers');

const app = express();

const PORT = process.env.PORT || 3004;

// connect to database
mongoose.connect(process.env.MONGODB_URI)
.then(() => {
    logger.info('Connected to MongoDB');
})
.catch((err) => {
    logger.error('MongoDB connection error:', err);
});

const redisClient = new Redis(process.env.REDIS_URL);

// middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
    logger.info(`Received ${req.method} request to ${req.url}`);
    logger.info(`Request body: ${JSON.stringify(req.body)}`);
    next();
});


// routes - pass redisclient to routes
app.use('/api/search', searchRoutes);

app.use(errorHandler);

async function startServer() {
    try {
        await connectRabbitMQ()
        await consumeEvent('post.created', handlePostCreated)
        app.listen(PORT, () => {
            logger.info(`Search service is running on port ${PORT}`);
        });
    } catch (error) {
        logger.error('Failed to start server', error)
        process.exit(1)
    }
}

startServer()

