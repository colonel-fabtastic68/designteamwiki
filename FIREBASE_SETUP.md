# Firebase Setup Guide for 49ers Racing Wiki

## 🔥 Firebase Project Configuration

**Project Details:**
- Project ID: `[HIDDEN - Use environment variable REACT_APP_FIREBASE_PROJECT_ID]`
- Project Number: `[HIDDEN - Use environment variable REACT_APP_FIREBASE_MESSAGING_SENDER_ID]`
- Web API Key: `[HIDDEN - Use environment variable REACT_APP_FIREBASE_API_KEY]`
- Storage Bucket: `[HIDDEN - Use environment variable REACT_APP_FIREBASE_STORAGE_BUCKET]`

## 📋 Required Setup Steps

### 1. Get Your App ID
1. Go to [Firebase Console](https://console.firebase.google.com/project/designteam-d7406)
2. Click ⚙️ (Settings) → Project Settings
3. Scroll to "Your apps" section
4. If no web app exists, click "Add app" → Web app
5. Copy the `appId` from the config
6. Replace `YOUR_APP_ID_HERE` in `src/firebase.js`

### 2. Enable Authentication
1. Go to Authentication → Sign-in method
2. Enable "Email/Password"
3. Add test users if needed

### 3. Enable Firestore Database
1. Go to Firestore Database
2. Click "Create database"
3. Choose "Start in test mode" (we'll secure it later)
4. Select a location (choose closest to your team)

### 4. Enable Storage
1. Go to Storage
2. Click "Get started"
3. Choose "Start in test mode" (we'll secure it later)
4. Select the same location as Firestore

## 🔒 Security Rules

### Firestore Rules
Go to Firestore Database → Rules and paste:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /documents/{document} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### Storage Rules
Go to Storage → Rules and paste:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /attachments/{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## 📁 File Upload Structure

Files will be stored in Firebase Storage with this structure:
```
gs://designteam-d7406.firebasestorage.app/
└── attachments/
    ├── 1703123456789_document.pdf
    ├── 1703123456790_image.jpg
    └── 1703123456791_specs.docx
```

## 🧪 Testing File Uploads

1. **Start the app**: `npm start`
2. **Login** with test credentials
3. **Create a document** and upload files
4. **Check Storage** in Firebase Console to see uploaded files

## 🔧 Troubleshooting

### Common Issues:

**"Permission denied" errors:**
- Check that Storage rules are set correctly
- Ensure user is authenticated
- Verify bucket name matches

**"App not found" errors:**
- Make sure App ID is correct in `src/firebase.js`
- Check that web app is registered in Firebase Console

**File upload fails:**
- Check browser console for errors
- Verify file size (default limit is 5MB)
- Ensure file type is allowed

## 📊 Monitoring

### Firebase Console Monitoring:
- **Authentication**: View user sign-ins
- **Firestore**: Monitor document reads/writes
- **Storage**: Track file uploads and usage

### Usage Limits:
- **Free Tier**: 1GB storage, 10GB/month transfer
- **Paid**: $0.026/GB/month storage, $0.12/GB transfer

## 🚀 Production Deployment

### For NameCheap Hosting:
1. Build: `npm run build`
2. Upload `build/` folder contents
3. Configure domain in NameCheap

### For Firebase Hosting:
1. Install CLI: `npm install -g firebase-tools`
2. Login: `firebase login`
3. Initialize: `firebase init hosting`
4. Deploy: `firebase deploy`

## 📞 Support

If you encounter issues:
1. Check Firebase Console for error logs
2. Verify all services are enabled
3. Test with a simple file upload first
4. Check browser console for JavaScript errors 