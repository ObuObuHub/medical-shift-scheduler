# Hospital Manager Account Setup Guide

## Overview
This guide explains how to set up the two hospital manager accounts with the rule: **Different manager = Different hospital**

## Manager Accounts to Create

### Manager 1 - Piatra-Neamț Hospital
- **Username:** manager.spital1
- **Password:** [Contact system administrator]
- **Hospital:** spital1 (Spitalul Județean de Urgență Piatra-Neamț)
- **Access:** Can only see and manage staff/shifts for spital1

### Manager 2 - Buhuși Hospital
- **Username:** manager.spital2
- **Password:** [Contact system administrator]
- **Hospital:** spital2 (Spitalul "Prof. Dr. Eduard Apetrei" Buhuși)
- **Access:** Can only see and manage staff/shifts for spital2

## How to Create These Accounts

### Option 1: Using the Web Interface (Easiest)

1. **Log in as Administrator**
   - Go to your application login page
   - Use your administrator credentials

2. **Navigate to User Management**
   - Look for "Users" or "User Management" in the admin menu
   - Click on "Add New User" or similar button

3. **Create Manager 1**
   - Fill in the form:
     - Name: `Manager Spitalul Județean de Urgență Piatra-Neamț`
     - Username: `manager.spital1`
     - Password: `[Contact administrator]`
     - Role: `manager`
     - Hospital: `spital1`
     - Type: `medic`
   - Click Save/Create

4. **Create Manager 2**
   - Fill in the form:
     - Name: `Manager Spitalul Prof. Dr. Eduard Apetrei Buhuși`
     - Username: `manager.spital2`
     - Password: `[Contact administrator]`
     - Role: `manager`
     - Hospital: `spital2`
     - Type: `medic`
   - Click Save/Create

### Option 2: Using Browser Console (Technical)

1. Log in as admin first
2. Open Developer Tools (press F12)
3. Go to Console tab
4. Run the commands from `scripts/create-managers-api.js`

## Testing the Login

After creating the accounts, test each one:

1. **Log out** from the admin account
2. **Test Manager 1:**
   - Username: `manager.spital1`
   - Password: `SP1a4`
   - Verify: Should only see spital1 data
3. **Test Manager 2:**
   - Username: `manager.spital2`
   - Password: `BH2x9`
   - Verify: Should only see spital2 data

## Important Security Notes

- Each manager can ONLY see their assigned hospital
- Managers cannot create admin accounts
- Managers can create staff accounts only for their hospital
- Keep the passwords secure and change them after first login if needed

## Troubleshooting

If you encounter issues:

1. **"Username already exists"** - The manager account was already created
2. **"Unauthorized"** - Make sure you're logged in as admin
3. **Cannot see the right hospital** - Check the hospital assignment in user settings

## Manager Capabilities

Once logged in, managers can:
- ✅ View all staff in their hospital
- ✅ Create new staff accounts for their hospital
- ✅ Manage shift schedules for their hospital
- ✅ View reports for their hospital
- ❌ Cannot see other hospitals' data
- ❌ Cannot create admin or manager accounts
- ❌ Cannot modify system settings