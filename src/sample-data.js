/**
 * Sample CSS data for demonstration
 */

export const sampleOriginal = `/* Base Styles */
:root {
  --primary-color: #3498db;
  --secondary-color: #2ecc71;
  --text-color: #333;
  --bg-color: #fff;
}

body {
  font-family: 'Helvetica Neue', sans-serif;
  font-size: 16px;
  line-height: 1.6;
  color: var(--text-color);
  background-color: var(--bg-color);
  margin: 0;
  padding: 0;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
}

/* Header Styles */
.header {
  background: var(--primary-color);
  padding: 20px 0;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.header h1 {
  color: #fff;
  font-size: 24px;
  margin: 0;
}

/* Button Styles */
.btn {
  display: inline-block;
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s ease;
}

.btn-primary {
  background: var(--primary-color);
  color: #fff;
}

.btn-secondary {
  background: var(--secondary-color);
  color: #fff;
}

/* Card Component */
.card {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  padding: 20px;
  margin-bottom: 20px;
}

.card-title {
  font-size: 18px;
  font-weight: bold;
  margin-bottom: 10px;
}

.card-content {
  color: #666;
}

/* Footer */
.footer {
  background: #333;
  color: #fff;
  padding: 40px 0;
  text-align: center;
}`;

export const sampleModified = `/* Base Styles - Updated */
:root {
  --primary-color: #6366f1;
  --secondary-color: #10b981;
  --accent-color: #f59e0b;
  --text-color: #1f2937;
  --bg-color: #f9fafb;
  --border-radius: 12px;
}

body {
  font-family: 'Inter', -apple-system, sans-serif;
  font-size: 16px;
  line-height: 1.7;
  color: var(--text-color);
  background-color: var(--bg-color);
  margin: 0;
  padding: 0;
}

.container {
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 24px;
}

/* Header Styles */
.header {
  background: linear-gradient(135deg, var(--primary-color), #8b5cf6);
  padding: 24px 0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  position: sticky;
  top: 0;
  z-index: 100;
}

.header h1 {
  color: #fff;
  font-size: 28px;
  font-weight: 700;
  margin: 0;
  letter-spacing: -0.02em;
}

/* Navigation */
.nav {
  display: flex;
  gap: 24px;
  align-items: center;
}

.nav-link {
  color: rgba(255, 255, 255, 0.9);
  text-decoration: none;
  font-weight: 500;
  transition: color 0.2s ease;
}

.nav-link:hover {
  color: #fff;
}

/* Button Styles */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  border: none;
  border-radius: var(--border-radius);
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.2s ease;
}

.btn-primary {
  background: var(--primary-color);
  color: #fff;
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.4);
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.5);
}

.btn-secondary {
  background: var(--secondary-color);
  color: #fff;
}

/* Card Component */
.card {
  background: #fff;
  border-radius: var(--border-radius);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  padding: 24px;
  margin-bottom: 24px;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.card-title {
  font-size: 20px;
  font-weight: 700;
  margin-bottom: 12px;
  color: var(--text-color);
}

.card-content {
  color: #6b7280;
  line-height: 1.6;
}

/* Footer */
.footer {
  background: linear-gradient(135deg, #1f2937, #374151);
  color: #fff;
  padding: 60px 0;
  text-align: center;
}

.footer-links {
  display: flex;
  justify-content: center;
  gap: 32px;
  margin-top: 24px;
}`;

/**
 * Sample JSON data for JSON diff demonstration
 */
export const sampleJSONOriginal = `{
  "name": "text-diff",
  "version": "1.0.0",
  "description": "A modern text comparison tool",
  "author": "Developer",
  "license": "MIT",
  "dependencies": {
    "react": "^17.0.2",
    "lodash": "^4.17.21",
    "axios": "^0.24.0"
  },
  "devDependencies": {
    "vite": "^3.0.0",
    "eslint": "^8.0.0"
  },
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "test": "jest"
  },
  "config": {
    "port": 3000,
    "debug": false,
    "features": {
      "darkMode": true,
      "export": true,
      "sync": false
    }
  },
  "contributors": [
    {
      "name": "John Doe",
      "email": "john@example.com"
    },
    {
      "name": "Jane Smith",
      "email": "jane@example.com"
    }
  ]
}`;

export const sampleJSONModified = `{
  "name": "text-diff",
  "version": "2.0.0",
  "description": "A powerful text and JSON comparison tool",
  "author": "Development Team",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/example/text-diff"
  },
  "dependencies": {
    "react": "^18.2.0",
    "lodash": "^4.17.21",
    "axios": "^1.4.0",
    "zustand": "^4.3.0"
  },
  "devDependencies": {
    "vite": "^4.0.0",
    "eslint": "^8.40.0",
    "typescript": "^5.0.0"
  },
  "scripts": {
    "dev": "vite --host",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "lint": "eslint src"
  },
  "config": {
    "port": 5173,
    "debug": true,
    "features": {
      "darkMode": true,
      "export": true,
      "sync": true,
      "jsonDiff": true
    }
  },
  "contributors": [
    {
      "name": "John Doe",
      "email": "john.doe@example.com",
      "role": "Lead Developer"
    },
    {
      "name": "Jane Smith",
      "email": "jane@example.com"
    },
    {
      "name": "Bob Johnson",
      "email": "bob@example.com"
    }
  ]
}`;
