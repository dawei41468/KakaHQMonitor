# Kaka HQ Monitor

A full-stack web application for monitoring and managing orders from dealers at Kaka headquarters.

## Features

- **Dashboard**: Real-time metrics, dealer performance charts, recent orders, alerts
- **Order Management**: Track order lifecycle from received to delivered
- **Inventory Control**: Monitor stock levels, low-stock alerts, material management
- **Dealer Management**: Performance tracking for 5 territories (Shenzhen, Guangzhou, Foshan, Hangzhou, Chengdu)
- **Alert System**: Priority-based notifications for delays, low stock, critical issues
- **Admin Panel**: Full CRUD operations for users, dealers, orders, materials, alerts
- **Authentication**: JWT-based login with role-based access (admin/standard)

## Tech Stack

- **Frontend:** React, TypeScript, Vite, Tailwind CSS, shadcn/ui
- **Backend:** Node.js, Express, TypeScript, Drizzle ORM
- **Database:** PostgreSQL
- **Authentication:** Custom JWT implementation with refresh token rotation

## Installation

### Prerequisites
- Node.js 18+
- PostgreSQL database
- Git

### Setup Steps

1. Clone the repository:
    ```bash
    git clone git@github.com:dawei41468/KakaHQMonitor.git
    cd KakaHQMonitor
    ```

2. Install dependencies:
    ```bash
    npm install
    ```

3. Set up environment variables:
    - Configure your database URL (either in `.env` file or inline):
    ```bash
    DATABASE_URL="postgresql://dawei@localhost:5432/kaka_monitor"
    ```

4. Set up the database:
    ```bash
    npm run db:push
    npx tsx server/seed.ts
    ```

5. Start the development server:
    ```bash
    DATABASE_URL="postgresql://dawei@localhost:5432/kaka_monitor" JWT_SECRET="a9240bfe10c2934a85204464cda223faa54e7e54b2b0631eac598f972ed6e369" REFRESH_SECRET="2164bb29be8432e780eea314b409f583531e07296d0ebe2e4b74ebfce370d85b" CSRF_SECRET="a4c6df5cde48013798d2078091acd9cf9257da63de35bdc513db6e607b984f86" npm run dev
    ```

    Or create a `.env` file in the project root with:
    ```env
    DATABASE_URL=postgresql://dawei@localhost:5432/kaka_monitor
    JWT_SECRET=a9240bfe10c2934a85204464cda223faa54e7e54b2b0631eac598f972ed6e369
    REFRESH_SECRET=2164bb29be8432e780eea314b409f583531e07296d0ebe2e4b74ebfce370d85b
    CSRF_SECRET=a4c6df5cde48013798d2078091acd9cf9257da63de35bdc513db6e607b984f86
    ```

## Usage

- **Application**: Access at `http://localhost:3000` (serves both frontend and API in development)
- **Admin Login**: `admin@kaka-hq.com` / `admin123`
- **Navigation**: Dashboard (metrics & charts), Profile (user settings), Admin (management panel for admins only)

### User Roles
- **Admin**: Full access to all features, user/dealer/order/material management
- **Standard**: Read-only access to dashboard, orders, alerts

## Project Structure

```
KakaHQMonitor/
├── client/                 # React frontend application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   │   ├── ui/        # shadcn/ui component library
│   │   │   └── ...        # App-specific components
│   │   ├── pages/         # Route-level page components
│   │   ├── hooks/         # Custom React hooks
│   │   └── lib/           # Utilities and configurations
├── server/                 # Express backend API
│   ├── auth.ts            # JWT authentication logic
│   ├── db.ts              # Database connection
│   ├── index.ts           # Server entry point
│   ├── routes.ts          # API route definitions
│   ├── storage.ts         # Data access layer
│   └── seed.ts            # Database seeding script
├── shared/                 # Type-safe shared code
│   └── schema.ts          # Database schema & types
├── docs/                   # Documentation
└── drizzle.config.ts       # Database migration config
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is private and proprietary.