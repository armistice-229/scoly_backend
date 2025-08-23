const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');

async function generateCertificatBuffer(data) {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      let buffers = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });

     
      // --- ZONE 1 : Header officiel (bloc à gauche) ---
      doc.font("Helvetica")
        .fontSize(10)
        .fillColor("black")
        .text(
            "REPUBLIQUE DU BENIN\n" +
            "******\n" +
            `${data.ministere}\n` +   // ✅ dynamique
            "*************\n" +
            `${data.direction}`,       // ✅ dynamique
            30,
            50,
            { width: 300, align: "center" }
        );

      // --- ZONE 2 : Titre (rouge, gras, à droite) ---
      doc.registerFont('Avenue', 'fonts/Avenue de Madison.ttf')
      doc.font("Helvetica-Bold")
         .fontSize(28)
         .fillColor("red")
         .text(
            "CERTIFICAT   DE \n SCOLARITE",
            350,       // position X (partie droite)
            100,       // position Y
            { width: 200, align: "center" } // centré DANS cette zone
         );

      // --- ZONE 3 : Numéro du certificat ---
      doc.font("Helvetica-Oblique")
         .fontSize(12)
         .fillColor("black")
         .text(
            `N° : ${data.numeroCertificat}`,
            400,      // position X
            200,      // position Y (sous le titre)
            { width: 150, align: "center", height: 20 } // centré DANS cette zone
         );
      // ✅ Réinitialiser style 
      doc.font("Helvetica")
        .fontSize(12)
        .fillColor("black");
      doc.moveDown(3); // ou bien doc.y = 250; (position fixe)
      
     // ✅ TEXTE PRINCIPAL : démarre à x=60, y=doc.y (juste sous la zone 3),
    // avec largeur fixe et interligne (lineGap)
    doc.text("             Je soussigné(e) ", 60, doc.y, { align: "left", lineGap: 7, continued: true })
      .font("Helvetica-BoldOblique").text(data.nomDirecteur, { continued: true })
      .font("Helvetica").text(", Directeur/Directrice de l’école ", { continued: true })
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

      // Date et lieu
      doc.font("Helvetica").text(`Fait à ${data.ville} le ${data.dateDelivrance}`, { align: "right" , italics: true });
      doc.moveDown(1);

      // Signature
      doc.text("Le Directeur/Directrice", { align: "right" , underline: false , italics: false });
      doc.moveDown(4);
      doc.font("Helvetica-Bold").text(data.nomDirecteur, { align: "right",  underline: true });

      // QR Code (bas à droite)
      const qrImage = await QRCode.toDataURL(`https://scoly-backend.onrender.com/verify.html?numero=${data.numeroCertificat}`);
      doc.image(Buffer.from(qrImage.split(",")[1], "base64"), 60, 650, { fit: [100, 100] });
      // Ajout du lien cliquable sur la zone du QR

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = { generateCertificatBuffer };
