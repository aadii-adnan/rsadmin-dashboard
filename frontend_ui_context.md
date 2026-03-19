# Frontend UI Context & Styling Architecture

**CRITICAL NOTE FOR PROMPT ENGINEERS:** The prompt assumptions regarding Tailwind CSS are incorrect. This project **does not use Tailwind CSS**. There is no `tailwind.config.js` or Tailwind dependency. 

Instead, the UI is built using a combination of **React Bootstrap**, **Vanilla CSS Custom Properties (Variables)**, and **Legacy WordPress Elementor CSS Classes** (likely carried over from a previous migration).

Below is the definitive baseline of the existing frontend styling architecture to ensure pixel-perfect consistency for the new Blogs module.

---

## 1. CSS FRAMEWORK & STYLING ENGINE
- **Primary Framework**: `bootstrap` (v5.3.5) / `react-bootstrap` (v2.10.9). Container layouts, columns, and flex utilities rely entirely on native Bootstrap classes (e.g., `Container`, `Row`, `Col`, `d-flex`, `justify-content-center`, `mb-4`).
- **Stylesheets Architecture**: Component-scoped CSS files linked directly at the entry points (e.g., `import "./Home.css"`, `import "./ContactUs.css"`, `import 'bootstrap/dist/css/bootstrap.min.css'`).

## 2. GLOBAL CSS VARIABLES & BRAND COLORS
Located within `:root` definitions (found prominently in `Home.css`), the brand relies on the following exact hex codes mapping to CSS variables:

```css
:root {
  --primary-dark: #010659;         /* Navy Blue (Brand Base) */
  --primary-light: rgb(40, 144, 205); /* Bright Blue (Hover States/Accents) */
  --text-dark: #1A1A1A;            /* Base Text */
  --text-grey: #666666;            /* Subheadings/Descriptions */
  --bg-light: #F8F9FA;             /* Standard Off-white Section Background */
  --bg-blue-light: #EEF2F6;        /* Light Blue Tinted Background */
  --white: #ffffff;
  --success: #00C851;
  --radius: 12px;                  /* Standard Component Radius */
  --shadow-sm: 0 4px 6px rgba(0,0,0,0.04);
  --shadow-md: 0 10px 30px rgba(0,0,0,0.08);
  --transition: all 0.3s ease;
}
```

## 3. TYPOGRAPHY & ICONS
- **Font Family**: `'Urbanist', sans-serif` is set as the global default on the `body` tag. Ensure all new typography adheres to the Urbanist typeface.
- **Icon Libraries**: 
  - **`react-icons`**: Extensively utilized (specifically the `react-icons/fa` FontAwesome sub-library, e.g., `<FaCarSide />`, `<FaClock />`). 
  - **FontAwesome Free `@fortawesome/fontawesome-free`**: Also imported globally in `main.jsx` for standard `<i>` tag usage if needed.

## 4. STANDARD UI PATTERNS & COMPONENTS

When building a new section or Blog Component, adhere to the following HTML/CSS class structures:

### A. Section Layouts
Sections utilize Bootstrap's layout system coupled with custom utility padding:
```jsx
// Standard Section Layout Pattern
<section className="section-padding bg-light-grey"> // Custom padding from CSS + variable bg
  <Container>
    <Row>
      <Col md={12}>
        <h2 className="text-dark-blue">Blog Title</h2>
      </Col>
    </Row>
  </Container>
</section>
```

### B. Standard Buttons (`.btn-modern`)
Buttons do not use Tailwind or standard Bootstrap `.btn-primary`. Instead, they use a highly customized `.btn-modern` class to achieve the pill shape and shadow effect.

```css
/* Core Button Class */
.btn-modern {
  display: inline-block;
  background: var(--primary-dark);
  color: var(--white);
  padding: 14px 32px;
  border-radius: 50px;
  font-weight: 600;
  text-decoration: none;
  transition: var(--transition);
  box-shadow: 0 4px 15px rgba(1, 6, 89, 0.3);
}

.btn-modern:hover {
  background: var(--primary-light);
  transform: translateY(-2px);
  color: var(--white);
}
```

### C. Standard Badges/Pills (`.badge-pill`)
Used frequently above headings as categorical tags.
```css
.badge-pill {
  display: inline-block;
  background: rgba(1, 6, 89, 0.1);
  color: var(--primary-dark);
  padding: 8px 16px;
  border-radius: 50px;
  font-weight: 600;
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 15px;
}
```

### D. Sub-UI Elementor Artifacts (Notice)
A significant chunk of global button definitions and layout headers use legacy CSS mapped precisely to Elementor classes (e.g., `.elementor-319 .elementor-element.elementor-element-6096eb18 .elementor-button`). When generating *new* components, simply fallback to the `.btn-modern` paradigm rather than recreating the Elementor artifact classes.