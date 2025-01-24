const amqp = require('amqplib');
const logger = require('./logger');

let connection = null
let channel = null

const EXCHANGE_NAME = 'post-exchange'

async function connectRabbitMQ() {
    try {
        connection = await amqp.connect(process.env.RABBITMQ_URL)
        channel = await connection.createChannel()

        await channel.assertExchange(EXCHANGE_NAME, 'topic', { durable: false })
        logger.info('Connected to RabbitMQ')
        return channel
    } catch (error) {
        logger.error('Failed to connect to RabbitMQ')
    }
}

async function publishEvent(routingKey, message) {
    if(!channel) {
        await connectRabbitMQ()
    }

    channel.publish(EXCHANGE_NAME, routingKey, Buffer.from(JSON.stringify(message)))
    logger.info(`Event published to RabbitMQ: ${routingKey}`)
}

module.exports = {
    connectRabbitMQ,
    publishEvent
}
