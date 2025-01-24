const mongoose = require("mongoose")

const searchPostSchema = new mongoose.Schema({
    postId: {
        type: String,
        required: true,
        unique: true
    },
    userId: {
        type: String,
        required: true,
        unique: true
    },
    content: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now,
        required: true
    }
}, { timestamps: true })

searchPostSchema.index({ content: 'text' })
searchPostSchema.index({createdAt: -1})

const Search = mongoose.model('SearchPost', searchPostSchema)

module.exports = Search