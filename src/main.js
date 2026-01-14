/**
 * Text Diff - Main Application
 */

import './style.css';
import { computeDiff, generateSplitDiff, generateUnifiedDiff, findInlineDiff, findInlineDiffWords } from './diff-engine.js';
import { highlightLine as highlightCSS } from './syntax-highlighter.js';
import { sampleOriginal, sampleModified } from './sample-data.js';

// Tauri API imports (conditionally loaded)
let openDialog = null;
let saveDialog = null;
let readTextFile = null;
let writeTextFile = null;

/**
 * Check if running in Tauri environment
 */
function isTauri() {
  return typeof window !== 'undefined' && (window.__TAURI__ || window.__TAURI_INTERNALS__);
}

/**
 * Initialize Tauri APIs if available
 */
async function initTauriAPIs() {
  if (isTauri()) {
    try {
      const dialogModule = await import('@tauri-apps/plugin-dialog');
      openDialog = dialogModule.open;
      saveDialog = dialogModule.save;
      
      const fsModule = await import('@tauri-apps/plugin-fs');
      readTextFile = fsModule.readTextFile;
      writeTextFile = fsModule.writeTextFile;
      
      console.log('Tauri APIs initialized successfully');
    } catch (err) {
      console.warn('Failed to load Tauri plugins:', err);
    }
  }
}

/**
 * Open file dialog and load content into textarea
 * @param {'left' | 'right'} side - Which panel to load into
 */
async function openFileDialog(side) {
  const textarea = side === 'left' ? cssLeft : cssRight;
  
  // Ensure Tauri APIs are initialized
  if (isTauri() && !openDialog) {
    await initTauriAPIs();
  }
  
  if (isTauri() && openDialog) {
    try {
      console.log('Opening file dialog...');
      const selected = await openDialog({
        multiple: false,
        filters: [{
          name: 'Text Files',
          extensions: ['txt', 'css', 'js', 'ts', 'jsx', 'tsx', 'json', 'md', 'html', 'xml', 'yaml', 'yml', 'toml', 'ini', 'conf', 'log', 'py', 'rb', 'go', 'rs', 'java', 'c', 'cpp', 'h', 'hpp', 'sh', 'bash', 'zsh', 'sql', 'graphql', 'vue', 'svelte']
        }, {
          name: 'All Files',
          extensions: ['*']
        }]
      });
      
      console.log('Selected file:', selected);
      
      if (selected) {
        const content = await readTextFile(selected);
        textarea.value = content;
        textarea.focus();
      }
    } catch (err) {
      console.error('Failed to open file:', err);
    }
  } else {
    console.log('Tauri not available, using web fallback');
    // Fallback for web: create a hidden file input
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.txt,.css,.js,.ts,.jsx,.tsx,.json,.md,.html,.xml,.yaml,.yml,.toml,.ini,.conf,.log,.py,.rb,.go,.rs,.java,.c,.cpp,.h,.hpp,.sh,.bash,.zsh,.sql,.graphql,.vue,.svelte,*';
    
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (file) {
        try {
          const text = await file.text();
          textarea.value = text;
          textarea.focus();
        } catch (err) {
          console.error('Failed to read file:', err);
        }
      }
    };
    
    input.click();
  }
}

/**
 * Save merged content using native file dialog
 */
async function saveFileDialog() {
  // Ensure Tauri APIs are initialized
  if (isTauri() && !saveDialog) {
    await initTauriAPIs();
  }
  
  const mergedContent = generateMergedCSS();
  
  if (isTauri() && saveDialog && writeTextFile) {
    try {
      console.log('Opening save dialog...');
      const filePath = await saveDialog({
        defaultPath: 'merged.txt',
        filters: [{
          name: 'Text Files',
          extensions: ['txt', 'css', 'js', 'ts', 'json', 'md', 'html', 'xml', 'yaml', 'yml']
        }, {
          name: 'All Files',
          extensions: ['*']
        }]
      });
      
      console.log('Selected path:', filePath);
      
      if (filePath) {
        await writeTextFile(filePath, mergedContent);
        console.log('File saved successfully:', filePath);
      }
    } catch (err) {
      console.error('Failed to save file:', err);
    }
  } else {
    console.log('Tauri not available, using web fallback. isTauri:', isTauri(), 'saveDialog:', !!saveDialog);
    // Fallback for web: use download link
    downloadMergedText(mergedContent);
  }
}

/**
 * Helper to download text as file (web fallback)
 */
function downloadMergedText(content) {
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'merged.txt';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

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
const themeToggle = document.getElementById('themeToggle');
const openFileLeft = document.getElementById('openFileLeft');
const openFileRight = document.getElementById('openFileRight');

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
let diffGroups = []; // Array of groups, each group is { startIndex, endIndex, lines: [...], id: number }
let currentGroupPosition = -1;

// Merge state - now group-based
let mergeDecisions = new Map(); // Map of groupId -> 'original' | 'modified' | 'both'
let activeGroupId = null; // Currently selected group for merge popup

/**
 * Initialize the application
 */
function init() {
  initTheme();
  initTauriAPIs(); // Initialize Tauri APIs if available
  setupEventListeners();
  setupDragAndDrop();
}

/**
 * Initialize theme from localStorage or default to light
 */
function initTheme() {
  const savedTheme = localStorage.getItem('theme');
  // Light mode is default (no data-theme attribute needed)
  if (savedTheme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
}

/**
 * Toggle between light and dark theme
 */
function toggleTheme() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  if (isDark) {
    document.documentElement.removeAttribute('data-theme');
    localStorage.setItem('theme', 'light');
  } else {
    document.documentElement.setAttribute('data-theme', 'dark');
    localStorage.setItem('theme', 'dark');
  }
}

/**
 * Set up event listeners
 */
function setupEventListeners() {
  // Compare button
  compareBtn.addEventListener('click', handleCompare);
  
  // Back button
  backBtn.addEventListener('click', showInput);
  
  // Theme toggle
  themeToggle.addEventListener('click', toggleTheme);
  
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
  
  // Open file buttons
  openFileLeft.addEventListener('click', () => openFileDialog('left'));
  openFileRight.addEventListener('click', () => openFileDialog('right'));
  
  // Line navigation buttons
  prevDiffBtn.addEventListener('click', () => navigateDiff(-1));
  nextDiffBtn.addEventListener('click', () => navigateDiff(1));
  
  // Group navigation buttons
  prevGroupBtn.addEventListener('click', () => navigateGroup(-1));
  nextGroupBtn.addEventListener('click', () => navigateGroup(1));
  
  // Merge action buttons (use event delegation)
  document.addEventListener('click', (e) => {
    // Export merge button
    if (e.target.closest('#exportMergeBtn')) {
      exportMergedCSS();
    }
    // Copy merge button
    if (e.target.closest('#copyMergeBtn')) {
      copyMergedCSS();
    }
    // Preview merge button
    if (e.target.closest('#previewMergeBtn')) {
      previewMergedCSS();
    }
    // Close preview modal
    if (e.target.closest('#closePreviewBtn') || e.target.id === 'mergePreviewModal') {
      closeMergePreview();
    }
    // Close merge popup when clicking backdrop
    if (e.target.id === 'mergePopup') {
      closeMergePopup();
    }
    // Close merge popup button
    if (e.target.closest('#closeMergePopupBtn')) {
      closeMergePopup();
    }
    // Merge popup action buttons
    if (e.target.closest('.merge-popup-action')) {
      const btn = e.target.closest('.merge-popup-action');
      const action = btn.dataset.action;
      if (action && activeGroupId !== null) {
        applyMergeDecision(activeGroupId, action);
      }
    }
  });
  
  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + Enter to compare
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleCompare();
    }
    
    // Ctrl/Cmd + O to open file (left panel) - only in input view
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 'o') {
      if (!diffSection.classList.contains('hidden')) return; // Only in input view
      e.preventDefault();
      openFileDialog('left');
    }
    
    // Ctrl/Cmd + Shift + O to open file (right panel) - only in input view
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'O') {
      if (!diffSection.classList.contains('hidden')) return; // Only in input view
      e.preventDefault();
      openFileDialog('right');
    }
    
    // Ctrl/Cmd + S to save merged result - only in diff view
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      if (diffSection.classList.contains('hidden')) return; // Only in diff view
      e.preventDefault();
      saveFileDialog();
    }
    
    // Escape to close modals or go back
    if (e.key === 'Escape') {
      const mergePopup = document.getElementById('mergePopup');
      const previewModal = document.getElementById('mergePreviewModal');
      
      if (mergePopup && !mergePopup.classList.contains('hidden')) {
        closeMergePopup();
      } else if (previewModal && !previewModal.classList.contains('hidden')) {
        closeMergePreview();
      } else if (!diffSection.classList.contains('hidden')) {
        showInput();
      }
    }
    
    // Navigation in diff view (only when no popup is open)
    const mergePopup = document.getElementById('mergePopup');
    const popupOpen = mergePopup && !mergePopup.classList.contains('hidden');
    
    if (!diffSection.classList.contains('hidden') && !popupOpen) {
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
      if (e.key === 'K') {
        e.preventDefault();
        navigateGroup(-1);
      }
      if (e.key === 'J') {
        e.preventDefault();
        navigateGroup(1);
      }
      
      // Enter to open merge popup for current group
      if (e.key === 'Enter' && currentGroupPosition >= 0) {
        e.preventDefault();
        openMergePopup(currentGroupPosition);
      }
    }
    
    // Keyboard shortcuts in merge popup
    if (popupOpen && activeGroupId !== null) {
      const changeType = mergePopup.dataset.changeType;
      
      if (e.key === '1') {
        e.preventDefault();
        // Key 1: first action based on change type
        if (changeType === 'added') {
          applyMergeDecision(activeGroupId, 'keep');
        } else if (changeType === 'removed') {
          applyMergeDecision(activeGroupId, 'restore');
        } else {
          applyMergeDecision(activeGroupId, 'original');
        }
      }
      if (e.key === '2') {
        e.preventDefault();
        // Key 2: second action based on change type
        if (changeType === 'added') {
          applyMergeDecision(activeGroupId, 'discard');
        } else if (changeType === 'removed') {
          applyMergeDecision(activeGroupId, 'accept');
        } else {
          applyMergeDecision(activeGroupId, 'modified');
        }
      }
      if (e.key === '3' && changeType === 'modified') {
        e.preventDefault();
        // Key 3: only for modified (keep both)
        applyMergeDecision(activeGroupId, 'both');
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
        // Try to read any file as text
        try {
          const text = await file.text();
          textarea.value = text;
        } catch (err) {
          console.error('Could not read file:', err);
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
  
  // Reset merge state
  mergeDecisions = new Map();
  activeGroupId = null;
  
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
  const rightContainer = currentView === 'split' ? diffRight : null;
  const lines = container.querySelectorAll('.diff-line');
  const rightLines = rightContainer ? rightContainer.querySelectorAll('.diff-line') : null;
  
  lines.forEach((line, index) => {
    // Check both left and right panes for diff type
    const leftIsDiff = line.classList.contains('removed') || line.classList.contains('modified');
    const rightIsDiff = rightLines && rightLines[index] && 
                        (rightLines[index].classList.contains('added') || rightLines[index].classList.contains('modified'));
    
    if (leftIsDiff || rightIsDiff) {
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
 * Build groups of related differences
 * Groups consecutive diff lines of the SAME TYPE only
 * Different change types (added/removed/modified) are kept in separate groups
 */
function buildDiffGroups() {
  diffGroups = [];
  currentGroupPosition = -1;
  
  const { left, right } = generateSplitDiff(diffResult.diff);
  const container = currentView === 'split' ? diffLeft : unifiedContent;
  const rightContainer = currentView === 'split' ? diffRight : null;
  const lines = container.querySelectorAll('.diff-line');
  const rightLines = rightContainer ? rightContainer.querySelectorAll('.diff-line') : null;
  
  let currentGroup = null;
  let groupId = 0;
  
  lines.forEach((line, index) => {
    // Check both left and right panes for diff type
    // Left pane has: removed, modified, empty (for added), unchanged
    // Right pane has: added, modified, empty (for removed), unchanged
    const leftIsDiff = line.classList.contains('removed') || line.classList.contains('modified');
    const rightIsDiff = rightLines && rightLines[index] && 
                        (rightLines[index].classList.contains('added') || rightLines[index].classList.contains('modified'));
    const isDiff = leftIsDiff || rightIsDiff;
    
    // Determine the actual diff type
    let diffType = null;
    if (line.classList.contains('removed')) {
      diffType = 'removed';
    } else if (line.classList.contains('modified')) {
      diffType = 'modified';
    } else if (rightLines && rightLines[index] && rightLines[index].classList.contains('added')) {
      diffType = 'added';
    }
    
    if (isDiff && diffType) {
      if (currentGroup === null) {
        // Start a new group
        currentGroup = { 
          id: groupId++, 
          startIndex: index, 
          endIndex: index, 
          lines: [index],
          diffIndices: [index],
          type: diffType // Single type per group
        };
      } else if (currentGroup.type === diffType) {
        // Same type - extend the group
        currentGroup.lines.push(index);
        currentGroup.diffIndices.push(index);
        currentGroup.endIndex = index;
      } else {
        // Different type - close current group and start new one
        diffGroups.push(currentGroup);
        currentGroup = { 
          id: groupId++, 
          startIndex: index, 
          endIndex: index, 
          lines: [index],
          diffIndices: [index],
          type: diffType
        };
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
  
  // Make groups clickable
  setupClickableGroups();
  
  // Update merge stats
  updateMergeStats();
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
  diffLeft.innerHTML = left.map((item, index) => {
    const lineNum = item.lineNumber !== null ? item.lineNumber : '';
    let content = item.content;
    
    if (item.type === 'modified' && item.originalContent !== undefined) {
      // Use word-level diff for better readability
      const inlineDiff = findInlineDiffWords(item.originalContent, item.newContent);
      content = renderInlineDiff(inlineDiff.oldResult, 'removed');
    } else if (item.type !== 'empty') {
      content = highlightCSS(item.content);
    }
    
    return `<div class="diff-line ${item.type}" data-diff-index="${index}">
      <span class="line-number">${lineNum}</span>
      <span class="line-content">${content}</span>
    </div>`;
  }).join('');
  
  // Render right pane
  diffRight.innerHTML = right.map((item, index) => {
    const lineNum = item.lineNumber !== null ? item.lineNumber : '';
    let content = item.content;
    
    if (item.type === 'modified' && item.originalContent !== undefined) {
      // Use word-level diff for better readability
      const inlineDiff = findInlineDiffWords(item.originalContent, item.newContent);
      content = renderInlineDiff(inlineDiff.newResult, 'added');
    } else if (item.type !== 'empty') {
      content = highlightCSS(item.content);
    }
    
    return `<div class="diff-line ${item.type}" data-diff-index="${index}">
      <span class="line-number">${lineNum}</span>
      <span class="line-content">${content}</span>
    </div>`;
  }).join('');
  
  // Render gutter (simple, no inline merge controls)
  diffGutter.innerHTML = '<div class="gutter-header"></div>' + gutter.map((item, index) => {
    return `<div class="gutter-item ${item.type}" data-diff-index="${index}">${item.symbol}</div>`;
  }).join('');
  
  // Sync scrolling
  syncScroll(diffLeft, diffRight, diffGutter);
}

/**
 * Setup clickable groups for merge functionality
 */
function setupClickableGroups() {
  // Add group data attributes and click handlers to diff lines
  diffGroups.forEach((group, groupIndex) => {
    group.lines.forEach(lineIndex => {
      const leftLine = diffLeft.querySelector(`.diff-line[data-diff-index="${lineIndex}"]`);
      const rightLine = diffRight.querySelector(`.diff-line[data-diff-index="${lineIndex}"]`);
      const gutterItem = diffGutter.querySelector(`.gutter-item[data-diff-index="${lineIndex}"]`);
      
      [leftLine, rightLine, gutterItem].forEach(el => {
        if (el) {
          el.dataset.groupId = group.id;
          el.classList.add('merge-clickable');
          el.addEventListener('click', () => openMergePopup(groupIndex));
        }
      });
    });
  });
  
  // Apply existing merge decisions
  diffGroups.forEach(group => {
    const decision = mergeDecisions.get(group.id);
    if (decision) {
      applyGroupDecisionUI(group.id, decision);
    }
  });
}

/**
 * Open merge popup for a group
 * @param {number} groupIndex - Index of the group in diffGroups array
 */
function openMergePopup(groupIndex) {
  const group = diffGroups[groupIndex];
  if (!group) return;
  
  activeGroupId = group.id;
  currentGroupPosition = groupIndex;
  
  // Update group indicator
  currentGroupIndex.textContent = groupIndex + 1;
  
  // Highlight the group
  clearHighlights();
  group.lines.forEach((lineIndex, i) => {
    highlightLine(lineIndex, 'current-group', i > 0);
  });
  
  // Get the content for this group and determine change type
  const { left, right } = generateSplitDiff(diffResult.diff);
  const originalLines = [];
  const modifiedLines = [];
  let changeType = null; // 'added', 'removed', or 'modified'
  
  group.diffIndices.forEach(lineIndex => {
    const leftItem = left[lineIndex];
    const rightItem = right[lineIndex];
    
    if (leftItem.type === 'removed') {
      originalLines.push(leftItem.content);
      if (!changeType) changeType = 'removed';
    } else if (leftItem.type === 'modified') {
      originalLines.push(leftItem.content);
      if (!changeType || changeType !== 'modified') changeType = 'modified';
    }
    
    if (rightItem.type === 'added') {
      modifiedLines.push(rightItem.content);
      if (!changeType) changeType = 'added';
    } else if (rightItem.type === 'modified') {
      modifiedLines.push(rightItem.content);
      if (!changeType || changeType !== 'modified') changeType = 'modified';
    }
  });
  
  // If we have both removed and added in the same group, treat as modified
  if (originalLines.length > 0 && modifiedLines.length > 0 && changeType !== 'modified') {
    changeType = 'modified';
  }
  
  // Generate highlighted content for the popup
  const generateHighlightedContent = (lines, type, compareLines = null) => {
    return lines.map((line, i) => {
      if (compareLines && compareLines[i] !== undefined) {
        // For modified lines, show inline diff
        const inlineDiff = findInlineDiffWords(
          type === 'original' ? line : compareLines[i],
          type === 'original' ? compareLines[i] : line
        );
        const result = type === 'original' ? inlineDiff.oldResult : inlineDiff.newResult;
        const highlightClass = type === 'original' ? 'removed' : 'added';
        return result.map(part => {
          if (part.changed) {
            return `<span class="highlight-${highlightClass}">${escapeHtml(part.text)}</span>`;
          }
          return escapeHtml(part.text);
        }).join('');
      } else {
        // For added/removed only lines, just apply syntax highlighting
        return highlightCSS(line);
      }
    }).join('\n');
  };
  
  // Populate and show the popup
  const popup = document.getElementById('mergePopup');
  const popupTitle = document.getElementById('mergePopupTitle');
  const popupHint = document.getElementById('mergePopupHint');
  const originalContent = document.getElementById('mergeOriginalContent');
  const modifiedContent = document.getElementById('mergeModifiedContent');
  const originalLabel = document.getElementById('mergeOriginalLabel');
  const modifiedLabel = document.getElementById('mergeModifiedLabel');
  const versionOriginal = document.getElementById('mergeVersionOriginal');
  const versionModified = document.getElementById('mergeVersionModified');
  const versionsContainer = document.getElementById('mergePopupVersions');
  const actionsContainer = document.getElementById('mergePopupActions');
  const groupNumber = document.getElementById('mergeGroupNumber');
  
  if (!popup) return;
  
  // Set group number
  groupNumber.textContent = `Change ${groupIndex + 1} of ${diffGroups.length}`;
  
  // Configure popup based on change type
  const currentDecision = mergeDecisions.get(group.id);
  
  if (changeType === 'added') {
    // Lines only exist in modified version
    popupTitle.textContent = 'New Lines Added';
    popupHint.textContent = 'These lines were added in the modified version. Keep or discard?';
    
    versionOriginal.classList.add('hidden');
    versionModified.classList.remove('hidden');
    versionsContainer.classList.add('single-version');
    
    modifiedLabel.textContent = 'Added Lines';
    modifiedContent.innerHTML = generateHighlightedContent(modifiedLines, 'added');
    
    // Update shortcut label for single version view
    versionModified.querySelector('.merge-version-shortcut').textContent = 'Press 1 to Keep, 2 to Discard';
    
    actionsContainer.innerHTML = `
      <button class="merge-popup-action merge-popup-action-keep ${currentDecision === 'keep' ? 'active' : ''}" data-action="keep">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
        <span>Keep Added Lines</span>
        <kbd>1</kbd>
      </button>
      <button class="merge-popup-action merge-popup-action-discard ${currentDecision === 'discard' ? 'active' : ''}" data-action="discard">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
        <span>Discard Added Lines</span>
        <kbd>2</kbd>
      </button>
    `;
  } else if (changeType === 'removed') {
    // Lines only exist in original version
    popupTitle.textContent = 'Lines Removed';
    popupHint.textContent = 'These lines were removed in the modified version. Restore or accept removal?';
    
    versionOriginal.classList.remove('hidden');
    versionModified.classList.add('hidden');
    versionsContainer.classList.add('single-version');
    
    originalLabel.textContent = 'Removed Lines';
    originalContent.innerHTML = generateHighlightedContent(originalLines, 'removed');
    
    // Update shortcut label for single version view
    versionOriginal.querySelector('.merge-version-shortcut').textContent = 'Press 1 to Restore, 2 to Accept Removal';
    
    actionsContainer.innerHTML = `
      <button class="merge-popup-action merge-popup-action-restore ${currentDecision === 'restore' ? 'active' : ''}" data-action="restore">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="1 4 1 10 7 10"/>
          <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
        </svg>
        <span>Restore Removed Lines</span>
        <kbd>1</kbd>
      </button>
      <button class="merge-popup-action merge-popup-action-accept ${currentDecision === 'accept' ? 'active' : ''}" data-action="accept">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
        </svg>
        <span>Accept Removal</span>
        <kbd>2</kbd>
      </button>
    `;
  } else {
    // Modified lines (exist in both but different)
    popupTitle.textContent = 'Lines Modified';
    popupHint.textContent = 'These lines were changed. Choose which version to keep.';
    
    versionOriginal.classList.remove('hidden');
    versionModified.classList.remove('hidden');
    versionsContainer.classList.remove('single-version');
    
    originalLabel.textContent = 'Original';
    modifiedLabel.textContent = 'Modified';
    
    // Reset shortcut labels for two-version view
    versionOriginal.querySelector('.merge-version-shortcut').textContent = 'Press 1';
    versionModified.querySelector('.merge-version-shortcut').textContent = 'Press 2';
    
    // Generate highlighted content with inline diffs
    const originalHighlighted = generateHighlightedContent(originalLines, 'original', modifiedLines);
    const modifiedHighlighted = generateHighlightedContent(modifiedLines, 'modified', originalLines);
    
    originalContent.innerHTML = originalHighlighted || '<span class="text-muted">(empty)</span>';
    modifiedContent.innerHTML = modifiedHighlighted || '<span class="text-muted">(empty)</span>';
    
    actionsContainer.innerHTML = `
      <button class="merge-popup-action merge-popup-action-original ${currentDecision === 'original' ? 'active' : ''}" data-action="original">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
        <span>Use Original</span>
        <kbd>1</kbd>
      </button>
      <button class="merge-popup-action merge-popup-action-modified ${currentDecision === 'modified' ? 'active' : ''}" data-action="modified">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="9 18 15 12 9 6"/>
        </svg>
        <span>Use Modified</span>
        <kbd>2</kbd>
      </button>
      <button class="merge-popup-action merge-popup-action-both ${currentDecision === 'both' ? 'active' : ''}" data-action="both">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="12" y1="5" x2="12" y2="19"/>
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        <span>Keep Both</span>
        <kbd>3</kbd>
      </button>
    `;
  }
  
  // Store change type for keyboard handling
  popup.dataset.changeType = changeType;
  
  popup.classList.remove('hidden');
}

/**
 * Close merge popup
 */
function closeMergePopup() {
  const popup = document.getElementById('mergePopup');
  if (popup) {
    popup.classList.add('hidden');
  }
  activeGroupId = null;
}

/**
 * Apply merge decision for a group
 * @param {number} groupId - Group ID
 * @param {string} action - 'original', 'modified', or 'both'
 */
function applyMergeDecision(groupId, action) {
  // Toggle if same action
  const currentDecision = mergeDecisions.get(groupId);
  if (currentDecision === action) {
    mergeDecisions.delete(groupId);
  } else {
    mergeDecisions.set(groupId, action);
  }
  
  // Update UI
  applyGroupDecisionUI(groupId, mergeDecisions.get(groupId));
  updateMergeStats();
  
  // Update unified view to reflect merge decisions
  if (currentView === 'unified') {
    renderUnifiedViewWithMergeDecisions();
  }
  
  // Update popup buttons
  const popup = document.getElementById('mergePopup');
  if (popup && !popup.classList.contains('hidden')) {
    popup.querySelectorAll('.merge-popup-action').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.action === mergeDecisions.get(groupId));
    });
  }
  
  // Auto-advance to next unresolved group
  const nextUnresolved = findNextUnresolvedGroup(groupId);
  if (nextUnresolved !== null) {
    setTimeout(() => openMergePopup(nextUnresolved), 300);
  } else {
    closeMergePopup();
  }
}

/**
 * Find next unresolved group
 * @param {number} currentGroupId - Current group ID
 * @returns {number|null} - Index of next unresolved group, or null
 */
function findNextUnresolvedGroup(currentGroupId) {
  const currentIndex = diffGroups.findIndex(g => g.id === currentGroupId);
  
  // Look for next unresolved group after current
  for (let i = currentIndex + 1; i < diffGroups.length; i++) {
    if (!mergeDecisions.has(diffGroups[i].id)) {
      return i;
    }
  }
  
  // Look from beginning
  for (let i = 0; i < currentIndex; i++) {
    if (!mergeDecisions.has(diffGroups[i].id)) {
      return i;
    }
  }
  
  return null;
}

/**
 * Apply group decision UI styling
 * @param {number} groupId - Group ID
 * @param {string|undefined} decision - Decision or undefined if cleared
 */
function applyGroupDecisionUI(groupId, decision) {
  const group = diffGroups.find(g => g.id === groupId);
  if (!group) return;
  
  // All possible decision classes
  const decisionClasses = [
    'merge-resolved',
    'merge-decision-original',
    'merge-decision-modified',
    'merge-decision-both',
    'merge-decision-keep',
    'merge-decision-discard',
    'merge-decision-restore',
    'merge-decision-accept'
  ];
  
  group.lines.forEach(lineIndex => {
    const leftLine = diffLeft.querySelector(`.diff-line[data-diff-index="${lineIndex}"]`);
    const rightLine = diffRight.querySelector(`.diff-line[data-diff-index="${lineIndex}"]`);
    
    [leftLine, rightLine].forEach(line => {
      if (line) {
        line.classList.remove(...decisionClasses);
        if (decision) {
          line.classList.add('merge-resolved', `merge-decision-${decision}`);
        }
      }
    });
  });
}

/**
 * Update merge statistics display
 */
function updateMergeStats() {
  const mergeStatsEl = document.getElementById('mergeStats');
  if (mergeStatsEl) {
    const total = diffGroups.length;
    const resolved = mergeDecisions.size;
    mergeStatsEl.textContent = `${resolved}/${total} resolved`;
    
    // Update export button state
    const exportBtn = document.getElementById('exportMergeBtn');
    if (exportBtn) {
      exportBtn.disabled = false; // Always allow export with defaults
    }
  }
}

/**
 * Get group ID for a diff line index
 * @param {number} lineIndex - Line index
 * @returns {number|null} - Group ID or null
 */
function getGroupIdForLine(lineIndex) {
  for (const group of diffGroups) {
    if (group.lines.includes(lineIndex)) {
      return group.id;
    }
  }
  return null;
}

/**
 * Generate merged CSS result
 * @returns {string} - Merged CSS content
 */
function generateMergedCSS() {
  if (!diffResult) return '';
  
  const { left, right } = generateSplitDiff(diffResult.diff);
  const lines = [];
  
  for (let i = 0; i < left.length; i++) {
    const leftItem = left[i];
    const rightItem = right[i];
    const groupId = getGroupIdForLine(i);
    const decision = groupId !== null ? mergeDecisions.get(groupId) : null;
    
    if (leftItem.type === 'unchanged') {
      // Unchanged lines always go in
      lines.push(leftItem.content);
    } else if (leftItem.type === 'removed') {
      // Line only exists in original (was removed)
      // Decision options: 'restore' (keep original), 'accept' (accept removal)
      // Also handle legacy: 'original' (same as restore), 'both' (include it)
      if (decision === 'restore' || decision === 'original' || decision === 'both') {
        lines.push(leftItem.content);
      }
      // Default (no decision or 'accept'): skip removed lines (accept deletion)
    } else if (leftItem.type === 'empty' && rightItem.type === 'added') {
      // Line only exists in modified (was added)
      // Decision options: 'keep' (keep added), 'discard' (remove added)
      // Also handle legacy: 'modified' (same as keep), 'original' (same as discard)
      if (decision === 'discard' || decision === 'original') {
        // Skip - user chose to discard the new line
      } else {
        // Default or 'keep' or 'modified' or 'both': include the new line
        lines.push(rightItem.content);
      }
    } else if (leftItem.type === 'modified') {
      // Line was modified (exists in both but different)
      // Decision options: 'original', 'modified', 'both'
      if (decision === 'original') {
        lines.push(leftItem.content);
      } else if (decision === 'both') {
        lines.push(leftItem.content);
        lines.push(rightItem.content);
      } else {
        // Default to new version for modifications
        lines.push(rightItem.content);
      }
    }
  }
  
  return lines.join('\n');
}

/**
 * Export merged CSS to a file
 */
async function exportMergedCSS() {
  // Use native save dialog if in Tauri
  if (isTauri()) {
    await saveFileDialog();
    return;
  }
  
  // Web fallback: download directly
  const mergedCSS = generateMergedCSS();
  
  // Create blob and download
  const blob = new Blob([mergedCSS], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'merged.txt';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Copy merged CSS to clipboard
 */
async function copyMergedCSS() {
  const mergedCSS = generateMergedCSS();
  
  try {
    await navigator.clipboard.writeText(mergedCSS);
    // Show feedback
    const copyBtn = document.getElementById('copyMergeBtn');
    if (copyBtn) {
      const originalText = copyBtn.innerHTML;
      copyBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> Copied!';
      setTimeout(() => {
        copyBtn.innerHTML = originalText;
      }, 2000);
    }
  } catch (err) {
    console.error('Failed to copy:', err);
  }
}

/**
 * Preview merged CSS in a modal - shows unified diff style view
 */
function previewMergedCSS() {
  const modal = document.getElementById('mergePreviewModal');
  const previewContent = document.getElementById('mergePreviewContent');
  
  if (modal && previewContent) {
    // Generate unified diff style HTML
    const previewHTML = generateUnifiedPreviewHTML();
    previewContent.innerHTML = previewHTML;
    modal.classList.remove('hidden');
  }
}

/**
 * Close merge preview modal
 */
function closeMergePreview() {
  const modal = document.getElementById('mergePreviewModal');
  if (modal) {
    modal.classList.add('hidden');
  }
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
 * Generate unified diff data with merge decisions applied
 * This shows the merged result in unified diff style
 * @param {Array} diff - Original diff array
 * @returns {Array} - Unified diff lines with merge decisions applied
 */
function generateUnifiedDiffWithMergeDecisions(diff) {
  const { left, right } = generateSplitDiff(diff);
  const result = [];
  
  for (let i = 0; i < left.length; i++) {
    const leftItem = left[i];
    const rightItem = right[i];
    const groupId = getGroupIdForLine(i);
    const decision = groupId !== null ? mergeDecisions.get(groupId) : null;
    const group = groupId !== null ? diffGroups.find(g => g.id === groupId) : null;
    const isResolved = decision !== null && decision !== undefined;
    
    if (leftItem.type === 'unchanged') {
      // Unchanged lines always shown normally
      result.push({
        type: 'unchanged',
        prefix: ' ',
        content: leftItem.content,
        leftLine: leftItem.lineNumber,
        rightLine: rightItem.lineNumber,
        resolved: false
      });
    } else if (leftItem.type === 'removed') {
      // Line was removed - show based on decision
      if (isResolved) {
        if (decision === 'restore' || decision === 'original' || decision === 'both') {
          // User chose to keep the removed line - show as "kept" (unchanged style)
          result.push({
            type: 'resolved-kept',
            prefix: ' ',
            content: leftItem.content,
            leftLine: leftItem.lineNumber,
            rightLine: null,
            resolved: true,
            decision: decision
          });
        } else {
          // User accepted the removal - show as resolved-removed
          result.push({
            type: 'resolved-removed',
            prefix: '-',
            content: leftItem.content,
            leftLine: leftItem.lineNumber,
            rightLine: null,
            resolved: true,
            decision: decision
          });
        }
      } else {
        // Not resolved - show as pending removal
        result.push({
          type: 'removed',
          prefix: '-',
          content: leftItem.content,
          leftLine: leftItem.lineNumber,
          rightLine: null,
          resolved: false
        });
      }
    } else if (leftItem.type === 'empty' && rightItem.type === 'added') {
      // Line was added - show based on decision
      if (isResolved) {
        if (decision === 'discard' || decision === 'original') {
          // User chose to discard the added line - show as resolved-discarded
          result.push({
            type: 'resolved-discarded',
            prefix: '+',
            content: rightItem.content,
            leftLine: null,
            rightLine: rightItem.lineNumber,
            resolved: true,
            decision: decision
          });
        } else {
          // User kept the added line - show as "kept" (unchanged style)
          result.push({
            type: 'resolved-kept',
            prefix: ' ',
            content: rightItem.content,
            leftLine: null,
            rightLine: rightItem.lineNumber,
            resolved: true,
            decision: decision
          });
        }
      } else {
        // Not resolved - show as pending addition
        result.push({
          type: 'added',
          prefix: '+',
          content: rightItem.content,
          leftLine: null,
          rightLine: rightItem.lineNumber,
          resolved: false
        });
      }
    } else if (leftItem.type === 'modified') {
      // Line was modified - show based on decision
      if (isResolved) {
        if (decision === 'original') {
          // User chose original - show original as kept
          result.push({
            type: 'resolved-kept',
            prefix: ' ',
            content: leftItem.content,
            leftLine: leftItem.lineNumber,
            rightLine: null,
            resolved: true,
            decision: decision
          });
        } else if (decision === 'both') {
          // User chose both - show both as kept
          result.push({
            type: 'resolved-kept',
            prefix: ' ',
            content: leftItem.content,
            leftLine: leftItem.lineNumber,
            rightLine: null,
            resolved: true,
            decision: decision
          });
          result.push({
            type: 'resolved-kept',
            prefix: ' ',
            content: rightItem.content,
            leftLine: null,
            rightLine: rightItem.lineNumber,
            resolved: true,
            decision: decision
          });
        } else {
          // User chose modified (default) - show modified as kept
          result.push({
            type: 'resolved-kept',
            prefix: ' ',
            content: rightItem.content,
            leftLine: null,
            rightLine: rightItem.lineNumber,
            resolved: true,
            decision: decision
          });
        }
      } else {
        // Not resolved - show as removed + added (standard unified diff for modifications)
        result.push({
          type: 'removed',
          prefix: '-',
          content: leftItem.content,
          leftLine: leftItem.lineNumber,
          rightLine: null,
          resolved: false
        });
        result.push({
          type: 'added',
          prefix: '+',
          content: rightItem.content,
          leftLine: null,
          rightLine: rightItem.lineNumber,
          resolved: false
        });
      }
    }
  }
  
  return result;
}

/**
 * Render unified view with merge decisions applied
 * Shows resolved groups as the chosen version
 */
function renderUnifiedViewWithMergeDecisions() {
  if (!diffResult) return;
  
  const unified = generateUnifiedDiffWithMergeDecisions(diffResult.diff);
  
  unifiedContent.innerHTML = unified.map(item => {
    const leftNum = item.leftLine !== null ? item.leftLine : '';
    const rightNum = item.rightLine !== null ? item.rightLine : '';
    const content = highlightCSS(item.content);
    
    // Add resolved class for styling
    const resolvedClass = item.resolved ? 'merge-resolved' : '';
    const decisionClass = item.decision ? `merge-decision-${item.decision}` : '';
    
    return `<div class="diff-line ${item.type} ${resolvedClass} ${decisionClass}">
      <span class="line-number">${leftNum}</span>
      <span class="line-number">${rightNum}</span>
      <span class="line-prefix">${item.prefix}</span>
      <span class="line-content">${content}</span>
    </div>`;
  }).join('');
}

/**
 * Generate HTML for unified diff preview (used in preview modal)
 * @returns {string} - HTML string for the preview
 */
function generateUnifiedPreviewHTML() {
  if (!diffResult) return '';
  
  const unified = generateUnifiedDiffWithMergeDecisions(diffResult.diff);
  
  return unified.map(item => {
    const leftNum = item.leftLine !== null ? item.leftLine : '';
    const rightNum = item.rightLine !== null ? item.rightLine : '';
    const content = highlightCSS(item.content);
    
    // Add resolved class for styling
    const resolvedClass = item.resolved ? 'merge-resolved' : '';
    const decisionClass = item.decision ? `merge-decision-${item.decision}` : '';
    
    return `<div class="diff-line ${item.type} ${resolvedClass} ${decisionClass}">
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
    // Re-render unified view with merge decisions applied
    if (diffResult) {
      renderUnifiedViewWithMergeDecisions();
    }
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
