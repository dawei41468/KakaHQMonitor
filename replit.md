# Kaka HQ Monitoring Dashboard

## Overview

This is a business monitoring web application for Kaka HQ, a company specializing in balcony and garden upgrades. The system enables the headquarters team to manage orders from 5 main dealers (Shenzhen, Guangzhou, Foshan, Hangzhou, Chengdu), track production workflows, monitor inventory, and oversee deliveries. The application provides real-time visibility into business operations through a comprehensive dashboard interface with order tracking, dealer performance analytics, inventory management, and alert systems.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript using Vite as the build tool
- **UI Library**: Custom component system built on Radix UI primitives with shadcn/ui components
- **Styling**: Tailwind CSS with custom design system following Material Design principles
- **State Management**: TanStack React Query for server state management and caching
- **Routing**: Wouter for lightweight client-side routing
- **Authentication**: Context-based auth provider with JWT token management
- **Theme System**: Custom theme provider supporting light/dark modes with CSS variables

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Database ORM**: Drizzle ORM for type-safe database operations
- **Authentication**: JWT-based authentication with access/refresh token pattern
- **API Design**: RESTful API endpoints with consistent error handling
- **Session Management**: Secure token storage and automatic refresh mechanisms

### Database Design
- **Primary Database**: PostgreSQL (configured for Neon serverless)
- **Schema Structure**: 
  - Users table for HQ team authentication and authorization
  - Dealers table for managing 5 territory partners
  - Orders table for tracking order lifecycle from receipt to delivery
  - Materials table for inventory management with stock thresholds
  - Alerts table for system notifications and warnings
- **Data Relationships**: Properly normalized schema with foreign key constraints
- **Migration System**: Drizzle Kit for database schema versioning

### Authentication & Security
- **Token Strategy**: Dual-token system (short-lived access tokens, longer-lived refresh tokens)
- **Password Security**: bcrypt for password hashing
- **Authorization**: Role-based access control (admin vs standard users)
- **API Security**: Middleware-based authentication for protected routes
- **CORS & Security Headers**: Configured for production deployment

### Design System
- **Color Palette**: Professional blue primary with context-aware status colors
- **Typography**: Inter font family with consistent sizing and weights
- **Component Library**: Comprehensive set of reusable UI components
- **Responsive Design**: Mobile-first approach with breakpoint-based layouts
- **Accessibility**: ARIA compliance and keyboard navigation support

## External Dependencies

### Database Services
- **Neon Database**: Serverless PostgreSQL hosting with connection pooling
- **Drizzle ORM**: Type-safe database toolkit for schema management and queries

### UI/UX Libraries
- **Radix UI**: Headless component primitives for accessibility and behavior
- **Tailwind CSS**: Utility-first CSS framework for responsive design
- **Lucide React**: Icon library for consistent iconography
- **Recharts**: Chart library for data visualization and analytics

### Development Tools
- **Vite**: Fast build tool with HMR and optimized bundling
- **TypeScript**: Static type checking and enhanced developer experience
- **React Query**: Server state management with caching and synchronization
- **React Hook Form**: Form handling with validation

### Authentication & Security
- **jsonwebtoken**: JWT token generation and verification
- **bcryptjs**: Password hashing and comparison utilities

### Production Considerations
- **Build Process**: Vite for frontend bundling, esbuild for backend compilation
- **Environment Configuration**: Environment variables for database URLs and secrets
- **Deployment Ready**: Configured for cloud deployment with static asset serving