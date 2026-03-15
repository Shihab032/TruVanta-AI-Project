# TruVanta – AI-Driven Trust-Based Marketplace

## Project Structure

```
truvanta/
├── index.html                  ← Main entry point (open this in browser)
├── package.json                ← Node.js project config
│
├── frontend/
│   ├── css/
│   │   └── styles.css          ← All app styles (dark theme, components)
│   └── js/
│       ├── data.js             ← 851 providers DB (Electrician, Plumber, Teacher, Cleaner)
│       └── app.js              ← All app logic (auth, routing, payments, OTP, search)
│
└── backend/
    └── server.js               ← Node/Express server (serves frontend, ready to extend)
```

## How to Run

### Option 1 – Open directly in browser (no server needed)
Just open `index.html` in any browser. Everything runs client-side.

### Option 2 – Run with Node.js server
```bash
npm install
npm start
# → Open http://localhost:3000
```

## Tech Stack
- **Frontend**: Vanilla JS, Bootstrap 5, Font Awesome 6
- **Auth**: Gmail OTP via EmailJS
- **Payments**: USD Stripe escrow (client-side flow)
- **Database**: localStorage (browser-based, 851 real providers)
- **Backend**: Node.js / Express (ready to extend)

## Features
- 851 providers from 4 real datasets (Electrician, Plumber, Teacher, Cleaner)
- Role-based access (Customer / Provider)
- Gmail OTP authentication
- AI Trust Score system
- Emergency provider dispatch
- Nearby provider randomization
- USD Stripe escrow payments with fee breakdown
