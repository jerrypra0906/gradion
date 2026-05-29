# LangkahKecil Frontend Guide

## Overview

The frontend is built with Next.js 14, TypeScript, Tailwind CSS, and Zustand for state management.

## Access

- **Frontend URL**: http://localhost:5000
- **Backend API**: http://localhost:5001/api

## Features Implemented

### 1. Authentication
- ✅ Login page (`/login`)
- ✅ Registration page (`/register`)
- ✅ JWT token management
- ✅ Protected routes
- ✅ Auto-redirect based on auth status
- ✅ Email verification page (`/verify-email`) with resend flow
- ✅ Google Sign-In button (using `@react-oauth/google`)

### 2. Dashboard
- ✅ Role-based dashboard (`/dashboard`)
- ✅ Different views for Parent, Therapist, and Admin
- ✅ Statistics cards
- ✅ Quick actions
- ✅ Recent children/sessions list

### 3. Child Management
- ✅ List all children (`/dashboard/children`)
- ✅ View child details (`/dashboard/children/[id]`)
- ✅ Create new child (`/dashboard/children/new`)
- ✅ Quota tracking with visual progress bar
- ✅ Session history per child

### 4. Session Management
- ✅ List all sessions (`/dashboard/sessions`) - Therapist/Admin
- ✅ Create new session (`/dashboard/sessions/new`)
- ✅ Multiple goals per session
- ✅ Session notes
- ✅ Quota enforcement

### 5. UI Components
- ✅ Button component (multiple variants)
- ✅ Input component (with labels and errors)
- ✅ Dashboard layout with navigation
- ✅ Responsive design

## User Flows

### Parent Flow
1. Register/Login → Dashboard
2. View children → Add child → View child details
3. View session history for each child

### Therapist Flow
1. Register/Login → Dashboard
2. View assigned children
3. Record sessions → Select child → Enter goals and notes
4. View session history

### Admin Flow
1. Register/Login → Dashboard
2. View all children and sessions
3. Full access to all features

## State Management

Using Zustand with persistence:
- `useAuthStore` - Authentication state
- User data persisted in localStorage
- Auto-fetch current user on app load

## API Integration

All API calls go through `apiClient` from `@/lib/api`:
- Automatic token injection
- Error handling
- Auto-redirect on 401

## Next Steps

- [ ] Add edit/delete functionality for children
- [ ] Add edit/delete functionality for sessions
- [ ] Add reports and charts
- [ ] Add banner/CMS pages
- [ ] Add therapist-child assignment
- [ ] Add quota management (admin)
- [ ] Add user management (admin)
- [ ] Add file upload support
- [ ] Add AI features integration

## Testing

1. **Register a new user:**
   - Go to http://localhost:5000/register
   - Fill in the form
   - Select role (parent, therapist, or admin)
   - Submit
   - Check your inbox and click the verification link before logging in

2. **Verify email / resend link:**
   - Visit http://localhost:5000/verify-email
   - Paste the `token` query parameter from the email OR request a new email
   - Return to `/login` once verified

2. **Login:**
   - Go to http://localhost:5000/login
   - Enter credentials
   - You'll be redirected to dashboard
   - Alternatively, use the Google Sign-In button if configured

3. **Test Parent Flow:**
   - Register as parent
   - Add a child
   - View child details
   - Check quota tracking

4. **Test Therapist Flow:**
   - Register as therapist
   - View assigned children (will be empty initially)
   - Record a session (need to assign therapist to child first via API or admin)

5. **Test Admin Flow:**
   - Register as admin
   - View all children and sessions
   - Full access to all features

## Development

### Run Locally (without Docker)

```bash
cd frontend
npm install
npm run dev
```

### Build for Production

```bash
cd frontend
npm run build
npm start
```

## File Structure

```
frontend/src/
├── app/
│   ├── dashboard/
│   │   ├── children/
│   │   │   ├── [id]/          # Child detail page
│   │   │   ├── new/           # Create child
│   │   │   └── page.tsx       # List children
│   │   ├── sessions/
│   │   │   ├── new/           # Create session
│   │   │   └── page.tsx       # List sessions
│   │   └── page.tsx           # Dashboard home
│   ├── login/
│   ├── register/
│   ├── verify-email/
│   └── page.tsx               # Landing page
├── components/
│   ├── layout/
│   │   └── DashboardLayout.tsx
│   ├── auth/
│   │   └── GoogleAuthButton.tsx
│   └── providers/
│       └── AppProviders.tsx
│   └── ui/
│       ├── Button.tsx
│       └── Input.tsx
├── lib/
│   ├── api.ts                 # API client
│   └── utils.ts               # Utilities
└── store/
    └── authStore.ts           # Auth state
```

