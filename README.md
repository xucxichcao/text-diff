# Text Diff

A modern, feature-rich web application for comparing text files with visual diff highlighting. Built with vanilla JavaScript and Vite, also available as a desktop app via Tauri.

## Features

- **Visual Diff Comparison** - See additions, deletions, and modifications with color-coded highlighting
- **Split & Unified Views** - Toggle between side-by-side split view or unified diff view
- **Smart Line Matching** - Uses LCS (Longest Common Subsequence) algorithm with Levenshtein distance for intelligent modification detection
- **Inline Diff Highlighting** - Character-level and word-level change detection within modified lines
- **Interactive Merge** - Resolve conflicts by choosing between original or modified versions
- **Diff Navigation** - Navigate between changes with keyboard shortcuts (↑/↓, j/k) and group navigation
- **Drag & Drop Support** - Drop files directly into the editor panels
- **File Import/Export** - Open files from disk and export merged results
- **Dark/Light Theme** - Toggle between themes with preference saved to localStorage
- **Responsive Design** - Works on desktop and mobile devices
- **Desktop App** - Available as a native desktop application via Tauri

## Tech Stack

- **Frontend**: Vanilla JavaScript (ES6+)
- **Build Tool**: Vite
- **Desktop**: Tauri (Rust-based)
- **Fonts**: Inter & JetBrains Mono

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run as desktop app (requires Tauri CLI)
npm run tauri:dev
```

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `↑` / `k` | Previous difference |
| `↓` / `j` | Next difference |
| `Shift+↑` / `K` | Previous group |
| `Shift+↓` / `J` | Next group |
| `1` | Keep original |
| `2` | Keep modified |
| `P` | Preview merged result |
| `C` | Copy merged text |
| `E` | Export merged file |

## License

MIT
