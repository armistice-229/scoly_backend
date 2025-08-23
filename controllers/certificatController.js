const Certificat = require('../models/certificatModel');
const { generateCertificatBuffer } = require('../services/pdfService');
const { PDFDocument } = require('pdf-lib');

// Fonction pour sécuriser le PDF avec des permissions restreintes
async function securePdf(pdfBuffer) {
  // Charger le PDF généré
  const pdfDoc = await PDFDocument.load(pdfBuffer);

  // Sauvegarder avec restrictions
  const pdfBytes = await pdfDoc.save({
    useObjectStreams: false,
    encrypt: {
      ownerPassword: "OWNER_SECRET",  // mot de passe admin (toi)
      userPassword: undefined,        // pas de mot de passe à ouvrir
      permissions: {
        printing: 'highResolution',   // ✅ autoriser impression
        modifying: false,             // ❌ interdire modification
        copying: false,               // ❌ interdire copier/coller
        annotating: false,            // ❌ interdire annotation
        fillingForms: false,          // ❌ interdire remplissage
        contentAccessibility: false,  // ❌ interdire accès aux lecteurs d’écran
        documentAssembly: true       // ❌ interdire réorganisation des pages
      }
    }
  });

  return pdfBytes;
}

// Fonction utilitaire pour formater une date en JJ/MM/AAAA
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
// Fonction pour déterminer le ministère et la direction selon la classe
function getMinistereAndDirection(classe, departement, ville) {
  const primaire = ["CI", "CP", "CE1", "CE2", "CM1", "CM2"];

  if (primaire.includes(classe.toUpperCase())) {
    return {
      ministere: "MINISTERE DES ENSEIGNEMENTS MATERNEL ET PRIMAIRE (MEMP)",
      direction: `DIRECTION DEPARTEMENTALE DES ENSEIGNEMENTS MATERNELS ET PRIMAIRES DU ${departement}`,
      circonscription: `CIRCONSCRIPTION SCOLAIRE DE ${ville.toUpperCase()}`
    };
  } else {
    return {
      ministere: "MINISTERE DE L’ENSEIGNEMENT SECONDAIRE, TECHNIQUE ET DE LA FORMATION PROFESSIONNELLE (MESTFP)",
      direction: `DIRECTION DEPARTEMENTALE DES ENSEIGNEMENTS SECONDAIRE, TECHNIQUE ET DE LA FORMATION PROFESSIONNELLE DU ${departement}`,
      circonscription: null // Pas de circonscription au secondaire
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

    // ✅ Classe en majuscules
    if (data.classe) {
      data.classe = data.classe.toUpperCase();
    }

    // ✅ Ville → première lettre majuscule
    if (data.ville) {
      data.ville = capitalizeFirstLetter(data.ville);
    }
    // ✅ Genre du directeur → première lettre majuscule
    if (data.genreDirecteur) {
    data.genreDirecteur = capitalizeFirstLetter(data.genreDirecteur.trim());
    } else {
      data.genreDirecteur = "Directeur"; // valeur par défaut
    }


    // ✅ Ministère et direction selon la classe
    const { ministere, direction, circonscription } = getMinistereAndDirection(data.classe, data.departement, data.ville);
    data.ministere = ministere;
    data.direction = direction;
    data.circonscription = circonscription;

    // ✅ Ajout auto de la date de délivrance (aujourd'hui)
    const today = new Date();
    const formattedDate = today.toLocaleDateString("fr-FR"); // format JJ/MM/AAAA
    data.dateDelivrance = formattedDate;

    
    // Génération PDF avec PDFKit
    let pdfBuffer = await generateCertificatBuffer(data);

    // Sécurisation PDF
    pdfBuffer = await securePdf(pdfBuffer);


    // Sauvegarde en DB
    const newCertificat = new Certificat({
      numeroCertificat,
      nomEcole: data.nomEcole,
      departement: data.departement,
      nomEleve: data.nomEleve,
      classe: data.classe,
      dateNaissance: data.dateNaissance,
      matricule: data.matricule,
      dateInscription: data.dateInscription,
      dateDelivrance: data.dateDelivrance,
      nomDirecteur: data.nomDirecteur,
      genreDirecteur: data.genreDirecteur 
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
