# Firebase Indexes for Serial Number Feature

## Overview
The serial number feature requires Firestore indexes to efficiently query documents by subteam and serial number.

## Required Indexes
The following indexes need to be created in your Firebase Console:

### 1. Subteam + Serial Number (Ascending)
- Collection: `documents`
- Fields:
  - `subteam` (Ascending)
  - `serialNumber` (Ascending)

### 2. Subteam + Serial Number (Descending)
- Collection: `documents`
- Fields:
  - `subteam` (Ascending)
  - `serialNumber` (Descending)

## How to Create Indexes

### Option 1: Firebase Console (Recommended)
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project: `designteam-d7406`
3. Navigate to Firestore Database
4. Click on the "Indexes" tab
5. Click "Create Index"
6. Add the indexes listed above

### Option 2: Firebase CLI
If you have Firebase CLI installed:
```bash
firebase deploy --only firestore:indexes
```

## Serial Number Format
Documents will be assigned serial numbers in the format: `KB{prefix}{counter}`

- KB0: Reserved for general tips
- KB1: Reserved for admin/team leads
- KB2: Aerodynamics
- KB3: Chassis
- KB4: Driver Controls
- KB5: Electronics
- KB6: Powertrain
- KB7: Vehicle Dynamics
- KB8: Business
- KB9: Reserved for other uses

Each subteam starts with counter 0001 and increments by 1 for each new document.

## Testing
After creating the indexes, test the serial number generation by:
1. Creating a new document in any subteam
2. Verifying the serial number is assigned correctly
3. Creating multiple documents to ensure proper incrementing 