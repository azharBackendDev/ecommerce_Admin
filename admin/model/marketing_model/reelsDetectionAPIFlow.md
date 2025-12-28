User selects video/image
↓
Frontend → "Detecting..."
↓
Upload to TEMP storage
↓
Google Vision (image, logo, OCR)
↓
AWS Rekognition (video moderation)
↓
ACRCloud (audio copyright)
↓
Decision Engine (rules / OpenAI)
↓
✅ Approved → Publish
❌ Rejected → Reason shown
