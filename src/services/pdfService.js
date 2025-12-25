import PDFDocument from 'pdfkit';
import { stripHtml } from 'string-strip-html';
import fs from 'fs';
import QRCode from 'qrcode';
import axios from 'axios'; // For fetching remote images

export const generateAgreementPdf = (agreementData) => {
  return new Promise(async (resolve, reject) => { 
    
    // --- Define the Image URLs ---
    const topLogoUrl = 'https://res.cloudinary.com/self-taken/image/upload/v1761059458/bring_qungbf.png'; 
    const stampUrl = 'https://res.cloudinary.com/self-taken/image/upload/v1761059466/bringmarklogo_tveuwb.png'; 

    let logoBuffer = null;
    let stampBuffer = null;

    try {
      const logoResponse = await axios.get(topLogoUrl, { responseType: 'arraybuffer' });
      logoBuffer = Buffer.from(logoResponse.data);
      
      const stampResponse = await axios.get(stampUrl, { responseType: 'arraybuffer' });
      stampBuffer = Buffer.from(stampResponse.data);
      
    } catch (error) {
      console.error('Error fetching Logo/Stamp from URL:', error.message);
    }

    const doc = new PDFDocument({
      size: 'A4',
      margin: 0,
      bufferPages: true,
      autoFirstPage: false,
    });

    const buffers = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    // Colors
    const primaryBlue = '#1E40AF';
    const textDark = '#1F2937';
    const lightBg = '#F9FAFB';
    const borderGray = '#D1D5DB';
    const signatureInkColor = '#000000'; // Pure Black for pen ink look

    // Helper function to draw borders
    const drawBorders = () => {
      doc.lineWidth(0.8) 
         .strokeColor('#D1D5DB') 
         .rect(25, 25, 545, 792) 
         .stroke();
    };

    // --- PAGE 1: Certificate Page ---
    doc.addPage();
    drawBorders();

    // Logo/Emblem area (TOP LOGO)
    if (logoBuffer) {
      doc.image(logoBuffer, 257.5, 45, { width: 80, height: 80 });
    } else {
      doc.circle(297.5, 85, 40)
         .lineWidth(3)
         .strokeColor(primaryBlue)
         .stroke();
      doc.fontSize(28)
         .fillColor(primaryBlue)
         .font('Helvetica-Bold')
         .text('V', 285, 68, { width: 25, align: 'center' });
    }


    // Header
    doc.fontSize(11)
       .fillColor('#6B7280')
       .font('Helvetica')
       .text('Bringmark pvt ltd', 50, 135, { align: 'center', width: 495 });

    doc.fontSize(18)
       .fillColor(primaryBlue)
       .font('Helvetica-Bold')
       .text('INDIA NON JUDICIAL', 50, 155, { align: 'center', width: 495 });

    doc.fontSize(13)
       .fillColor(textDark)
       .font('Helvetica-Bold')
       .text('e-Agreement', 50, 180, { align: 'center', width: 495 });

    // Certificate details
    let currentY = 215;
    const leftMargin = 60;
    const labelWidth = 180;
    const lineHeight = 20;

    doc.fontSize(9).fillColor(textDark).font('Helvetica');

    const certDetails = [
      { label: 'Certificate No.', value: `IN-DL1-${agreementData.signedBy._id.toString().slice(0, 12).toUpperCase()}` },
      { label: 'Certificate Issued Date', value: new Date(agreementData.signedAt).toLocaleString('en-IN', { 
        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true 
      })},
      { label: 'Collector Reference', value: 'VERIFY-eKYC-DIGITAL' },
      { label: 'Unique Doc. Reference', value: `VERIFYEKYC-${agreementData.signedBy._id.toString().slice(0, 18).toUpperCase()}` },
      { label: 'Purchased By', value: agreementData.legalName.toUpperCase() },
      { label: 'Description of Document', value: 'Digital Service Agreement' },
      { label: 'Property Description', value: 'NA' },
      { label: 'Consideration Price (Rs.)', value: '0\n(Zero)' },
      { label: 'First Party', value: agreementData.legalName.toUpperCase() },
      { label: 'Second Party', value: 'VERIFY eKYC SERVICES' },
      { label: 'Agreement Value', value: 'Digital Service Agreement' },
    ];

    certDetails.forEach((item) => {
      doc.font('Helvetica-Bold')
         .text(item.label, leftMargin, currentY, { width: labelWidth, continued: false });
      
      doc.font('Helvetica')
         .text(`: ${item.value}`, leftMargin + labelWidth, currentY, { width: 280 });
      
      currentY += (item.value.includes('\n') ? lineHeight * 1.8 : lineHeight);
    });

    // QR Code
    const qrDownloadUrl = "https://www.verifyekyc.com/login";
    try {
      const qrBuffer = await QRCode.toBuffer(qrDownloadUrl, {
        type: 'png',
        margin: 1,
        width: 250
      });

      currentY += 10;
      doc.rect(230, currentY, 135, 135).fillAndStroke(lightBg, borderGray);

      doc.image(qrBuffer, 235, currentY + 7.5, { width: 125, height: 125 });

      doc.fontSize(7)
         .fillColor('#6B7280')
         .text('Scan to Login / Verify at BringMark.in', 230, currentY + 130, { width: 135, align: 'center' });

      currentY += 155;
    } catch (err) {
      currentY += 10;
      doc.rect(230, currentY, 135, 135).fillAndStroke(lightBg, borderGray);
      doc.fontSize(8)
         .fillColor('#9CA3AF')
         .text('[Digital Verification QR]', 235, currentY + 60, { width: 125, align: 'center' });
      currentY += 155;
    }

    // Separator
    doc.save();
    doc.lineWidth(1).dash(5, { space: 3 }).strokeColor(borderGray)
       .moveTo(50, currentY).lineTo(545, currentY).stroke();
    doc.restore();

    currentY += 20;

    // Agreement notice
    doc.fontSize(9)
       .fillColor(textDark)
       .font('Helvetica-Bold')
       .text(
         `THIS AGREEMENT FORMS AN INTEGRAL PART OF DIGITAL SERVICE DATED ${new Date(agreementData.signedAt).toLocaleDateString('en-IN')} EXECUTED AT NEW DELHI BY ${agreementData.legalName.toUpperCase()} IN FAVOUR OF VERIFY eKYC SERVICES.`,
         60, currentY, { align: 'center', width: 475, lineGap: 2 }
       );

    currentY = doc.y + 25;

    // Signature section
    const sigBoxY = currentY;
    
    // Company Seal (STAMP)
    if (stampBuffer) {
      doc.image(stampBuffer, 70, sigBoxY - 5, { width: 80, height: 80 }); 
    } else {
      doc.circle(110, sigBoxY + 25, 38)
         .lineWidth(2)
         .strokeColor(primaryBlue)
         .stroke();
      doc.fontSize(7)
         .fillColor(primaryBlue)
         .font('Helvetica-Bold')
         .text('COMPANY', 85, sigBoxY + 15, { width: 50, align: 'center' })
         .text('SEAL', 85, sigBoxY + 28, { width: 50, align: 'center' });
    }

    doc.rect(340, sigBoxY, 185, 70).stroke(borderGray);

   
    if (agreementData.signature) {
      try {
        const signatureData = JSON.parse(agreementData.signature);
        
        if (signatureData.type === 'drawn') {
          // DRAWN SIGNATURE: Renders the saved thin image
          const base64Data = signatureData.imageData.split(',')[1];
          doc.image(Buffer.from(base64Data, 'base64'), 355, sigBoxY + 5, { 
            width: 155, height: 35, fit: [155, 35]
          });
        } else if (signatureData.type === 'typed') {
          // TYPED SIGNATURE FIX: Use Times-Italic with larger size for signature-like feel
          doc.font('Times-Italic') 
             .fontSize(24) // Large size
             .fillColor(signatureInkColor) // Black ink color
             .text(signatureData.text, 355, sigBoxY + 10, { 
               width: 155, 
               align: 'center' 
             });
        }
      } catch (parseError) {
        // Fallback for broken JSON (danish md... case)
        if (agreementData.signature.startsWith('data:image')) {
          const base64Data = agreementData.signature.split(',')[1];
          doc.image(Buffer.from(base64Data, 'base64'), 355, sigBoxY + 5, { 
            width: 155, height: 35, fit: [155, 35]
          });
        } else {
           // Fallback to formal text using legal name
           const typed = agreementData.legalName || 'Authorized Signatory Name'; 
           doc.font('Times-BoldItalic').fontSize(16).fillColor(textDark)
              .text(typed, 355, sigBoxY + 15, { width: 175, align: 'center' });
        }
      }
    } else {
      doc.font('Helvetica-Oblique').fontSize(12).fillColor(textDark)
         .text('Digital Signature', 355, sigBoxY + 15);
    }
    
    doc.fontSize(8).font('Helvetica').fillColor(textDark)
       .text('Director / Authorised Signatory', 345, sigBoxY + 52, { width: 175, align: 'center' });

    doc.fontSize(9).font('Helvetica-Oblique')
       .text(`For ${agreementData.legalName}`, 345, sigBoxY - 15, { width: 175, align: 'right' });

    // Footer (unchanged)
    const footerY = 740;
    doc.fontSize(7).fillColor('#6B7280').font('Helvetica-Bold')
       .text('Statutory Alert:', 60, footerY);
    
    doc.font('Helvetica').fontSize(7)
       .text('1. Beware of unstamped documents. 2. Stamp duty and registration fees are state subjects.', 
             60, footerY + 12, { width: 475 });

    doc.fontSize(6).fillColor('#9CA3AF')
       .text('This document is electronically generated and digitally signed under IT Act 2000.',
             60, footerY + 32, { align: 'center', width: 475 });

    // --- PAGE 2 & onwards - Agreement Details ---
    doc.addPage();
    drawBorders();
    
    doc.fontSize(16).fillColor(primaryBlue).font('Helvetica-Bold')
       .text('AGREEMENT TERMS & CONDITIONS', 50, 50, { align: 'center', width: 495 });

    doc.lineWidth(1).strokeColor(borderGray).moveTo(50, 75).lineTo(545, 75).stroke();

    // Party details
    let contentY = 90;
    doc.rect(50, contentY, 495, 100).fillAndStroke(lightBg, borderGray);

    doc.fontSize(10).fillColor(primaryBlue).font('Helvetica-Bold')
       .text('PARTY DETAILS', 60, contentY + 12);

    doc.fontSize(9).fillColor(textDark).font('Helvetica')
       .text(`Legal Name: ${agreementData.legalName}`, 60, contentY + 30)
       .text(`Trade Name: ${agreementData.tradeName}`, 60, contentY + 45)
       .text(`GSTIN: ${agreementData.gstin}`, 60, contentY + 60)
       .text(`Email: ${agreementData.signedBy.email}`, 60, contentY + 75);

    contentY += 115;

    // Agreement heading
    doc.fontSize(11).fillColor(primaryBlue).font('Helvetica-Bold')
       .text('AGREEMENT TEXT', 50, contentY);

    contentY += 20;

    // Parse and render agreement text properly
    const cleanText = stripHtml(agreementData.agreementText).result;
    const lines = cleanText.split('\n');
    
    const pageHeight = 792;
    const topMargin = 40;
    const bottomMargin = 80;
    
    doc.fontSize(9).fillColor(textDark).font('Helvetica');
    
    let currentPageY = contentY;
    
    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      
      // Check if we need a new page
      if (currentPageY > (pageHeight - bottomMargin - 30)) {
        doc.addPage();
        drawBorders();
        currentPageY = topMargin + 10;
      }
      
      if (trimmedLine === '') {
        currentPageY += 8;
        return;
      }
      
      // Check if it's a section heading (all caps or numbered)
      const isHeading = /^[A-Z\s]+$/.test(trimmedLine) || /^\d+\./.test(trimmedLine);
      
      if (isHeading) {
        // Add extra space before heading
        currentPageY += 8;
        
        // Check again after adding space
        if (currentPageY > (pageHeight - bottomMargin - 30)) {
          doc.addPage();
          drawBorders();
          currentPageY = topMargin + 10;
        }
        
        doc.font('Helvetica-Bold').fontSize(9);
        const headingHeight = doc.heightOfString(trimmedLine, { width: 475, align: 'justify' });
        doc.text(trimmedLine, 60, currentPageY, { width: 475, align: 'justify' });
        currentPageY += headingHeight + 6;
      } else {
        doc.font('Helvetica').fontSize(9);
        const textHeight = doc.heightOfString(trimmedLine, { width: 475, align: 'justify' });
        
        // Check if text will fit
        if (currentPageY + textHeight > (pageHeight - bottomMargin - 20)) {
          doc.addPage();
          drawBorders();
          currentPageY = topMargin + 10;
        }
        
        doc.text(trimmedLine, 60, currentPageY, { width: 475, align: 'justify', lineGap: 2 });
        currentPageY += textHeight + 4;
      }
    });

    // Execution box - add new page if needed
    if (currentPageY > (pageHeight - 150)) {
      doc.addPage();
      drawBorders();
      currentPageY = topMargin + 10;
    } else {
      currentPageY += 20;
    }

   // Execution Details Box with Signature
    doc.rect(50, currentPageY, 495, 90).fillAndStroke(lightBg, borderGray);

    doc.fontSize(10).fillColor(primaryBlue).font('Helvetica-Bold')
       .text('EXECUTION DETAILS', 60, currentPageY + 12);

    doc.fontSize(9).fillColor(textDark).font('Helvetica')
       .text(`Signed By: ${agreementData.legalName}`, 60, currentPageY + 30)
       .text(`Date & Time: ${new Date(agreementData.signedAt).toLocaleString('en-IN')}`, 60, currentPageY + 45)
       // ❌ ERROR FIX: Replaced .isD() with correct ._id.toString()
       .text(`IP Address: ${agreementData.ipAddress} | Doc ID: ${agreementData.signedBy._id.toString().slice(0, 12).toUpperCase()}`, 
             60, currentPageY + 60);

    // Signature area on the right
    if (agreementData.signature) {
      try {
        const signatureData = JSON.parse(agreementData.signature);
        
        if (signatureData.type === 'drawn') {
          const base64Data = signatureData.imageData.split(',')[1];
          doc.image(Buffer.from(base64Data, 'base64'), 410, currentPageY + 25, { 
            width: 120, height: 40 
          });
        } else if (signatureData.type === 'typed') {
           // TYPED SIGNATURE FIX: Use Times-Italic with appropriate size
          doc.font('Times-Italic')
             .fontSize(20) // Prominent size
             .fillColor(signatureInkColor) // Black ink color
             .text(signatureData.text, 410, currentPageY + 30, { 
               width: 120, 
               align: 'center' 
             });
        }
      } catch (parseError) {
        // Fallback for old signatures
        if (agreementData.signature.startsWith('data:image')) {
          const base64Data = agreementData.signature.split(',')[1];
          doc.image(Buffer.from(base64Data, 'base64'), 410, currentPageY + 25, { 
            width: 120, height: 40 
          });
        } else {
          // Fallback to formal text
          const typed = agreementData.legalName || 'Authorized Signatory Name';
          doc.font('Times-BoldItalic').fontSize(14).fillColor(textDark)
             .text(typed, 410, currentPageY + 35, { width: 120, align: 'center' });
        }
      }
    } else {
      doc.font('Helvetica-Oblique').fontSize(10).fillColor(textDark)
         .text('Digital Signature', 410, currentPageY + 35, { width: 120, align: 'center' });
    }

    doc.fontSize(8).fillColor('#6B7280')
       .text('Authorised Signatory', 410, currentPageY + 68, { width: 120, align: 'center' });


    currentPageY += 90;

    // End of document
    doc.fontSize(7).fillColor('#9CA3AF')
       .text('*** End of Document ***', 50, currentPageY, { align: 'center', width: 495 });

    doc.end();
  });
};
