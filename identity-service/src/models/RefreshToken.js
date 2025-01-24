const mongoose = require("mongoose");

const refreshTokenSchema = new mongoose.Schema({
    token: {
        type: String,
        required: true,
        unique: true,
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    expiresAt: {
        type: Date,
        required: true,
    },
}, {
    timestamps: true,
})

// MongoDB will automatically delete refresh tokens when their expiresAt time is reached
// This helps keep your database clean by removing expired tokens
refreshTokenSchema.index({expiresAt: 1}, {expireAfterSeconds: 0});

// First argument {expiresAt: 1}:
// Creates an index on the expiresAt field
// The 1 indicates ascending order for the index
// Second argument {expireAfterSeconds: 0}:
// This makes it a TTL index
// expireAfterSeconds: 0 means MongoDB will remove documents as soon as their expiresAt timestamp is reached
// The value 0 means there's no additional delay beyond the expiresAt time

const RefreshToken = mongoose.model("RefreshToken", refreshTokenSchema);

module.exports = RefreshToken;

