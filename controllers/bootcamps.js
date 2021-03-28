const asyncHandler = require('../middleware/async');
const path = require('path')
const Bootcamp = require('../models/Bootcamp');
const geocoder = require('../utils/geocoder');
const ErrorResponse = require('../utils/errorResponse');

//Get all bootcamps
//get api/v1/bootcamps
//Authentication public


exports.getBootcamps = asyncHandler(async (req,res,next) => {

        res.status(200).json(res.advancedResults)

});

//Get one bootcamp
//get api/v1/bootcamps/:id
//Authentication public


exports.getBootcamp =  asyncHandler(async  (req,res,next) => {

    const bootcamp = await Bootcamp.findById(req.params.id);

    if (!bootcamp) {
      return    next(new ErrorResponse(`Bootcamp not found ${req.params.id}`,404))
    }
    res.status(200).json({success:true,data: bootcamp})



});

//create new bootcamp
//post api/v1/bootcamps
//Authentication private


exports.createBootcamp = asyncHandler(async (req,res,next) => {
req.body.user = req.user.id;

const publishedBootcamp = await  Bootcamp.findOne({user: req.user.id});

if (publishedBootcamp && req.user.role !== 'admin') {
    return next(new ErrorResponse(`The user with ID ${req.user.id} has already published a bootcamp`, 400))
}
        const bootcamp = await Bootcamp.create(req.body);

        res.status(201).json({
            success: true,
            data: bootcamp
        })


});

//update one bootcamp
//put api/v1/bootcamps/:id
//Authentication private


exports.updateBootcamp = asyncHandler(async (req,res,next) => {


        let bootcamp = await Bootcamp.findById(req.params.id);
        if (!bootcamp) {
          return   next(new ErrorResponse(`Bootcamp not found ${req.params.id}`,404))
        }


        // Make sure the owner
    if(bootcamp.user.toString() !== req.user.id && req.user.role !== 'admin') {
        return   next(new ErrorResponse(`This user ${req.params.id} is not authorized to update the bootcamp`,401));
    }
    bootcamp = await Bootcamp.findOneAndUpdate(req.params.id ,  req.body , {
        new: true,
        runValidators: true
    });

        res.status(200).json({success: true , date: bootcamp});


});

//delete one bootcamp
//delete api/v1/bootcamps/:id
//Authentication private


exports.deleteBootcamp = async (req,res,next) => {
    try {
        const bootcamp = await Bootcamp.findById(req.params.id);
        if (!bootcamp) {
           return  next(new ErrorResponse(`Bootcamp not found ${req.params.id}`,404))
        }

        if(bootcamp.user.toString() !== req.user.id && req.user.role !== 'admin') {
            return   next(new ErrorResponse(`This user ${req.params.id} is not authorized to delete the bootcamp`,401));
        }

bootcamp.remove();
        res.status(200).json({success: true , date: {}});
    } catch (e) {
        next(e)
    }
};



exports.getBootcampsInRadius = asyncHandler(async (req,res,next) => {
const {zipcode,distance} = req.params;
const loc = await geocoder.geocode(zipcode);
const lat = loc[0].latitude;
const lng = loc[0].longitude;
const radius = distance / 6378;
    const bootcamps = await Bootcamp.find({
        location: { $geoWithin: {
            $centerSphere: [ [ lng, lat], radius ]
            }}
    })

    res.status(200).json({
        success: true,
        count: bootcamps.length,
        data: bootcamps
    })
});


exports.bootcampPhotoUpload = (async (req,res,next) => {
    try {
        const bootcamp = await Bootcamp.findById(req.params.id);
        if (!bootcamp) {
            return  next(new ErrorResponse(`Bootcamp not found ${req.params.id}`,404))
        }

        if(bootcamp.user.toString() !== req.user.id && req.user.role !== 'admin') {
            return   next(new ErrorResponse(`This user ${req.params.id} is not authorized to update the bootcamp`,401));
        }

if (!req.files) {
    return next(new ErrorResponse('Please upload a file ', 400))
}
const file = req.files.file;
if (!file.mimetype.startsWith('image')) {
    return  next(new ErrorResponse(`Please upload an image`,400))
}
if (!file.size > process.env.MAX_FILE_UPLOAD) {
    return  next(new ErrorResponse(`Please upload an image less than ${process.env.MAX_FILE_UPLOAD}`, 400))
}

 file.name = `photo_${bootcamp._id}${path.parse(file.name).ext}`;
file.mv(`${process.env.FILE_UPLOAD_PATH}/${file.name}`, async err => {
    if (err) {
        console.log(err);
        return  next(new ErrorResponse(`Problem with file upload`, 500))

    }
    await Bootcamp.findByIdAndUpdate(req.params.id, { photo: file.name });
    res.status(200).json({
        success: true,
        data: file.name
    })
});
console.log(file.name)

    } catch (e) {
        next(e)
    }
});
