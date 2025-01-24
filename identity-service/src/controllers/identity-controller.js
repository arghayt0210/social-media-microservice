const RefreshToken = require("../models/RefreshToken");
const User = require("../models/User");
const { generateTokens } = require("../utils/generateToken");
const logger = require("../utils/logger");
const { validateRegistration, validateLogin } = require("../utils/validation");

// user registration

const registerUser = async (req, res) => {
    logger.info('Registration endpoint hit...')
    try {
        // validate the request body
        const {error} = validateRegistration(req.body);
        if (error) {
            logger.warn('Validation error', error.details[0].message);
            return res.status(400).json({
                success: false,
                message: error.details[0].message,
            });
        }

        const {username, email, password} = req.body;

        let existingUser = await User.findOne({$or: [{username}, {email}]});
        if (existingUser) {
            logger.warn('User already exists', {username, email});
            return res.status(400).json({
                success: false,
                message: "User already exists",
            });
        }

        existingUser = new User({username, email, password});
        await existingUser.save();

        logger.info('User saved successfully', existingUser._id);

        const {accessToken, refreshToken} = await generateTokens(existingUser);

        res.status(201).json({
            success: true,
            message: "User registered successfully",
            accessToken,
            refreshToken,
        });
        


    } catch (error) {
        logger.error(error.message, {stack: error.stack});
        res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
}

// user login
const loginUser = async (req, res) => {
    logger.info('Login endpoint hit...')
    try {
        const {error} = validateLogin(req.body);
        if (error) {
            logger.warn('Validation error', error.details[0].message);
            return res.status(400).json({
                success: false,
                message: error.details[0].message,
            });
        }

        const {email, password} = req.body;

        let existingUser = await User.findOne({email});

        if (!existingUser) {
            logger.warn('User not found', {email});
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        const isPasswordValid = await existingUser.comparePassword(password);
        if (!isPasswordValid) {
            logger.warn('Invalid password', {email});
            return res.status(401).json({
                success: false,
                message: "Invalid password",
            });
        }

        const {accessToken, refreshToken} = await generateTokens(existingUser);

        res.status(200).json({
            success: true,
            message: "User logged in successfully",
            accessToken,
            refreshToken,
            userId: existingUser._id,
        });
    } catch (error) {
        logger.error(error.message, {stack: error.stack});
        res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
}

// refresh token
const refreshTokenUser = async (req, res) => {
    logger.info('Refresh token endpoint hit...')
    try {
        const {refreshToken} = req.body;
        if (!refreshToken) {
            logger.warn('Refresh token is required');
            return res.status(400).json({
                success: false,
                message: "Refresh token is required",
            });
        }

        const storedToken = await RefreshToken.findOne({token: refreshToken});

        if (!storedToken || storedToken.expiresAt < new Date()) {
            logger.warn('Refresh token expired or not found', {refreshToken});
            return res.status(401).json({
                success: false,
                message: "Refresh token expired or not found",
            });
        }

        const user = await User.findById(storedToken.userId);
        if (!user) {
            logger.warn('User not found', {userId: storedToken.userId});
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        const {accessToken: newAccessToken, refreshToken: newRefreshToken} = await generateTokens(user);

        // delete the old refresh token
        await RefreshToken.deleteOne({_id: storedToken._id});

        res.status(200).json({
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
        });
    } catch (error) {
        logger.error(error.message, {stack: error.stack});
        res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
}

// user logout
const logoutUser = async (req, res) => {
    logger.info('Logout endpoint hit...')
    try {
        const {refreshToken} = req.body;
        if (!refreshToken) {
            logger.warn('Refresh token is required');
            return res.status(400).json({
                success: false,
                message: "Refresh token is required",
            });
        }

        await RefreshToken.deleteOne({token: refreshToken});
        logger.info('Refresh token deleted successfully for logout');

        res.status(200).json({
            success: true,
            message: "User logged out successfully",
        });
    } catch (error) {
        logger.error(error.message, {stack: error.stack});
        res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
}

module.exports = {registerUser, loginUser, refreshTokenUser, logoutUser};


