# Captain Management Guide

## Overview

As the site maintainer, you have access to a comprehensive captain management system that allows you to add, edit, and remove team captains.

## Accessing the Admin Panel

1. **Direct Access**: Navigate to `/admin` in your browser
2. **No Authentication Required**: The admin panel is accessible without login for site maintenance

## Adding Ben as Captain

### Method 1: Using the Admin Panel (Recommended)

1. Go to `/admin` in your browser
2. Click "Add Captain"
3. Fill in Ben's information:
   - **First Name**: Ben
   - **Last Name**: [Ben's last name]
   - **Email**: [Ben's actual email address]
   - **Primary Subteam**: General (or his specific subteam)
4. Click "Add Captain"

### Method 2: Using the Script

1. Open the browser console (F12)
2. Copy and paste the contents of `add-ben-captain.js`
3. Update the email address with Ben's actual email
4. Run the script

### Method 3: Manual Database Entry

1. Go to Firebase Console
2. Navigate to Firestore Database
3. Create a new document in the `users` collection
4. Use Ben's Firebase Auth UID as the document ID: `IWCMut35XJYx9mYk48wfSHWi5Fo1`
5. Add the following fields:

```javascript
{
  email: "ben@example.com", // Ben's actual email
  firstName: "Ben",
  lastName: "Captain", // Ben's actual last name
  fullName: "Ben Captain", // Ben's full name
  role: "captain",
  subteam: "general",
  status: "active",
  createdAt: [server timestamp],
  approvedAt: [server timestamp],
  firebaseUID: "IWCMut35XJYx9mYk48wfSHWi5Fo1"
}
```

## Managing Captains

### Viewing Current Captains
- Access `/admin` to see all current captains
- Each captain shows their name, email, subteam, and when they were added

### Editing Captains
1. Click "Edit" next to any captain
2. Modify their information
3. Click "Update Captain"

### Removing Captains
1. Click "Remove" next to any captain
2. Confirm the deletion
3. The captain will be removed from the system

## Captain Permissions

Once a user is designated as a captain, they will have access to:

- **Account Requests Button**: Appears in their dashboard
- **Account Management**: Can approve/deny account requests
- **Full Access**: Can view all team members and manage accounts

## Security Considerations

- Only captains can manage account requests
- The admin panel is accessible without authentication for maintenance
- Consider adding authentication to the admin panel in production
- All captain changes are logged in Firestore

## Troubleshooting

### Ben Can't Access Captain Features
1. Verify Ben's user document exists in Firestore
2. Check that the `role` field is set to `"captain"`
3. Ensure the `status` field is set to `"active"`
4. Verify the document ID matches Ben's Firebase Auth UID

### Admin Panel Not Working
1. Check browser console for errors
2. Verify Firebase configuration
3. Ensure Firestore rules allow read/write access

### Adding Multiple Captains
- You can have multiple captains
- Each captain has the same permissions
- Consider assigning different subteams to different captains

## Future Enhancements

- Email notifications for captain changes
- Captain role hierarchy (head captain, sub-captains)
- Captain activity logging
- Bulk captain management features 