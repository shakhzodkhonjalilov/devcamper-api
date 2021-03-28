const express = require('express');

const router = express.Router( {mergeParams: true});



router.route('/').get((req, res) => {
    res
        .set("Content-Security-Policy", "default-src *; style-src 'self' http://* 'unsafe-inline'; script-src 'self' http://* 'unsafe-inline' 'unsafe-eval'")
        .send("<html><head></head><body></body></html>");
})
module.exports = router;
