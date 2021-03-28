const express = require('express');
const dotenv = require('dotenv');
const morgan = require('morgan');
const colors = require('colors');
const fileupload = require('express-fileupload');
const cookieParser = require('cookie-parser')
const helmet = require('helmet')
const xss = require('xss-clean')
const hpp = require('hpp')
const cors = require('cors')
const rateLimit = require('express-rate-limit')
const mongoSanitize = require('express-mongo-sanitize');
const errorHandler = require('./middleware/error');
const connectDb = require('./config/db');
const path = require('path');
// rOUTES
const csp = require('simple-csp');
dotenv.config({path: './config/config.env'});
connectDb();



const bootcamps = require('./routes/bootcamps');
const courses = require('./routes/courses');
const auth = require('./routes/auth');
const users = require('./routes/users');
const reviews = require('./routes/reviews');

const app = express();



//dev logger



/*
const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
*/

app.use(express.json());
app.use(cookieParser())
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'))

}
/*app.use(function (req, res, next) {
    res.set("Content-Security-Policy", "default-src *; style-src 'self' http://!* 'unsafe-inline'; script-src 'self' http://!* 'unsafe-inline' 'unsafe-eval'")
    next();
});*/

app.use(fileupload());
app.use(mongoSanitize())
app.use(helmet());
app.use(xss())


app.use(cors())
const limit = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 100
});
app.use(limit);
app.use(hpp())
//mount route
app.use(function(req, res, next) {
    res.setHeader("Content-Security-Policy", "script-src 'unsafe-inline' http://localhost:5000");
    return next();
});

app.use(express.static(path.join(__dirname, 'public')));
// Mount routers


app.use('/api/v1/bootcamps', bootcamps);
app.use('/api/v1/courses', courses);
app.use('/api/v1/auth', auth);
app.use('/api/v1/users', users);
app.use('/api/v1/reviews', reviews);

app.use(errorHandler);

const PORT = process.env.PORT || 5000;


const server = app.listen(PORT,console.log(`Server is running in ${process.env.NODE_ENV} mode on port ${PORT}`.yellow.bold));

process.on('unhandledRejection', (err,promise) => {
    console.log(`Error : ${err.message}`.red);
    server.close(() => process.exit(1));
})



