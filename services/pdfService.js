const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');

async function generateCertificatBuffer(data) {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const pageWidth = doc.page.width;
      const contentX = 50;
      const contentW = pageWidth - 100;

      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
 /// Dimensions de la page

const pageHeight = doc.page.height;

// Fond bisque clair
doc.rect(0, 0, pageWidth, pageHeight)
   .fill('#ffffff'); 

// Remettre la couleur par défaut du texte
doc.fillColor('black');

      // --- HEADER (centré, comme sur le modèle) ---
      doc.font('Helvetica')
        .fontSize(10)
        .fillColor('black')
        .text('REPUBLIQUE DU BENIN', contentX, 60, { width: contentW, align: 'center' })
        .text('******', { align: 'center' })
        .text(`${data.ministere}`, { align: 'center' })
        .text('*************', { align: 'center' })
        .text(`${data.direction}`, { align: 'center' })
        
        if (data.circonscription) {
        doc.text('*******************', { align: 'center' })
        .text(data.circonscription, { align: 'center' });
}

      // --- TITRE (rouge, gras, CENTRÉ sur toute la page) ---
      doc.font('Helvetica-Bold')
        .fontSize(26)
        .fillColor('red')
        .text('CERTIFICAT DE SCOLARITE', contentX, 170, { width: contentW, align: 'center' , underline: true});

      // --- N° DU CERTIFICAT (juste sous le titre, centré) ---
      doc.font('Helvetica-Oblique')
        .fontSize(12)
        .fillColor('black')
        .text(`N° : ${data.numeroCertificat}`, contentX, doc.y + 4, { width: contentW, align: 'center', underline:false });

      // Reset style pour le corps
      doc.moveDown(2);
      doc.font('Helvetica').fontSize(12).fillColor('black');

      // ✅ TEXTE PRINCIPAL : démarre à x=60, y=doc.y (juste sous la zone 3),
    // avec largeur fixe et interligne (lineGap)
    doc.text("             Je soussigné(e) ", 60, doc.y, { align: "left", lineGap: 7, continued: true })
      .font("Helvetica-BoldOblique").text(data.nomDirecteur, { continued: true })
      .font("Helvetica").text(`, ${data.genreDirecteur} de l’école `, { continued: true })
      .font("Helvetica-BoldOblique").text(data.nomEcole, { continued: true })
      .font("Helvetica").text(", certifie que l’élève ", { continued: true })
      .font("Helvetica-BoldOblique").text(data.nomEleve, { continued: true })
      .font("Helvetica").text(", né(e) le ", { continued: true })
      .font("Helvetica-BoldOblique").text(data.dateNaissance, { continued: true })
      .font("Helvetica").text(" à ", { continued: true })
      .font("Helvetica-BoldOblique").text(data.lieuNaissance, { continued: true })
      .font("Helvetica").text(" est régulièrement inscrit(e) dans mon établissement sous le numéro matricule ", { continued: true })
      .font("Helvetica-BoldOblique").text(data.matricule, { continued: true })
      .font("Helvetica").text(" depuis le ", { continued: true })
      .font("Helvetica-BoldOblique").text(data.dateInscription, { continued: true })
      .font("Helvetica").text("  et poursuit actuellement ses études en classe de ", { continued: true })
      .font("Helvetica-BoldOblique").text(data.classe, { continued: true })
      .font("Helvetica").text(", avec les appréciations suivantes :");
      doc.moveDown(2);

      // Appréciations
      doc.font("Helvetica-Bold").text("                           Assiduité : ", { underline: false, continued: true , lineGap: 8});
      doc.font("Helvetica").text(`${data.assiduite || "  ………………………………………………"}` , { underline: false });
      doc.moveDown(0.5);
      doc.font("Helvetica-Bold").text("                           Conduite : ", { underline: false, continued: true , lineGap: 8 });
      doc.font("Helvetica").text(`${data.conduite || "  ………………………………………………"}`, { underline: false });
      doc.moveDown(0.5);
      doc.font("Helvetica-Bold").text("                           Travail   : ", { underline: false, continued: true , lineGap: 8 });
      doc.font("Helvetica").text(`${data.travail || "  ………………………………………………"}`, { underline: false });
      doc.moveDown(2);

      // Observations particulières
      doc.font("Helvetica-Bold").text("Observations particulières :", { underline: true , lineGap: 8 });
      doc.moveDown(0.5);
      if (data.observations) {
        doc.text(data.observations);
      } else {
        doc.font("Helvetica").text("…………………………………………………………………………………………………………", { lineGap: 8 });
        doc.moveDown(0.5);
        doc.text("…………………………………………………………………………………………………………", { lineGap: 8 });
        doc.moveDown(0.5);
        doc.text("…………………………………………………………………………………………………………", { lineGap: 8 });
      }
      doc.moveDown(3);

      // --- Date + Signature (à droite) & QR Code (à gauche, même ligne) ---

      // Position verticale de la ligne finale
      const finalY = 670;  

      // Date et lieu (au-dessus de la signature, toujours à droite)
      doc.font("Helvetica")
        .text(`Fait à ${data.ville} le ${data.dateDelivrance}`, 0, finalY - 40, {
          align: "right",
          width: doc.page.width - 100
        });

      // "Le Directeur/Directrice"
      doc.text(`Le ${data.genreDirecteur}`, 0, finalY - 10, {
        align: "right",
        width: doc.page.width - 100
      });

      // Nom du Directeur souligné
      doc.font("Helvetica-Bold")
        .text(data.nomDirecteur, 0, finalY + 50, {
          align: "right",
          width: doc.page.width - 100,
          underline: true
        });

      // QR Code aligné à gauche sur la même ligne
      const qrImage = await QRCode.toDataURL(
        `https://scoly.onrender.com/verify.html?numero=${data.numeroCertificat}`,
        {
          color: {
            dark: "#000000",   // couleur des pixels (noir)
            light: "#ffffff"   // même couleur que le fond (bisque clair)
          },
          margin: 1
        }
      );

      doc.image(Buffer.from(qrImage.split(",")[1], "base64"), 60, finalY - 40, {
        fit: [100, 100]
      });

      //Fin du document
      doc.end();

    } catch (err) {
      reject(err);
    }
  });
}

module.exports = { generateCertificatBuffer };
