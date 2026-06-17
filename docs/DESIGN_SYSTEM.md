# 🎨 Mahar Shwe POS - Enterprise Design System

## Table of Contents
1. [Design Philosophy](#design-philosophy)
2. [Color System](#color-system)
3. [Typography](#typography)
4. [Component Architecture](#component-architecture)
5. [Spacing & Layout](#spacing--layout)
6. [Motion & Transitions](#motion--transitions)
7. [Task Flows](#task-flows)
8. [Accessibility](#accessibility)
9. [Data States](#data-states)

---

## Design Philosophy

### Core Principles
- **Task-Oriented**: Every screen designed around a primary user action
- **Scanner-Speed**: Barcode scanning UX patterns - fast, responsive, minimal clicks
- **Enterprise-Ready**: Multi-user, role-based, audit trails
- **Native App Feel**: Mobile-first, touch-friendly, offline-capable
- **Real-Time Feedback**: Instant visual confirmation for all actions
- **Error Prevention**: Confirmations for destructive actions, clear affordances

### User Personas
1. **Cashier** - Fast transactions, minimal cognitive load
2. **Manager** - Reporting, inventory control, staff oversight
3. **Owner/Admin** - System configuration, financial auditing
4. **Technician** - Repair tracking, customer communication

---

## Color System

### Primary Colors
```
Amber (#f59e0b)
├─ Used for: Branding, CTA buttons, highlights, headers
├─ Semantic: Action, Important, Focus
└─ Contrast Ratio: 4.5:1 (WCAG AA)

Emerald (#10b981)
├─ Used for: Success, Income, Positive states
├─ Semantic: Approved, Complete, Profit
└─ Contrast Ratio: 4.5:1 (WCAG AA)

Red (#ef4444)
├─ Used for: Danger, Expense, Negative states
├─ Semantic: Alert, Void, Loss
└─ Contrast Ratio: 4.5:1 (WCAG AA)
```

### Neutral Colors
```
Slate-950 (#030712) - Background (root)
Slate-900 (#0f172a) - Card/Panel background
Slate-800 (#1e293b) - Input/Secondary background
Slate-700 (#334155) - Borders, disabled state
Slate-400 (#94a3b8) - Secondary text
Slate-100 (#f1f5f9) - Primary text
```

### Status Colors
```
🟢 Complete: Emerald-600 (#059669)
🟡 Pending: Yellow-500 (#eab308)
🔴 Voided: Red-600 (#dc2626)
🔵 Processing: Blue-600 (#2563eb)
⚫ Offline: Gray-500 (#6b7280)
```

---

## Typography

### Font Stack
```
Primary: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial
Fallback: sans-serif
```

### Type Scale
```
Heading 1 (32px)  - Page titles
Heading 2 (24px)  - Section headers
Heading 3 (18px)  - Card titles
Body (16px)       - Default text
Small (14px)      - Labels, secondary text
Micro (12px)      - Hints, timestamps
```

### Font Weights
```
Regular (400)  - Body text
Medium (500)   - Labels, emphasis
Semibold (600) - Section headers
Bold (700)     - Titles, CTAs
```

---

## Component Architecture

### Atomic Design Structure
```
Atoms
├── Button (Primary, Secondary, Ghost, Icon)
├── Input (Text, Number, Select, Checkbox)
├── Badge (Status, Label, Tag)
├── Icon (Lucide React)
└── Divider

Molecules
├── Card (Elevated, Flat, Bordered)
├── Form Group (Label + Input + Hint)
├── List Item (Avatar + Title + Meta)
├── Tab Bar (Horizontal navigation)
└── Modal (Overlay + Card + Actions)

Organisms
├── Product Grid (Molecules + Search)
├── Cart Sidebar (List + Totals + Actions)
├── Invoice Detail (Card + Items + Summary)
├── Header (Logo + Nav + User Menu)
└── Toast/Alert (Position + Message + Action)

Templates
├── Sale POS (Header + Product Grid + Cart)
├── Sale History (Filters + List + Detail Panel)
├── Settings (Form + Sections + Save)
└── Reports (Charts + Tables + Filters)

Pages
└── Complete screens with data
```

### Component Properties Pattern
```jsx
// Example: Button Component
<Button
  variant="primary"        // primary | secondary | ghost | danger
  size="lg"                // sm | md | lg
  state="default"          // default | loading | disabled | active
  icon={ShoppingCart}      // Optional icon
  onClick={handleClick}
  title="Tooltip text"
>
  Add to Cart
</Button>
```

---

## Spacing & Layout

### Spacing Scale (Tailwind)
```
0    = 0px
1    = 4px   (micro spacing)
2    = 8px   (compact)
3    = 12px  (default)
4    = 16px  (comfortable)
6    = 24px  (generous)
8    = 32px  (section break)
12   = 48px  (major break)
```

### Grid System
```
Desktop (lg):  3-column layout
- Left:   2 columns (product grid)
- Right:  1 column (sidebar)

Tablet (md):   2-column layout
- Stack vertically if needed

Mobile (sm):   1-column layout
- All elements full width
- Bottom sheet for cart (optional)
```

### Container Sizes
```
Full:   100% (edge-to-edge)
Max:    1280px (max-w-7xl)
Card:   Full width minus padding (p-4)
```

---

## Motion & Transitions

### Transition Timing
```
Micro interactions:   100ms (tap feedback, icon change)
UI animations:        200ms (drawer open, modal fade)
Page transitions:     300ms (route change)
Loading states:       0.5s - 2s (spinner, progress)
```

### Easing Functions
```
ease-in-out:   Standard UI movements
ease-in:       Exiting elements
ease-out:      Entering elements
cubic-bezier:  Custom spring effects
```

### Animation Examples
```
// Button tap
active:scale-95 transition-transform duration-75

// Hover highlight
hover:border-amber-500 transition-colors duration-200

// Modal enter
animate-fade-in duration-300

// Loading spinner
animate-spin
```

---

## Task Flows

### 1. **Fast Sale Flow** (Cashier - 20 seconds)
```
1. Product Scan (or click)
   ↓ Instant stock reduction, beep sound
2. (Optional) Price Override
   ↓ Edit field, auto-calculation
3. (Optional) Quantity Adjust
   ↓ +/- buttons, real-time total
4. Checkout
   ↓ Customer info (cached), payment method
5. Complete
   ↓ Invoice printed/emailed, cart clears, next customer ready
```

**UX Pattern**: No confirmation dialogs for adding items; only confirm on checkout.

### 2. **Price Override Flow**
```
1. User clicks item in cart
2. Price field becomes editable
3. Type new price
4. Hit Enter or click outside
5. UI shows: Original: X → Override: Y
6. Total recalculates instantly
7. Visual feedback: Yellow indicator
```

**UX Pattern**: Non-destructive, reversible via clearing field.

### 3. **Void Invoice Flow**
```
1. Select invoice from history
2. Click Void button
3. Two-button confirmation modal:
   - Confirm (red, destructive)
   - Cancel (gray, safe)
4. On confirm: Status changes to "Voided"
5. Invoice shows strikethrough, disabled state
6. Toast confirms action with undo option (optional)
```

**UX Pattern**: Two-step confirmation for destructive actions.

### 4. **Inventory Management Flow**
```
1. Select category filter
2. View products in grid
3. Click product to view details (side panel)
4. Edit: Name, price, cost, stock, category
5. Save
6. Sync to backend if online
7. Fallback: Save locally, queue for sync
```

**UX Pattern**: Inline editing where possible, modals for complex forms.

### 5. **Staff Commission View Flow**
```
1. Select date range (calendar picker)
2. Filter by technician/cashier
3. View: Items sold, commission %, total earned
4. Export to CSV or email
5. (Admin only) Approve/adjust commission
```

**UX Pattern**: Read-first, edit-last, with audit trail.

---

## Accessibility

### WCAG AA Compliance
- **Contrast**: All text meets 4.5:1 ratio
- **Touch Targets**: Minimum 44x44px for buttons
- **Keyboard Navigation**: Tab order logical, all interactive elements accessible
- **Semantic HTML**: Proper heading hierarchy, ARIA labels
- **Focus Indicators**: Visible on all interactive elements
- **Color Not Only**: Icons + color for status indication

### Screen Reader Support
```jsx
<button 
  aria-label="Add product to cart"
  aria-pressed={isSelected}
  role="button"
  title="Click to add"
>
  Add
</button>
```

### Mobile Accessibility
- Tap targets: 44x44px minimum
- Large text: 16px+ for readability
- High contrast: Dark mode reduces eye strain
- Haptic feedback: Optional vibration on scan

---

## Data States

### Loading State Pattern
```jsx
<div className="animate-pulse">
  <div className="bg-slate-700 h-4 rounded w-3/4 mb-2"></div>
  <div className="bg-slate-700 h-4 rounded w-1/2"></div>
</div>
```

### Empty State Pattern
```jsx
<div className="text-center py-12 text-slate-400">
  <p className="text-lg">📦 No products found</p>
  <p className="text-sm">Try adjusting your search or filter</p>
</div>
```

### Error State Pattern
```jsx
<div className="bg-red-600/20 border border-red-600 text-red-100 p-4 rounded-lg">
  ⚠️ <strong>Error:</strong> Stock sync failed. Retrying...
</div>
```

### Success State Pattern
```jsx
<div className="bg-emerald-600/20 border border-emerald-600 text-emerald-100 p-4 rounded-lg">
  ✓ Invoice saved successfully
</div>
```

### Disabled State Pattern
```jsx
<button disabled className="opacity-50 cursor-not-allowed">
  Button (Disabled)
</button>
```

---

## Responsive Breakpoints

```
Mobile:  < 640px   (sm)
Tablet:  640-1024px (md, lg)
Desktop: > 1024px  (xl, 2xl)
```

### Layout Behavior
```
sm (mobile):
- Single column
- Full-width cards
- Bottom sheet for modals
- Hamburger menu

md (tablet):
- Two columns (optional)
- Flexible grid
- Swipe for navigation

lg (desktop):
- Three columns (optimal for POS)
- Sticky sidebar
- Keyboard shortcuts enabled
```

---

## Implementation Guidelines

### Coding Standards
- Use Tailwind utility classes for styling
- Component structure in `/src/components/`
- Shared hooks in `/src/hooks/`
- Utility functions in `/src/utils/`
- Translations in language JSON

### File Structure
```
src/
├── components/
│   ├── atoms/
│   │   ├── Button.jsx
│   │   ├── Input.jsx
│   │   └── Badge.jsx
│   ├── molecules/
│   │   ├── Card.jsx
│   │   ├── FormGroup.jsx
│   │   └── ListItem.jsx
│   ├── organisms/
│   │   ├── ProductGrid.jsx
│   │   ├── CartSidebar.jsx
│   │   └── InvoiceDetail.jsx
│   └── pages/
│       ├── SalePage.jsx
│       ├── SaleHistoryPage.jsx
│       └── SettingsPage.jsx
├── hooks/
│   ├── useCart.js
│   ├── useSales.js
│   └── useBeep.js
├── utils/
│   ├── formatters.js
│   ├── validators.js
│   └── storage.js
└── App.jsx
```

### Performance Optimization
- Lazy load modals and panels
- Memoize product list (React.memo)
- Debounce search input (300ms)
- Virtual scrolling for large lists
- IndexedDB for offline sync queue

---

## Version History
- **v1.0** (2026-06-15): Initial design system, core components
- **v1.1**: Planned - Dark mode toggle, custom themes
- **v2.0**: Planned - Localization system, RTL support

