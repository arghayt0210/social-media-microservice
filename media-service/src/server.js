require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const logger = require('./utils/logger');
const mediaRoutes = require('./routes/media-routes');
const errorHandler = require('./middleware/errorHandler');
const { connectRabbitMQ, consumeEvent } = require('./utils/rabbitmq');
const { handlePostDeleted } = require('./eventHandlers/media-event-handlers');

const app = express();

const PORT = process.env.PORT || 3003;

// connect to database
mongoose.connect(process.env.MONGODB_URI)
.then(() => {
    logger.info('Connected to MongoDB');
})
.catch((err) => {
    logger.error('MongoDB connection error:', err);
});

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
app.use('/api/media', mediaRoutes);

app.use(errorHandler);

async function startServer() {
    try {
        await connectRabbitMQ()

        // consume all the events
        await consumeEvent('post.deleted', handlePostDeleted)

        app.listen(PORT, () => {
            logger.info(`Media service is running on port ${PORT}`);
        });
    } catch (error) {
        logger.error('Failed to start server', error);
    }
}

startServer()

