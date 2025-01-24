require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const helmet = require('helmet');
const cors = require('cors');
const {RateLimiterRedis} =require('rate-limiter-flexible')
const Redis = require('ioredis')
const {rateLimit} = require('express-rate-limit')
const {RedisStore} = require('rate-limit-redis')
const logger = require('./utils/logger');
const routes = require('./routes/identity-service');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3001;

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

// DDos protection and rate limiting
const rateLimiter = new RateLimiterRedis({
    storeClient: redisClient,
    keyPrefix: 'middleware',
    points: 10,
    duration: 1, // 10 requests per second
});

app.use(async (req, res, next) => {
    rateLimiter.consume(req.ip).then(() => {
        next();
    }).catch((err) => {
        logger.warn(`Too many requests from ${req.ip}`);
        res.status(429).json({
            success: false,
            message: "Too many requests, please try again later.",
        });
    });
});

// IP based rate limiting for sensitive endpoints
const sensitiveEndpointsRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // 50 requests per 15 minutes
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res, next) => {
        logger.warn(`Too many requests from ${req.ip}`);
        res.status(429).json({
            success: false,
            message: "Too many requests, please try again later.",
        });
    },
    store: new RedisStore({
        sendCommand: (...args) => redisClient.call(...args),
    }),
});


// apply sensitive endpoints rate limiting to all routes
app.use('/api/auth/register', sensitiveEndpointsRateLimiter)

// Routes
app.use('/api/auth', routes);

// error handling middleware
app.use(errorHandler)



// start server
app.listen(PORT, () => {
    logger.info(`Server is running on port ${PORT}`);
});

// unhandled promise rejection
process.on('unhandledRejection', (reason, promise) => {
    logger.error(`Unhandled promise rejection: ${reason}`);
    logger.error(`Promise: ${promise}`);
    process.exit(1);
});

// uncaught exception
process.on('uncaughtException', (err) => {
    logger.error(`Uncaught exception: ${err.message}`);
    logger.error(err.stack);
    process.exit(1);
});

