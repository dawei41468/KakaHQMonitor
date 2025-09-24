# Design Guidelines: Kaka HQ Monitoring Web App

## Design Approach
**System-Based Approach** - Following Material Design principles for this data-heavy enterprise application, ensuring consistency, accessibility, and professional appearance suitable for business monitoring dashboards.

## Core Design Elements

### A. Color Palette
**Primary Colors:**
- Light Mode: Primary 220 85% 35% (Professional blue), Secondary 220 15% 95% (Light gray backgrounds)
- Dark Mode: Primary 220 80% 65% (Lighter blue), Secondary 220 15% 15% (Dark backgrounds)

**Status Colors:**
- Success: 120 60% 50% (Orders completed)
- Warning: 45 90% 60% (Low inventory alerts)
- Error: 0 75% 55% (Critical delays)
- Info: 200 80% 60% (General notifications)

### B. Typography
**Font Families:** Inter via Google Fonts CDN
- Headers: Inter 600-700 (16px-32px)
- Body: Inter 400-500 (14px-16px)
- Data/Numbers: Inter 500 (12px-14px, tabular-nums)

### C. Layout System
**Spacing:** Tailwind units of 2, 4, 6, and 8 (p-2, m-4, gap-6, h-8)
- Cards: p-6 spacing with rounded-lg borders
- Dashboard grid: gap-6 between widgets
- Forms: space-y-4 for input groups

### D. Component Library

**Navigation:**
- Top navigation bar with user profile dropdown
- Sidebar navigation for main sections (collapsible on mobile)
- Breadcrumbs for deep navigation

**Dashboard Widgets:**
- Metric cards with large numbers and trend indicators
- Chart containers with consistent padding and borders
- Alert panel with color-coded priority levels
- Data tables with sorting and filtering capabilities

**Forms:**
- Clean input fields with floating labels
- Primary/secondary button hierarchy
- Form validation with inline error states

**Data Display:**
- Status badges with appropriate colors
- Progress indicators for order tracking
- Dealer comparison charts (bar/pie charts)
- Interactive tables with pagination

**Overlays:**
- Modal dialogs for order details
- Toast notifications for alerts
- Dropdown menus for actions

### E. Animations
Minimal, functional animations only:
- Smooth transitions for navigation states (300ms ease)
- Loading spinners for data fetching
- Subtle hover effects on interactive elements

## Dashboard-Specific Design

**Layout Structure:**
- Header with company branding and user controls
- Main dashboard grid (3-column layout on desktop, single column on mobile)
- Persistent alerts panel (collapsible sidebar)

**Widget Hierarchy:**
1. Key metrics row (total orders, revenue, lead times)
2. Dealer performance comparison charts
3. Recent orders table with quick actions
4. Inventory status overview

**Visual Emphasis:**
- High-contrast data visualization
- Clear visual hierarchy with consistent spacing
- Color-coded status indicators throughout
- Professional, clean aesthetic suitable for business users

**Responsive Behavior:**
- Mobile-first approach with touch-friendly targets
- Collapsible navigation and condensed data views
- Horizontal scrolling for wide tables on mobile

This design system ensures a professional, data-focused interface that supports efficient business monitoring while maintaining visual consistency across all application features.