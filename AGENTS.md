# AGENTS.md

This file contains guidelines and commands for agentic coding agents working in this repository.

## Project Overview

This is a **Text Diff** - a modern web application that allows users to compare two text files and visualize differences. The app is built with vanilla JavaScript using Vite as the build tool and features a clean, modern UI with dark/light theme support.

## Build Commands

```bash
# Development server
npm run dev

# Production build
npm run build

# Preview production build
npm run preview
```

## Testing

This project currently does not have automated tests. When implementing new features, manually test by:
1. Running `npm run dev`
2. Loading the application in browser
3. Testing with sample data or custom text files
4. Verifying diff visualization works correctly

## Code Style Guidelines

### JavaScript/TypeScript

#### Imports
- Use ES6 import/export syntax
- Group imports: external libraries first, then internal modules
- Use named imports for specific functions when possible
```javascript
// External libraries
import { someFunction } from 'external-lib';

// Internal modules
import { computeDiff } from './diff-engine.js';
import './style.css';
```

#### Formatting & Structure
- Use 2 spaces for indentation
- Maximum line length: 120 characters
- Use camelCase for variables and functions
- Use PascalCase for classes and constructors
- Use UPPER_SNAKE_CASE for constants

#### Naming Conventions
- Functions: descriptive verbs (`handleCompare`, `renderSplitView`)
- Variables: descriptive nouns (`diffResult`, `currentView`)
- DOM elements: prefix with element type (`cssLeft`, `compareBtn`)
- Private functions: prefix with underscore if needed (`_internalHelper`)

#### Error Handling
- Use try/catch for async operations
- Provide meaningful error messages
- Gracefully handle edge cases (empty inputs, invalid text)
- Log errors to console with context

#### Functions
- Keep functions focused and small (< 50 lines when possible)
- Use JSDoc comments for exported functions
- Prefer pure functions for data processing
- Use arrow functions for callbacks and short utilities

### CSS

#### Architecture
- Use CSS custom properties (variables) for theming
- Follow BEM-like naming for component classes
- Organize styles with clear section comments
- Use logical properties for layout (flexbox, grid)

#### Naming
- Use kebab-case for class names
- Component prefixes: `.header-`, `.btn-`, `.diff-`
- State classes: `.active`, `.hidden`, `.dragging`
- Utility classes: `.text-center`, `.flex-1`

#### Structure
```css
/* ============================================
   Component Name
   ============================================ */

/* Component styles */
.component-name {
  /* styles */
}

/* Modifiers */
.component-name--variant {
  /* styles */
}

/* Child elements */
.component-name__child {
  /* styles */
}

/* State changes */
.component-name.is-active {
  /* styles */
}
```

#### Variables
- Group variables by purpose (colors, spacing, typography)
- Use semantic naming (`--text-primary` vs `--blue-500`)
- Provide both light and dark theme values

### HTML

#### Structure
- Use semantic HTML5 elements (`<header>`, `<main>`, `<section>`)
- Proper heading hierarchy (h1-h6)
- Include accessibility attributes (ARIA labels, titles)
- Use data attributes for JavaScript hooks (`data-view`, `data-theme`)

#### Best Practices
- Self-closing tags for void elements
- Proper nesting and indentation
- Meaningful alt text for images
- Form labels associated with inputs

## File Organization

```
src/
├── main.js              # Application entry point
├── style.css            # Global styles and design system
├── diff-engine.js       # Core diff computation logic
├── syntax-highlighter.js # CSS syntax highlighting
├── sample-data.js       # Sample CSS for demonstration
└── counter.js           # (if exists) utility functions

public/
└── vite.svg             # App icon

index.html               # Main HTML template
```

## Development Guidelines

### State Management
- Use local variables for component state
- Store UI state in DOM attributes or data properties
- Use localStorage for persistent settings (theme preference)
- Avoid global variables when possible

### Event Handling
- Use event delegation for dynamic content
- Prevent default for form submissions and links
- Include keyboard shortcuts for common actions
- Provide visual feedback for interactions

### Performance
- Use requestAnimationFrame for animations
- Debounce expensive operations (scroll, resize)
- Lazy load non-critical features
- Optimize for mobile devices

### Browser Compatibility
- Target modern browsers (ES2020+)
- Use CSS feature queries when needed
- Provide fallbacks for older browsers
- Test on mobile and desktop

## UI/UX Guidelines

### Theme System
- Light theme is default
- Dark theme via `data-theme="dark"` attribute
- Use CSS custom properties for easy theming
- Respect user's OS preference when possible

### Responsive Design
- Mobile-first approach
- Breakpoint at 768px for tablet layouts
- Adjust navigation and layout for small screens
- Touch-friendly button sizes (minimum 44px)

### Accessibility
- Keyboard navigation support
- Screen reader friendly markup
- Sufficient color contrast (4.5:1 minimum)
- Focus indicators for interactive elements

## Common Patterns

### Module Pattern
```javascript
/**
 * Module description
 */
export function mainFunction() {
  // Implementation
}

export function helperFunction() {
  // Implementation
}
```

### Component Initialization
```javascript
function initComponent() {
  const elements = document.querySelectorAll('.component');
  elements.forEach(setupElement);
}

function setupElement(element) {
  // Setup event listeners and state
}
```

### CSS Component Structure
```css
.component {
  /* Base styles */
}

.component__element {
  /* Child element */
}

.component--modifier {
  /* Variant */
}
```

## Git Workflow

When committing changes:
1. Use clear, descriptive commit messages
2. Group related changes in single commits
3. Test before committing
4. Follow existing commit message style

## Notes for Agents

- This is a client-side only application with no backend
- All CSS processing happens in the browser
- The diff algorithm uses LCS (Longest Common Subsequence)
- Syntax highlighting is custom-built for CSS
- The app supports drag-and-drop file input
- Theme preference is saved to localStorage
- No external CSS frameworks are used
- Vite handles bundling and development server