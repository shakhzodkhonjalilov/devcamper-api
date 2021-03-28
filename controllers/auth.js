const asyncHandler = require('../middleware/async');
const crypto = require('crypto');
const ErrorResponse = require('../utils/errorResponse');

const sendEmail = require('../utils/sendEmail');
const User = require('../models/User');

exports.register = asyncHandler(async (req, res, next) => {
    const { name, email, password, role } = req.body;

    // Create user
    const user = await User.create({
        name,
        email,
        password,
        role
    });

    sendTokenResponse(user, 200, res);
});


exports.login = asyncHandler(async (req, res, next) => {
    const { email, password } = req.body;

    // Validate emil & password
    if (!email || !password) {
        return next(new ErrorResponse('Please provide an email and password', 400));
    }

    // Check for user
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
        return next(new ErrorResponse('Invalid credentials', 401));
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
        return next(new ErrorResponse('Invalid credentials', 401));
    }

    sendTokenResponse(user, 200, res);
});
exports.logout = asyncHandler(async (req, res, next ) => {
  res.cookie('token', 'none', {
      expires: new Date(Date.now() + 10 * 1000 ),
      httpOnly: true
  })

    res.status(200).json({
        success: true,
        data: {}
    })
});
exports.getMe = asyncHandler(async (req, res, next ) => {
    const user = await User.findById(req.user.id);

    res.status(200).json({
        success: true,
        data: user
    })
});


exports.updateDetails = asyncHandler(async (req, res, next ) => {

    const fieldsToUpdate = {
        name: req.body.name,
        email: req.body.email
    };
    const user = await User.findByIdAndUpdate(req.user.id, fieldsToUpdate, {
        new: true,
        runValidators: true
    });

    res.status(200).json({
        success: true,
        data: user
    })
});

exports.updatePassword = asyncHandler(async (req, res, next ) => {
    const user = await User.findById(req.user.id).select('+password');
    if (!(await user.matchPassword(req.body.currentPassword))) {
        return next(new ErrorResponse('Password is incorrect ', 401));

    }
user.password = req.body.newPassword;
    await user.save();

    sendTokenResponse(user, 200, res);

});

//Forgot password
exports.forgotPassword = asyncHandler(async (req, res, next ) => {
    const user = await User.findOne({ email: req.body.email });

    if (!user) {
        return next(new ErrorResponse('There is no user with such email ', 404))
    }

    const resetToken = user.getResetPasswordToken();
    await user.save({ validateBeforeSave: false });

    const resetUrl = `${req.protocol}://${req.get('host')}/api/v1/auth/resetpassword/${resetToken}`;
    const message = `You received a message to reset password please go ahead the link \n\n ${resetUrl}`;
    
    try {
        await sendEmail({
            email: user.email,
            subject: 'Passwrod reset',
            message
        });
        res.status(200).json({success: true, data: 'Email sent'})
    } catch (e) {
        console.log(e);
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;
        await user.save({validateBeforeSave: false})

        return next(new ErrorResponse('Email could not be sent',500));
    }
    console.log(resetToken)
    res.status(200).json({
        success: true,
        data: user
    })
});

exports.resetPassword = asyncHandler(async (req, res, next ) => {

    const resetPasswordToken = crypto.createHash('sha256').update(req.params.resettoken).digest('hex');
    const user = await User.findOne({
        resetPasswordToken,
        resetPasswordExpire: {$gt: Date.now()}
    });
    if (!user) {
        return next(new ErrorResponse('Invalid token', 400));

    }
user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();
    sendTokenResponse(user, 200, res);
});

const sendTokenResponse = (user, statusCode, res) => {
    // Create token
    const token = user.getSignedJwtToken();

    const options = {
        expires: new Date(
            Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000
        ),
        httpOnly: true
    };

    if (process.env.NODE_ENV === 'production') {
        options.secure = true;
    }

    res
        .status(statusCode)
        .cookie('token', token, options)
        .json({
            success: true,
            token
        });
};
