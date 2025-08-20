const Certificat = require('../models/certificatModel');
const { generateCertificatBuffer } = require('../services/pdfService');


function formatDateFR(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  const jour = String(date.getDate()).padStart(2, "0");
  const mois = String(date.getMonth() + 1).padStart(2, "0"); // Janvier = 0
  const annee = date.getFullYear();
  return `${jour}/${mois}/${annee}`;
}

// Fonction utilitaire pour capitaliser la première lettre d'un mot
function capitalizeFirstLetter(str) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

 
// Fonction utilitaire pour générer un code alphanumérique
function generateAlphaNumeric(length = 10) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
// Fonction pour obtenir le ministère et la direction en fonction de la classe
function getMinistereAndDirection(classe, departement) {
  const primaire = ["CI", "CP", "CE1", "CE2", "CM1", "CM2"];

  if (primaire.includes(classe.toUpperCase())) {
    return {
      ministere: "MINISTERE DES ENSEIGNEMENTS MATERNEL ET PRIMAIRE (MEMP)",
      direction: `DIRECTION DEPARTEMENTALE DES ENSEIGNEMENTS MATERNELS ET PRIMAIRES DU ${departement}`
    };
  } else {
    return {
      ministere: "MINISTERE DE L’ENSEIGNEMENT SECONDAIRE, TECHNIQUE ET DE LA FORMATION PROFESSIONNELLE (MESTFP)",
      direction: `DIRECTION DEPARTEMENTALE DES ENSEIGNEMENTS SECONDAIRE, TECHNIQUE ET DE LA FORMATION PROFESSIONNELLE DU ${departement}`
    };
  }
}

exports.createCertificat = async (req, res) => {
  try {
    const data = req.body;

    // ✅ Génération et vérification unicité
    let numeroCertificat;
    let exists = true;
    while (exists) {
      numeroCertificat = generateAlphaNumeric(10);
      const existing = await Certificat.findOne({ numeroCertificat });
      if (!existing) exists = false;
    }
    data.numeroCertificat = numeroCertificat;


    // ✅ Reformater les dates
    data.dateNaissance = formatDateFR(data.dateNaissance);
    data.dateInscription = formatDateFR(data.dateInscription);
    data.dateDelivrance = formatDateFR(data.dateDelivrance);

    // ✅ Département en majuscules
    if (data.departement) {
      data.departement = data.departement.toUpperCase();
    }

    // ✅ Ville → première lettre majuscule
    if (data.ville) {
      data.ville = capitalizeFirstLetter(data.ville);
    }

    // ✅ Ministère et direction selon la classe
    const { ministere, direction } = getMinistereAndDirection(data.classe, data.departement);
    data.ministere = ministere;
    data.direction = direction;

    // ✅ Ajout auto de la date de délivrance (aujourd'hui)
    const today = new Date();
    const formattedDate = today.toLocaleDateString("fr-FR"); // format JJ/MM/AAAA
    data.dateDelivrance = formattedDate;

    // Génération PDF
    const pdfBuffer = await generateCertificatBuffer(data);

    // Sauvegarde en DB
    const newCertificat = new Certificat({
      numeroCertificat,
      nomEcole: data.nomEcole,
      departement: data.departement,
    });
    await newCertificat.save();

    // Envoi du PDF
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=certificat_${numeroCertificat}.pdf`);
    res.send(pdfBuffer);


  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur lors de la génération du certificat" });
  }
};


// ✅ Vérification certificat
exports.verifyCertificat = async (req, res) => {
  try {
    const numero = req.params.numero;

    const certificat = await Certificat.findOne({ numeroCertificat: numero });

    if (!certificat) {
      return res.status(404).json({
        valide: false,
        message: "❌ Certificat introuvable ou invalide."
      });
    }

    res.json({
      valide: true,
      numeroCertificat: certificat.numeroCertificat,
      nomEcole: certificat.nomEcole,
      dateGeneration: certificat.dateGeneration,
      message: "✅ Certificat valide et reconnu par la plateforme."
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur lors de la vérification" });
  }
};
