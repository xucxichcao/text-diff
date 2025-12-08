/**
 * CSS Diff Visualizer - Main Application
 */

import './style.css';
import { computeDiff, generateSplitDiff, generateUnifiedDiff, findInlineDiff } from './diff-engine.js';
import { highlightLine as highlightCSS } from './syntax-highlighter.js';
import { sampleOriginal, sampleModified } from './sample-data.js';

// DOM Elements
const cssLeft = document.getElementById('cssLeft');
const cssRight = document.getElementById('cssRight');
const compareBtn = document.getElementById('compareBtn');
const backBtn = document.getElementById('backBtn');
const inputSection = document.getElementById('inputSection');
const diffSection = document.getElementById('diffSection');
const splitView = document.getElementById('splitView');
const unifiedView = document.getElementById('unifiedView');
const diffLeft = document.getElementById('diffLeft');
const diffRight = document.getElementById('diffRight');
const diffGutter = document.getElementById('diffGutter');
const unifiedContent = document.getElementById('unifiedContent');
const addedCount = document.getElementById('addedCount');
const removedCount = document.getElementById('removedCount');
const modifiedCount = document.getElementById('modifiedCount');
const viewBtns = document.querySelectorAll('.view-btn');
const dropZoneLeft = document.getElementById('dropZoneLeft');
const dropZoneRight = document.getElementById('dropZoneRight');
const loadSampleLeft = document.getElementById('loadSampleLeft');
const loadSampleRight = document.getElementById('loadSampleRight');
const clearLeft = document.getElementById('clearLeft');
const clearRight = document.getElementById('clearRight');

// Line navigation elements
const prevDiffBtn = document.getElementById('prevDiffBtn');
const nextDiffBtn = document.getElementById('nextDiffBtn');
const currentDiffIndex = document.getElementById('currentDiffIndex');
const totalDiffs = document.getElementById('totalDiffs');

// Group navigation elements
const prevGroupBtn = document.getElementById('prevGroupBtn');
const nextGroupBtn = document.getElementById('nextGroupBtn');
const currentGroupIndex = document.getElementById('currentGroupIndex');
const totalGroups = document.getElementById('totalGroups');

// State
let currentView = 'split';
let diffResult = null;

// Line navigation state
let diffIndices = []; // Indices of individual diff lines
let currentDiffPosition = -1;

// Group navigation state
let diffGroups = []; // Array of groups, each group is { startIndex, endIndex, lines: [...] }
let currentGroupPosition = -1;

/**
 * Initialize the application
 */
function init() {
  setupEventListeners();
  setupDragAndDrop();
}

/**
 * Set up event listeners
 */
function setupEventListeners() {
  // Compare button
  compareBtn.addEventListener('click', handleCompare);
  
  // Back button
  backBtn.addEventListener('click', showInput);
  
  // View toggle
  viewBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const view = btn.dataset.view;
      switchView(view);
    });
  });
  
  // Sample data buttons
  loadSampleLeft.addEventListener('click', () => {
    cssLeft.value = sampleOriginal;
    cssLeft.focus();
  });
  
  loadSampleRight.addEventListener('click', () => {
    cssRight.value = sampleModified;
    cssRight.focus();
  });
  
  // Clear buttons
  clearLeft.addEventListener('click', () => {
    cssLeft.value = '';
    cssLeft.focus();
  });
  
  clearRight.addEventListener('click', () => {
    cssRight.value = '';
    cssRight.focus();
  });
  
  // Line navigation buttons
  prevDiffBtn.addEventListener('click', () => navigateDiff(-1));
  nextDiffBtn.addEventListener('click', () => navigateDiff(1));
  
  // Group navigation buttons
  prevGroupBtn.addEventListener('click', () => navigateGroup(-1));
  nextGroupBtn.addEventListener('click', () => navigateGroup(1));
  
  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + Enter to compare
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleCompare();
    }
    
    // Escape to go back
    if (e.key === 'Escape' && !diffSection.classList.contains('hidden')) {
      showInput();
    }
    
    // Navigation in diff view
    if (!diffSection.classList.contains('hidden')) {
      // Line navigation: arrow keys or j/k
      if (e.key === 'ArrowUp' || e.key === 'k') {
        e.preventDefault();
        navigateDiff(-1);
      }
      if (e.key === 'ArrowDown' || e.key === 'j') {
        e.preventDefault();
        navigateDiff(1);
      }
      
      // Group navigation: Shift+arrow or K/J (uppercase)
      if (e.shiftKey && e.key === 'ArrowUp') {
        e.preventDefault();
        navigateGroup(-1);
      }
      if (e.shiftKey && e.key === 'ArrowDown') {
        e.preventDefault();
        navigateGroup(1);
      }
      if (e.key === 'K') { // Uppercase K
        e.preventDefault();
        navigateGroup(-1);
      }
      if (e.key === 'J') { // Uppercase J
        e.preventDefault();
        navigateGroup(1);
      }
    }
  });
}

/**
 * Set up drag and drop functionality
 */
function setupDragAndDrop() {
  const setupDropZone = (dropZone, textarea) => {
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      dropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
      });
    });
    
    ['dragenter', 'dragover'].forEach(eventName => {
      dropZone.addEventListener(eventName, () => {
        dropZone.classList.add('dragging');
      });
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
      dropZone.addEventListener(eventName, () => {
        dropZone.classList.remove('dragging');
      });
    });
    
    dropZone.addEventListener('drop', async (e) => {
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        const file = files[0];
        if (file.type === 'text/css' || file.name.endsWith('.css')) {
          const text = await file.text();
          textarea.value = text;
        } else {
          // Try to read as text anyway
          try {
            const text = await file.text();
            textarea.value = text;
          } catch (err) {
            console.error('Could not read file:', err);
          }
        }
      }
    });
  };
  
  setupDropZone(dropZoneLeft, cssLeft);
  setupDropZone(dropZoneRight, cssRight);
}

/**
 * Handle compare button click
 */
function handleCompare() {
  const original = cssLeft.value;
  const modified = cssRight.value;
  
  if (!original.trim() && !modified.trim()) {
    // Load sample data if both are empty
    cssLeft.value = sampleOriginal;
    cssRight.value = sampleModified;
    return;
  }
  
  // Compute diff
  diffResult = computeDiff(original, modified);
  
  // Update statistics
  updateStats(diffResult.stats);
  
  // Render diff views
  renderSplitView(diffResult.diff);
  renderUnifiedView(diffResult.diff);
  
  // Build navigation indices
  buildDiffIndices();
  buildDiffGroups();
  
  // Show diff section
  showDiff();
}

/**
 * Build indices of individual diff lines for line-by-line navigation
 */
function buildDiffIndices() {
  diffIndices = [];
  currentDiffPosition = -1;
  
  const container = currentView === 'split' ? diffLeft : unifiedContent;
  const lines = container.querySelectorAll('.diff-line');
  
  lines.forEach((line, index) => {
    if (line.classList.contains('added') || 
        line.classList.contains('removed') || 
        line.classList.contains('modified')) {
      diffIndices.push(index);
    }
  });
  
  // Update total count
  totalDiffs.textContent = diffIndices.length;
  currentDiffIndex.textContent = diffIndices.length > 0 ? '0' : '0';
  
  // Update button states
  updateLineNavigationButtons();
}

/**
 * Build groups of continuous differences
 * A group is a set of consecutive diff lines
 */
function buildDiffGroups() {
  diffGroups = [];
  currentGroupPosition = -1;
  
  const container = currentView === 'split' ? diffLeft : unifiedContent;
  const lines = container.querySelectorAll('.diff-line');
  
  let currentGroup = null;
  
  lines.forEach((line, index) => {
    const isDiff = line.classList.contains('added') || 
                   line.classList.contains('removed') || 
                   line.classList.contains('modified');
    
    if (isDiff) {
      if (currentGroup === null) {
        // Start a new group
        currentGroup = { startIndex: index, endIndex: index, lines: [index] };
      } else {
        // Extend current group
        currentGroup.endIndex = index;
        currentGroup.lines.push(index);
      }
    } else {
      // Non-diff line - close current group if exists
      if (currentGroup !== null) {
        diffGroups.push(currentGroup);
        currentGroup = null;
      }
    }
  });
  
  // Don't forget the last group
  if (currentGroup !== null) {
    diffGroups.push(currentGroup);
  }
  
  // Update total count
  totalGroups.textContent = diffGroups.length;
  currentGroupIndex.textContent = diffGroups.length > 0 ? '0' : '0';
  
  // Update button states
  updateGroupNavigationButtons();
}

/**
 * Navigate to previous or next diff line
 * @param {number} direction - -1 for previous, 1 for next
 */
function navigateDiff(direction) {
  if (diffIndices.length === 0) return;
  
  // Clear highlights
  clearHighlights();
  
  // Calculate new position
  if (currentDiffPosition === -1) {
    currentDiffPosition = direction === 1 ? 0 : diffIndices.length - 1;
  } else {
    currentDiffPosition += direction;
  }
  
  // Wrap around
  if (currentDiffPosition < 0) {
    currentDiffPosition = diffIndices.length - 1;
  } else if (currentDiffPosition >= diffIndices.length) {
    currentDiffPosition = 0;
  }
  
  // Highlight and scroll
  const targetIndex = diffIndices[currentDiffPosition];
  highlightLine(targetIndex, 'current-diff');
  
  // Update indicator
  currentDiffIndex.textContent = currentDiffPosition + 1;
  updateLineNavigationButtons();
  
  // Also update group position to match
  updateGroupPositionFromLine(targetIndex);
}

/**
 * Navigate to previous or next diff group
 * @param {number} direction - -1 for previous, 1 for next
 */
function navigateGroup(direction) {
  if (diffGroups.length === 0) return;
  
  // Clear highlights
  clearHighlights();
  
  // Calculate new position
  if (currentGroupPosition === -1) {
    currentGroupPosition = direction === 1 ? 0 : diffGroups.length - 1;
  } else {
    currentGroupPosition += direction;
  }
  
  // Wrap around
  if (currentGroupPosition < 0) {
    currentGroupPosition = diffGroups.length - 1;
  } else if (currentGroupPosition >= diffGroups.length) {
    currentGroupPosition = 0;
  }
  
  // Highlight all lines in the group
  const group = diffGroups[currentGroupPosition];
  group.lines.forEach((lineIndex, i) => {
    const isFirst = i === 0;
    highlightLine(lineIndex, 'current-group', !isFirst); // Only scroll for first line
  });
  
  // Update indicator
  currentGroupIndex.textContent = currentGroupPosition + 1;
  updateGroupNavigationButtons();
  
  // Also update line position to first line of group
  const firstLineInGroup = group.lines[0];
  const linePosition = diffIndices.indexOf(firstLineInGroup);
  if (linePosition !== -1) {
    currentDiffPosition = linePosition;
    currentDiffIndex.textContent = currentDiffPosition + 1;
    updateLineNavigationButtons();
  }
}

/**
 * Update group position based on current line position
 */
function updateGroupPositionFromLine(lineIndex) {
  for (let i = 0; i < diffGroups.length; i++) {
    if (diffGroups[i].lines.includes(lineIndex)) {
      currentGroupPosition = i;
      currentGroupIndex.textContent = currentGroupPosition + 1;
      updateGroupNavigationButtons();
      return;
    }
  }
}

/**
 * Clear all navigation highlights
 */
function clearHighlights() {
  const container = currentView === 'split' ? diffLeft : unifiedContent;
  const rightContainer = currentView === 'split' ? diffRight : null;
  
  container.querySelectorAll('.current-diff, .current-group').forEach(el => {
    el.classList.remove('current-diff', 'current-group');
  });
  
  if (rightContainer) {
    rightContainer.querySelectorAll('.current-diff, .current-group').forEach(el => {
      el.classList.remove('current-diff', 'current-group');
    });
  }
}

/**
 * Highlight a line and scroll to it
 * @param {number} lineIndex - Index of the line to highlight
 * @param {string} className - CSS class to add
 * @param {boolean} skipScroll - If true, don't scroll to the line
 */
function highlightLine(lineIndex, className, skipScroll = false) {
  const container = currentView === 'split' ? diffLeft : unifiedContent;
  const rightContainer = currentView === 'split' ? diffRight : null;
  
  const lines = container.querySelectorAll('.diff-line');
  const targetLine = lines[lineIndex];
  
  if (targetLine) {
    targetLine.classList.add(className);
    if (!skipScroll) {
      targetLine.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    
    // Also highlight corresponding line in right pane for split view
    if (rightContainer) {
      const rightLines = rightContainer.querySelectorAll('.diff-line');
      if (rightLines[lineIndex]) {
        rightLines[lineIndex].classList.add(className);
      }
    }
  }
}

/**
 * Update line navigation button states
 */
function updateLineNavigationButtons() {
  const hasChanges = diffIndices.length > 0;
  prevDiffBtn.disabled = !hasChanges;
  nextDiffBtn.disabled = !hasChanges;
}

/**
 * Update group navigation button states
 */
function updateGroupNavigationButtons() {
  const hasGroups = diffGroups.length > 0;
  prevGroupBtn.disabled = !hasGroups;
  nextGroupBtn.disabled = !hasGroups;
}

/**
 * Update statistics display
 */
function updateStats(stats) {
  addedCount.textContent = stats.added;
  removedCount.textContent = stats.removed;
  modifiedCount.textContent = stats.modified;
}

/**
 * Render split view
 */
function renderSplitView(diff) {
  const { left, right, gutter } = generateSplitDiff(diff);
  
  // Render left pane
  diffLeft.innerHTML = left.map(item => {
    const lineNum = item.lineNumber !== null ? item.lineNumber : '';
    let content = item.content;
    
    if (item.type === 'modified' && item.originalContent !== undefined) {
      const inlineDiff = findInlineDiff(item.originalContent, item.newContent);
      content = renderInlineDiff(inlineDiff.oldResult, 'removed');
    } else if (item.type !== 'empty') {
      content = highlightCSS(item.content);
    }
    
    return `<div class="diff-line ${item.type}">
      <span class="line-number">${lineNum}</span>
      <span class="line-content">${content}</span>
    </div>`;
  }).join('');
  
  // Render right pane
  diffRight.innerHTML = right.map(item => {
    const lineNum = item.lineNumber !== null ? item.lineNumber : '';
    let content = item.content;
    
    if (item.type === 'modified' && item.originalContent !== undefined) {
      const inlineDiff = findInlineDiff(item.originalContent, item.newContent);
      content = renderInlineDiff(inlineDiff.newResult, 'added');
    } else if (item.type !== 'empty') {
      content = highlightCSS(item.content);
    }
    
    return `<div class="diff-line ${item.type}">
      <span class="line-number">${lineNum}</span>
      <span class="line-content">${content}</span>
    </div>`;
  }).join('');
  
  // Render gutter
  diffGutter.innerHTML = '<div style="height: 29px;"></div>' + gutter.map(item => {
    return `<div class="gutter-item ${item.type}">${item.symbol}</div>`;
  }).join('');
  
  // Sync scrolling
  syncScroll(diffLeft, diffRight, diffGutter);
}

/**
 * Render inline diff highlighting
 */
function renderInlineDiff(parts, changeType) {
  return parts.map(part => {
    if (part.changed) {
      return `<span class="highlight-${changeType}">${escapeHtml(part.text)}</span>`;
    }
    return escapeHtml(part.text);
  }).join('');
}

/**
 * Escape HTML for safe rendering
 */
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * Render unified view
 */
function renderUnifiedView(diff) {
  const unified = generateUnifiedDiff(diff);
  
  unifiedContent.innerHTML = unified.map(item => {
    const leftNum = item.leftLine !== null ? item.leftLine : '';
    const rightNum = item.rightLine !== null ? item.rightLine : '';
    const content = highlightCSS(item.content);
    
    return `<div class="diff-line ${item.type}">
      <span class="line-number">${leftNum}</span>
      <span class="line-number">${rightNum}</span>
      <span class="line-prefix">${item.prefix}</span>
      <span class="line-content">${content}</span>
    </div>`;
  }).join('');
}

/**
 * Sync scroll between panes
 */
function syncScroll(left, right, gutter) {
  let isSyncing = false;
  
  const sync = (source, targets) => {
    if (isSyncing) return;
    isSyncing = true;
    
    targets.forEach(target => {
      target.scrollTop = source.scrollTop;
      target.scrollLeft = source.scrollLeft;
    });
    
    requestAnimationFrame(() => {
      isSyncing = false;
    });
  };
  
  left.addEventListener('scroll', () => sync(left, [right, gutter]));
  right.addEventListener('scroll', () => sync(right, [left, gutter]));
}

/**
 * Switch between split and unified view
 */
function switchView(view) {
  currentView = view;
  
  // Update buttons
  viewBtns.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === view);
  });
  
  // Toggle views
  if (view === 'split') {
    splitView.classList.remove('hidden');
    unifiedView.classList.add('hidden');
  } else {
    splitView.classList.add('hidden');
    unifiedView.classList.remove('hidden');
  }
  
  // Rebuild navigation indices for the new view
  if (diffResult) {
    buildDiffIndices();
    buildDiffGroups();
  }
}

/**
 * Show input section
 */
function showInput() {
  inputSection.classList.remove('hidden');
  diffSection.classList.add('hidden');
  currentDiffPosition = -1;
  currentGroupPosition = -1;
}

/**
 * Show diff section
 */
function showDiff() {
  inputSection.classList.add('hidden');
  diffSection.classList.remove('hidden');
  diffSection.classList.add('animate-fade-in');
}

// Initialize the app
init();
