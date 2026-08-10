---
name: Corporate Precision
colors:
  surface: '#f8f9ff'
  surface-dim: '#d0dbed'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e6eeff'
  surface-container-high: '#dee9fc'
  surface-container-highest: '#d9e3f6'
  on-surface: '#121c2a'
  on-surface-variant: '#43474e'
  inverse-surface: '#27313f'
  inverse-on-surface: '#eaf1ff'
  outline: '#74777f'
  outline-variant: '#c4c6cf'
  surface-tint: '#455f87'
  primary: '#022448'
  on-primary: '#ffffff'
  primary-container: '#1e3a5f'
  on-primary-container: '#8aa4cf'
  inverse-primary: '#adc8f5'
  secondary: '#40627a'
  on-secondary: '#ffffff'
  secondary-container: '#bee1fe'
  on-secondary-container: '#43657d'
  tertiary: '#002252'
  on-tertiary: '#ffffff'
  tertiary-container: '#00377c'
  on-tertiary-container: '#73a2ff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d5e3ff'
  primary-fixed-dim: '#adc8f5'
  on-primary-fixed: '#001c3b'
  on-primary-fixed-variant: '#2d486d'
  secondary-fixed: '#c8e6ff'
  secondary-fixed-dim: '#a8cbe7'
  on-secondary-fixed: '#001e2f'
  on-secondary-fixed-variant: '#274a61'
  tertiary-fixed: '#d8e2ff'
  tertiary-fixed-dim: '#adc6ff'
  on-tertiary-fixed: '#001a42'
  on-tertiary-fixed-variant: '#004395'
  background: '#f8f9ff'
  on-background: '#121c2a'
  surface-variant: '#d9e3f6'
typography:
  display-lg:
    fontFamily: Hanken Grotesk
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Hanken Grotesk
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Hanken Grotesk
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
  headline-md:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Hanken Grotesk
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Hanken Grotesk
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Hanken Grotesk
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Hanken Grotesk
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  container-max: 1280px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 32px
---

## Brand & Style
The design system is engineered for a high-stakes recruitment environment, emphasizing authority, reliability, and enterprise-grade efficiency. The brand personality is professional and institutional, yet modern enough to appeal to top-tier talent. 

The aesthetic follows a **Modern Corporate** style: a blend of high-utility minimalism with subtle depth. It prioritizes clarity and information density, using a structured layout to evoke a sense of organized stability. Every element is designed to feel intentional and "engineered," ensuring that candidates and recruiters alike feel they are interacting with a sophisticated, trustworthy platform.

## Colors
The palette is rooted in a foundation of trust and professional calm. 
- **Primary (#1E3A5F):** A deep navy used for core branding, headers, and primary actions to establish authority.
- **Secondary (#B0D3EF):** A light sky blue used for soft backgrounds, supporting elements, and non-critical highlights.
- **Action Blue (#3B82F6):** Reserved for interactive cues and high-visibility accents.
- **Neutrals:** The system uses a hierarchy of grays—Charcoal for headings to ensure legibility and Slate for body text to reduce visual fatigue. 
- **Surfaces:** Use the pale blue-tinted white for section differentiation to maintain a clean, airy feel without the starkness of pure white.

## Typography
This design system utilizes **Hanken Grotesk** across all roles. This choice provides a sharp, contemporary edge to the corporate aesthetic. 
- **Headlines:** Use tighter letter spacing and heavier weights (600-700) to create a strong visual anchor.
- **Body:** Standardized at 16px for optimal readability in data-heavy recruitment screens.
- **Labels:** Use medium weights for form labels and uppercase for small utility labels to ensure clear categorization of data.

## Layout & Spacing
The system employs a **Fluid Grid** model with a 12-column structure for desktop and a 4-column structure for mobile. 
- **Rhythm:** An 8px base unit (linear scale) governs all padding and margins to ensure mathematical harmony.
- **Safe Areas:** Maintain a minimum 24px gutter between columns to handle dense text blocks without crowding.
- **Reflow:** On mobile, complex data tables should transition to card-based layouts, and horizontal margins should shrink to 16px to maximize real estate for content.

## Elevation & Depth
Hierarchy is established through **Tonal Layering** and **Ambient Shadows**. 
- **Surface Strategy:** The primary background is white, with the alternate light-blue background used to "recess" secondary information or sidebar areas.
- **Shadows:** Use extremely soft, low-opacity shadows (e.g., `0px 4px 12px rgba(30, 58, 95, 0.05)`) for cards. The shadow should have a slight navy tint to maintain color harmony with the primary brand.
- **Borders:** Use a consistent 1px light gray border (#E5E7EB) for containers and input fields to provide structure without the heaviness of deep shadows.

## Shapes
The design system adopts a **Rounded** shape language. 
- Standard components (Buttons, Inputs) utilize a `0.5rem` (8px) radius.
- Large containers and cards utilize `1rem` (16px) for a more approachable, modern profile.
- This specific level of roundedness balances the "strictness" of corporate layouts with a softer, user-friendly touch.

## Components
- **Buttons:** 
  - *Primary:* Deep Navy (#1E3A5F) with white text. On hover, transition to Action Blue (#2563EB) to signal interactivity.
  - *Secondary:* Light Sky Blue (#B0D3EF) with Navy text. Used for "Cancel" or "Save Draft" actions.
- **Cards:** White background with a 1px border (#E5E7EB) and a soft, low-blur shadow. Padding should be generous (24px - 32px) to denote importance.
- **Input Fields:** 1px border, 8px corner radius. Focus state should use a 2px Action Blue outline.
- **Chips/Badges:** Use Light Sky Blue backgrounds with Navy text for status indicators like "Applied" or "Interviewing."
- **Lists:** Clean rows separated by 1px horizontal dividers. Use "hover states" with the Alternate Background color (#F5FAFE) to improve scannability in long lists.