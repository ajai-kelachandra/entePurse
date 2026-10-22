# Mony

Personal money manager: salary, fixed EMIs, expenses, budgets, goals and reports. Amounts are in ₹ (Indian number format).

## Setup
1. Create a Firebase project. Enable **Authentication** (Email/Password and Google) and **Firestore**.
2. Copy `.env.local.example` to `.env.local` and fill in your web app config.
3. Deploy `firestore.rules` (each user can only read and write `users/{uid}/**`).
4. `npm install --legacy-peer-deps`, then `npm run dev`.

## Data model (Firestore)
`users/{uid}` holds the profile. Subcollections: `transactions`, `commitments`, `budgets`, `goals`.

## Money model
Spendable = salary + extra income − active fixed commitments.
"Spent" counts discretionary expenses only; EMI payments are already in the fixed total.
EMI transactions use the deterministic id `emi_{commitmentId}_{yyyy-MM}`, so auto-generation and "Mark as paid" never double-count.
