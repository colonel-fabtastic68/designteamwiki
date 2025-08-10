# Account Request System

## Overview

The Design Team Wiki now includes a comprehensive account management system that allows users to request accounts and captains to approve/deny them.

## Features

### For Users
- **Request Account**: Users can request an account by filling out a form with their design team information
- **Form Fields**: First Name, Last Name, School Email, Team Role (Team Lead or Design Team), and Subteam
- **Email Validation**: Only school email addresses (.edu) are accepted
- **Status Tracking**: Users receive confirmation when their request is submitted

### For Captains
- **Account Management**: Captains can view, approve, and deny account requests
- **User Management**: Only captains can create, edit, and remove accounts
- **Team Member Sync**: Approved users automatically appear in their respective subteam member lists

## User Roles

### Captain
- Full access to account management
- Can approve/deny account requests
- Can view all team members across subteams
- Access to the "Account Requests" button in the dashboard

### Team Lead
- Standard user access
- Can view and edit documents
- Appears in team member lists with crown icon

### Design Team
- Standard user access
- Can view and edit documents
- Appears in team member lists

## Database Structure

### accountRequests Collection
```javascript
{
  firstName: string,
  lastName: string,
  email: string,
  role: 'team-lead' | 'design-team',
  subteam: string,
  status: 'pending' | 'approved' | 'denied',
  createdAt: timestamp,
  fullName: string
}
```

### users Collection
```javascript
{
  email: string,
  firstName: string,
  lastName: string,
  fullName: string,
  role: 'captain' | 'team-lead' | 'design-team',
  subteam: string,
  status: 'active' | 'inactive',
  createdAt: timestamp,
  approvedAt: timestamp
}
```

## Setup Instructions

1. **Create Captain Account**: Use the provided script or manually create a captain user in the `users` collection
2. **Firebase Rules**: Ensure proper security rules are set up for the new collections
3. **Testing**: Test the account request flow with different email addresses and roles

## Security Considerations

- Only school email addresses are accepted
- Captains have exclusive access to account management
- User data is stored securely in Firestore
- Account status is tracked and auditable

## Future Enhancements

- Email notifications for approved/denied requests
- Bulk account management features
- User profile management
- Account deactivation/reactivation 