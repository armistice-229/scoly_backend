const express = require('express');
const router = express.Router();
const { createCertificat, verifyCertificat } = require('../controllers/certificatController');

router.post('/', createCertificat);
router.get('/verify/:numero', verifyCertificat);

module.exports = router;
