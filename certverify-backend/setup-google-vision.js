const fs = require('fs');
const path = require('path');

// Extract Google Cloud credentials from .env file
try {
  const envPath = path.join(__dirname, '.env');
  const envContent = fs.readFileSync(envPath, 'utf8');
  
  // Find JSON object in .env (service account key)
  const jsonMatch = envContent.match(/\{[\s\S]*"type":[\s\S]*"private_key"[\s\S]*\}/);
  
  if (jsonMatch) {
    const credentials = JSON.parse(jsonMatch[0]);
    
    // Save to temp file for Node.js to use
    const credPath = path.join(__dirname, 'google-vision-credentials.json');
    fs.writeFileSync(credPath, JSON.stringify(credentials, null, 2));
    
    // Set environment variable
    process.env.GOOGLE_APPLICATION_CREDENTIALS = credPath;
    
    console.log('✅ Google Vision credentials configured');
    console.log('   Credentials file: ' + credPath);
    console.log('   Project ID: ' + credentials.project_id);
    console.log('   Service Account: ' + credentials.client_email);
  } else {
    console.log('⚠️  No Google Cloud credentials found in .env file');
    console.log('   PDF processing will not be available');
  }
} catch (err) {
  console.log('⚠️  Could not set up Google Vision credentials');
  console.log('   Error:', err.message);
}

module.exports = { setupComplete: true };
