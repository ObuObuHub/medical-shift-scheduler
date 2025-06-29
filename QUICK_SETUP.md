# Quick Setup - Manager Accounts

## What I've Done

I've added a manager login section below each hospital on the main page. Now each hospital has its own "Acces Manager" button.

## To Create the Manager Accounts

### Easy Method - Use the Setup Page:

1. Open your browser and go to: `http://localhost:3000/setup-managers.html`
2. Click the "Creează Conturi Manager" button
3. The page will create both manager accounts automatically

### What You'll Get:

**Manager 1 - Piatra-Neamț Hospital:**
- Username: `manager.spital1`
- Password: `[Contact administrator]`
- Can only manage Spitalul Județean de Urgență Piatra-Neamț

**Manager 2 - Buhuși Hospital:**
- Username: `manager.spital2`
- Password: `[Contact administrator]`
- Can only manage Spitalul "Prof. Dr. Eduard Apetrei" Buhuși

## How to Use

1. Go to the main page
2. Under each hospital card, click "Acces Manager"
3. Enter the manager credentials for that specific hospital
4. Click "Intră ca Manager"
5. The manager will be logged in and can only see their hospital's data

## Security

- Each manager can ONLY access their assigned hospital
- If a manager tries to log in under the wrong hospital, they will get an error
- The system enforces strict hospital separation

## Testing

After creating the accounts:
1. Try logging in as manager.spital1 under Piatra-Neamț hospital ✓
2. Try logging in as manager.spital1 under Buhuși hospital ✗ (should fail)
3. Try logging in as manager.spital2 under Buhuși hospital ✓
4. Try logging in as manager.spital2 under Piatra-Neamț hospital ✗ (should fail)