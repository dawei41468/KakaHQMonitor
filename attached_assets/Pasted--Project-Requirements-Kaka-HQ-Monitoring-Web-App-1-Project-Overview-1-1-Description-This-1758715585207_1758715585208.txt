# Project Requirements: Kaka HQ Monitoring Web App

## 1. Project Overview

### 1.1 Description
This web-based tool is designed for the headquarters (HQ) team of Kaka, a business specializing in selling balcony and garden upgrades. The HQ team receives orders from 5 main dealers located in Shenzhen, Guangzhou, Foshan, Hangzhou, and Chengdu. Each dealer is responsible for their respective city/territory.

The tool facilitates order management by allowing the HQ team to:
- Receive and process orders from dealers.
- Send orders to the factory.
- Monitor materials, production lead times, and delivery to dealers.

The primary landing page is a Dashboard providing an overall business view and dealer-specific performance metrics. Additional features will enhance monitoring, alerting, and reporting to help the HQ team manage operations efficiently.

### 1.2 Objectives
- Provide real-time visibility into orders, production, and deliveries.
- Enable proactive issue resolution through alerts and analytics.
- Ensure secure access for HQ team members only.
- Support scalability for potential addition of more dealers or features.

### 1.3 Scope
- In-Scope: Dashboard, order tracking, dealer performance views, alerts, inventory monitoring, basic reporting.
- Out-of-Scope: Dealer-facing interfaces, factory integration (assume API hooks), payment processing, advanced AI analytics (can be added later).

### 1.4 Assumptions
- Users are HQ team members (adults in a professional setting).
- Data sources: Orders from dealers (via API or manual entry), factory updates (manual or integrated), material/inventory data.
- Deployment: Cloud-based (e.g., AWS, Vercel for frontend, Heroku/DigitalOcean for backend).

## 2. Functional Requirements

### 2.1 User Roles
- **Admin User**: Full access to all features, including user management.
- **Standard HQ User**: Access to dashboard, order monitoring, alerts, and reports.

### 2.2 Core Features

#### 2.2.1 Authentication and Authorization
- Email-based authentication using JWT (JSON Web Tokens).
- Robust token system:
  - Access Token: Short-lived (e.g., 15-30 minutes expiration).
  - Refresh Token: Longer-lived (e.g., 7 days), stored securely (e.g., HTTP-only cookie).
  - Auto Token Refresh: Implement logic to automatically refresh the access token before it expires using the refresh token (handled via React Query interceptors).
  - Auto Cleanup: Revoke and clean up expired or used tokens on the server-side (e.g., blacklist in MongoDB or use short TTLs).
- Features: Signup (email verification), Login, Logout, Password Reset.
- Security: Protect against common vulnerabilities (e.g., XSS, CSRF).

#### 2.2.2 Dashboard Page
- **Overall Business View**:
  - Total orders summary (new, in-process, completed).
  - Revenue metrics (YTD, monthly targets vs. actuals, average order value).
  - Lead time averages (production and delivery).
- **Dealer Performance**:
  - Per-dealer metrics (order volume, revenue, on-time delivery rate).
  - Comparison charts (bar/pie for dealers).
- **Visualizations**:
  - Trend lines (order inflows, delays).
  - Heat map or color-coded list for territories.
- **Alerts and Notifications**:
  - Real-time panel for critical alerts (e.g., low stock, delays).
  - Pending actions list.
- **Inventory Monitoring**:
  - Material stock overview with thresholds.
  - Supply chain timeline (Gantt-style for productions).
- **Interactive Elements**:
  - Drill-down links to detailed views.
  - Search and filters (by date, status, dealer).
  - Customizable views (pin KPIs).
- **Reporting**:
  - Quick export (PDF/CSV) for summaries.
  - Historical data access.

#### 2.2.3 Order Management
- Create/View/Update Orders: From dealers to factory.
- Track Status: Received, Sent to Factory, In Production, Delivered.
- Material Allocation: Assign and monitor materials per order.
- Lead Time Tracking: Calculate and flag deviations.

#### 2.2.4 Dealer Details Pages
- Linked from dashboard: Order history, metrics, contact info for each dealer (Shenzhen, Guangzhou, Foshan, Hangzhou, Chengdu).

#### 2.2.5 Additional Pages
- User Profile: Update email/password.
- Admin Panel: Manage users, dealers.

### 2.3 Non-Functional Requirements
- **Performance**: Load times < 2 seconds; handle up to 100 concurrent users.
- **Scalability**: Design for adding more dealers (e.g., dynamic MongoDB collections).
- **Security**: HTTPS, data encryption at rest/transit, input validation.
- **Accessibility**: WCAG 2.1 compliance (basic).
- **Reliability**: 99% uptime; error handling with logging.
- **Mobile Responsiveness**: Fully responsive design.

## 3. Technical Stack

### 3.1 Backend
- **Framework**: FastAPI (for API development).
- **Language**: Python with Pydantic (for data models and validation).
- **Database**: MongoDB (NoSQL for flexible schemas, e.g., orders as documents).
- **Authentication**: JWT with libraries like PyJWT; refresh token logic in FastAPI middleware.
- **Other**: Async support for real-time features; WebSockets if needed for live updates.

### 3.2 Frontend
- **Framework**: React (with Create React App or Vite).
- **State Management**:
  - React Query: For backend data fetching, caching, and mutations (e.g., orders, alerts).
  - React Context: For frontend/UI state (e.g., theme, user preferences).
- **UI Library**: Optional - Material-UI or Tailwind CSS for components.
- **Routing**: React Router.
- **Other**: Axios or built-in fetch for API calls (integrated with React Query).

### 3.3 Architecture
- **Monolithic vs. Microservices**: Start with monolithic for simplicity; separate frontend/backend.
- **API Design**: RESTful endpoints; use OpenAPI/Swagger for documentation.
- **Data Flow**: Frontend fetches data via API; backend handles business logic and DB interactions.
- **Deployment**:
  - Frontend: Vercel/Netlify.
  - Backend: Heroku/DigitalOcean/AWS.
  - Database: MongoDB Atlas.

## 4. Database Schema (MongoDB Collections)

### 4.1 Users
- _id: ObjectId
- email: String (unique)
- password: String (hashed)
- role: String (admin/standard)
- refreshTokens: Array of {token: String, expires: Date} (for cleanup)

### 4.2 Dealers
- _id: ObjectId
- name: String (e.g., "Shenzhen")
- territory: String
- contact: Object {email, phone}

### 4.3 Orders
- _id: ObjectId
- dealerId: ObjectId (ref to Dealers)
- status: String (received, sentToFactory, inProduction, delivered)
- materials: Array of {item: String, quantity: Number}
- productionLeadTime: Number (days)
- deliveryETA: Date
- createdAt: Date
- updatedAt: Date

### 4.4 Materials
- _id: ObjectId
- name: String
- stock: Number
- threshold: Number (low stock alert)

### 4.5 Alerts
- _id: ObjectId
- type: String (e.g., lowStock, delay)
- message: String
- priority: String (high/medium/low)
- resolved: Boolean

## 5. API Endpoints (High-Level)

### 5.1 Auth
- POST /auth/signup: Create user.
- POST /auth/login: Generate access/refresh tokens.
- POST /auth/refresh: Refresh access token.
- POST /auth/logout: Invalidate tokens.

### 5.2 Dashboard
- GET /dashboard/overview: Fetch KPIs, metrics.
- GET /dashboard/dealers: Dealer performance data.
- GET /dashboard/alerts: List alerts.

### 5.3 Orders
- GET /orders: List all (filtered).
- POST /orders: Create new.
- PUT /orders/{id}: Update status/materials.
- GET /orders/{id}: Details.

### 5.4 Materials
- GET /materials: Inventory overview.
- PUT /materials/{id}: Update stock.

## 6. Frontend Components

- **App.js**: Root with routing and context providers.
- **Dashboard.js**: Main page with charts (e.g., Recharts library), widgets.
- **Auth Components**: LoginForm, SignupForm.
- **OrderList.js**: Table with filtering (e.g., React Table).
- **DealerDetail.js**: Per-dealer views.
- **AlertPanel.js**: Notification sidebar.

Use React Query for queries/mutations (e.g., useQuery for dashboard data, useMutation for order updates).

## 7. Development Guidelines

- **Version Control**: Git (e.g., GitHub).
- **Testing**: Unit (Jest for frontend, Pytest for backend), Integration, E2E (Cypress).
- **CI/CD**: GitHub Actions.
- **Code Style**: ESLint/Prettier for frontend; Black for Python.
- **Documentation**: Inline comments; separate README.md.

## 8. Timeline and Milestones (Estimated)
- Week 1-2: Setup (backend API, DB schema, auth).
- Week 3-4: Core features (order management, dashboard backend).
- Week 5-6: Frontend implementation (dashboard, components).
- Week 7: Testing, refinements.
- Week 8: Deployment and handover.

## 9. Risks and Mitigations
- Risk: Token security issues. Mitigation: Use secure storage, regular audits.
- Risk: Data inconsistencies. Mitigation: Pydantic validation, React Query caching.
- Risk: Scalability with MongoDB. Mitigation: Indexing, sharding if needed.

This document serves as a blueprint. Adjustments can be made based on further discussions.