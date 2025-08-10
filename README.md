# 49ers Racing Wiki

A lightweight internal documentation system for the 49ers Racing IC race teams. Built with React, Firebase, and Tailwind CSS.

## Features

- **Authentication**: Secure login system using Firebase Authentication
- **Subteam Organization**: 7 main subteams (Driver Controls, Chassis, Electronics, Vehicle Dynamics, Aerodynamics, Business, Powertrain)
- **Document Management**: Create, view, and organize documents by subteam and tags
- **File Attachments**: Upload and manage various file types (PDFs, images, etc.)
- **Modern UI**: Clean, responsive design with 49ers team branding
- **Real-time Data**: All data stored in Google Firestore for real-time updates

## Tech Stack

- **Frontend**: React 18 with React Router
- **Styling**: Tailwind CSS
- **Backend**: Firebase (Authentication, Firestore, Storage)
- **Icons**: Lucide React
- **Build Tool**: Create React App

## Setup Instructions

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Firebase project with Authentication, Firestore, and Storage enabled

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd 49ers-racing-wiki
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Firebase**
   - Create a new Firebase project at [Firebase Console](https://console.firebase.google.com/)
   - Enable Authentication (Email/Password)
   - Enable Firestore Database
   - Enable Storage
   - Get your Firebase configuration from Project Settings

4. **Update Firebase Configuration**
   - Open `src/firebase.js`
   - Replace the placeholder configuration with your actual Firebase config:
   ```javascript
   const firebaseConfig = {
     apiKey: "your-api-key",
     authDomain: "your-project.firebaseapp.com",
     projectId: "your-project-id",
     storageBucket: "your-project.appspot.com",
     messagingSenderId: "your-sender-id",
     appId: "your-app-id"
   };
   ```

5. **Set up Firestore Security Rules**
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

6. **Set up Storage Security Rules**
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

7. **Start the development server**
   ```bash
   npm start
   ```

8. **Build for production**
   ```bash
   npm run build
   ```

## Usage

### Authentication
- Users must sign in with their email and password
- Only authenticated users can access the wiki

### Creating Documents
1. Click "Create New Doc" from the dashboard
2. Select a subteam from the 7 available options
3. Choose or create a tag for the document
4. Write your content in the large text area
5. Optionally upload attachments
6. Click "Save Document"

### Browsing Documents
1. From the dashboard, click on any subteam card
2. View all documents for that subteam
3. Filter by tags using the tag buttons
4. Click on any document to view its full content and attachments

### File Attachments
- Supported file types: PDFs, images, and any other file type
- Files are stored in Firebase Storage
- Users can view and download attachments

## Deployment

### NameCheap Hosting
1. Build the project: `npm run build`
2. Upload the contents of the `build` folder to your NameCheap hosting
3. Configure your domain to point to the hosting

### Firebase Hosting (Alternative)
1. Install Firebase CLI: `npm install -g firebase-tools`
2. Login: `firebase login`
3. Initialize: `firebase init hosting`
4. Build: `npm run build`
5. Deploy: `firebase deploy`

## Project Structure

```
src/
├── components/          # React components
│   ├── Login.js        # Authentication screen
│   ├── Dashboard.js    # Main dashboard with subteam cards
│   ├── CreateDocument.js # Document creation form
│   ├── SubteamPosts.js # Subteam document list
│   └── DocumentView.js # Individual document view
├── contexts/           # React contexts
│   └── AuthContext.js  # Authentication context
├── firebase.js         # Firebase configuration
├── App.js             # Main app component with routing
├── index.js           # App entry point
└── index.css          # Global styles with Tailwind
```

## Customization

### Colors
The app uses 49ers team colors defined in `tailwind.config.js`:
- Primary red: `#AA0000`
- Gold accent: `#B3995D`

### Subteams
To modify subteams, update the `subteams` array in:
- `src/components/Dashboard.js`
- `src/components/CreateDocument.js`
- `src/components/SubteamPosts.js`
- `src/components/DocumentView.js`

## Security Considerations

- All routes are protected and require authentication
- Firestore security rules ensure only authenticated users can read/write
- File uploads are restricted to authenticated users
- No sensitive data is stored in client-side code

## Support

For issues or questions, please contact the development team or create an issue in the repository. 