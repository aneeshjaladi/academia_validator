# Google Cloud Vision API Setup

To enable PDF certificate processing via Google Cloud Vision API, follow these steps:

## Step 1: Create a Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing one
3. Note your **Project ID**

## Step 2: Enable Vision API
1. Search for "Vision API" in the search bar
2. Click on "Cloud Vision API"
3. Click the **"ENABLE"** button

## Step 3: Create Service Account
1. Go to **APIs & Services** → **Credentials**
2. Click **"Create Credentials"** → **"Service Account"**
3. Fill in service account details:
   - Service account name: `certverify-ocr` (or any name)
   - Click **"CREATE AND CONTINUE"**
4. Grant V role: **Editor** (or just Vision API User)
5. Click **"CONTINUE"** then **"DONE"**

## Step 4: Create and Download Key
1. Go to **APIs & Services** → **Service Accounts**
2. Click on the service account you created
3. Go to **KEYS** tab
4. Click **"ADD KEY"** → **"Create new key"**
5. Choose **JSON** format
6. Click **"CREATE"** - the JSON file will download automatically

## Step 5: Configure Backend
1. Save the downloaded JSON key file to a secure location (e.g., `~/.config/gcloud/certverify-key.json`)
2. Set environment variable:
   ```bash
   # Linux/Mac
   export GOOGLE_APPLICATION_CREDENTIALS="/path/to/your/key.json"
   
   # Windows (PowerShell)
   $env:GOOGLE_APPLICATION_CREDENTIALS="C:\path\to\your\key.json"
   ```
3. Or add to `.env` file:
   ```
   GOOGLE_APPLICATION_CREDENTIALS=/path/to/your/key.json
   ```

## Step 6: Restart Backend
```bash
npm start
```

## Verification
- Upload a PDF certificate through the web interface
- Check server logs for "Using Google Cloud Vision API..." message
- If not configured, you'll see "Using Tesseract.js..." (images only, no PDF support)

## Pricing
- Google Cloud Vision API has a **free tier**: 1,000 images/month
- After that: ~$1.50 per 1,000 images
- See [Vision API Pricing](https://cloud.google.com/vision/pricing)

## Troubleshooting
- **"Vision API not configured"**: Check that GOOGLE_APPLICATION_CREDENTIALS env variable is set
- **"Permission denied"**: Ensure service account has Vision API access
- **"PDF processing failed"**: Verify the PDF is valid and not corrupted
- **PDFs not working**: Google Vision API may not be enabled on your service account

## Fallback (No Google Vision)
If you don't set up Google Vision:
- **JPEG/PNG images**: Will use Tesseract.js (free, but less accurate)
- **PDF files**: Will be rejected with an error message
- Feature: File upload will still work for images
