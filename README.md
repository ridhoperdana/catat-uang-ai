# Daily Expense Tracker

A modern web application for collecting daily expenses, tracking income, and managing recurring costs with AI-powered invoice scanning.

## Folder and Code Structure

```text
├── client/              # Frontend React application (Vite)
│   ├── src/
│   │   ├── components/  # Reusable UI components (Shadcn UI)
│   │   ├── hooks/       # Custom React hooks
│   │   ├── lib/         # Utility functions and API clients
│   │   ├── pages/       # Application pages/routes
│   │   ├── App.tsx      # Main application entry and routing
│   │   └── index.css    # Global styles and Tailwind configuration
├── server/              # Backend Express application
│   ├── replit_integrations/ # Native Replit integrations (Auth, AI, etc.)
│   ├── db.ts            # Database connection and configuration
│   ├── index.ts         # Server entry point
│   ├── routes.ts        # API route handlers
│   └── storage.ts       # Data access layer (CRUD operations)
├── shared/              # Code shared between frontend and backend
│   ├── models/          # Specialized data models
│   ├── routes.ts        # Shared API contract and types
│   └── schema.ts        # Database schema definitions (Drizzle)
└── uploads/             # Temporary storage for uploaded invoices
```

## Requirements

- **Node.js**: v20 or later
- **Database**: PostgreSQL (managed via Drizzle ORM)
- **AI Integration**: OpenRouter API key or Replit AI Integration for invoice scanning.

## How to Run the App Inside Docker

### 1. Create a `Dockerfile`

Create a file named `Dockerfile` in the root directory:

```dockerfile
FROM node:20-slim

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Build frontend and backend
RUN npm run build

EXPOSE 5000

CMD ["npm", "start"]
```

### 2. Create a `docker-compose.yml`

To run with a PostgreSQL database:

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "5000:5000"
    environment:
      - DATABASE_URL=postgres://user:password@db:5432/expense_tracker
      - AI_INTEGRATIONS_OPENROUTER_API_KEY=your_key_here
    depends_on:
      - db

  db:
    image: postgres:15
    environment:
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=expense_tracker
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

### 3. Build and Run

```bash
docker-compose up --build
```

## Features

- **Daily Expense Recording**: Track income and outcomes with categories.
- **Monthly Income Tracking**: Summary of monthly earnings.
- **Recurring Expenses**: Automate tracking for subscription-based costs.
- **AI Invoice Scanning**: Extract data from receipts using GPT-4o.
- **CSV Export**: Download your transaction history for external use.
- **Offline First**: Optimized for reliable usage and sync.
