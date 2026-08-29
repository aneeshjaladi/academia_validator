const QRCode = require('qrcode');
const crypto = require('crypto');

const generateQRCode = async (certificateId, verificationUrl) => {
  try {
    const url = verificationUrl || `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify?id=${certificateId}`;
    const qrDataUrl = await QRCode.toDataURL(url, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      quality: 0.92,
      margin: 1,
      color: { dark: '#1a1a2e', light: '#ffffff' },
      width: 256
    });
    return qrDataUrl;
  } catch (err) {
    console.error('QR generation error:', err);
    return null;
  }
};

const generateCryptoHash = (data) => {
  const str = typeof data === 'string' ? data : JSON.stringify(data);
  return crypto.createHash('sha256').update(str).digest('hex');
};

module.exports = { generateQRCode, generateCryptoHash };