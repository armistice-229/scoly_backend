const mongoose = require('mongoose');

const certificatSchema = new mongoose.Schema({
  numeroCertificat: { type: String, required: true, unique: true },
  dateGeneration: { type: Date, default: Date.now },
  nomEcole: { type: String, required: true },
  departement: { type: String,}
});

module.exports = mongoose.model('Certificat', certificatSchema);
