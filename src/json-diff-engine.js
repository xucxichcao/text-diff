/**
 * JSON Diff Engine
 * Deep structural comparison for JSON objects
 */

/**
 * Check if a string is valid JSON
 * @param {string} str - String to check
 * @returns {boolean}
 */
export function isValidJSON(str) {
  if (!str || typeof str !== 'string') return false;
  const trimmed = str.trim();
  if (!trimmed) return false;
  
  // Quick check for JSON-like structure
  if (!(trimmed.startsWith('{') || trimmed.startsWith('['))) return false;
  
  try {
    JSON.parse(trimmed);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Parse JSON string safely
 * @param {string} str - JSON string
 * @returns {any|null} Parsed object or null if invalid
 */
export function parseJSON(str) {
  try {
    return JSON.parse(str.trim());
  } catch (e) {
    return null;
  }
}

/**
 * Sort object keys recursively for consistent comparison
 * @param {any} obj - Object to sort
 * @returns {any} Object with sorted keys
 */
export function sortKeys(obj) {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sortKeys);
  }
  
  const sorted = {};
  const keys = Object.keys(obj).sort();
  for (const key of keys) {
    sorted[key] = sortKeys(obj[key]);
  }
  return sorted;
}

/**
 * Get the type of a value for display
 * @param {any} value 
 * @returns {string}
 */
export function getValueType(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

/**
 * Deep compare two JSON values and generate a diff tree
 * @param {any} oldVal - Original value
 * @param {any} newVal - New value
 * @param {string} path - Current JSON path
 * @returns {DiffNode}
 */
export function compareJSON(oldVal, newVal, path = '') {
  const oldType = getValueType(oldVal);
  const newType = getValueType(newVal);
  
  // Both undefined/missing
  if (oldVal === undefined && newVal === undefined) {
    return null;
  }
  
  // Addition (only in new)
  if (oldVal === undefined) {
    return {
      type: 'added',
      path,
      oldValue: undefined,
      newValue: newVal,
      valueType: newType,
      children: newType === 'object' || newType === 'array' 
        ? buildAddedTree(newVal, path) 
        : null
    };
  }
  
  // Deletion (only in old)
  if (newVal === undefined) {
    return {
      type: 'removed',
      path,
      oldValue: oldVal,
      newValue: undefined,
      valueType: oldType,
      children: oldType === 'object' || oldType === 'array'
        ? buildRemovedTree(oldVal, path)
        : null
    };
  }
  
  // Type changed
  if (oldType !== newType) {
    return {
      type: 'modified',
      path,
      oldValue: oldVal,
      newValue: newVal,
      oldType,
      newType,
      valueType: newType,
      children: null
    };
  }
  
  // Both are objects
  if (oldType === 'object') {
    return compareObjects(oldVal, newVal, path);
  }
  
  // Both are arrays
  if (oldType === 'array') {
    return compareArrays(oldVal, newVal, path);
  }
  
  // Primitive values
  if (oldVal === newVal) {
    return {
      type: 'unchanged',
      path,
      oldValue: oldVal,
      newValue: newVal,
      valueType: oldType,
      children: null
    };
  } else {
    return {
      type: 'modified',
      path,
      oldValue: oldVal,
      newValue: newVal,
      valueType: oldType,
      children: null
    };
  }
}

/**
 * Compare two objects
 * @param {object} oldObj 
 * @param {object} newObj 
 * @param {string} path 
 * @returns {DiffNode}
 */
function compareObjects(oldObj, newObj, path) {
  const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);
  const sortedKeys = Array.from(allKeys).sort();
  
  const children = [];
  let hasChanges = false;
  
  for (const key of sortedKeys) {
    const childPath = path ? `${path}.${key}` : key;
    const child = compareJSON(oldObj[key], newObj[key], childPath);
    
    if (child) {
      children.push({ key, ...child });
      if (child.type !== 'unchanged') {
        hasChanges = true;
      }
    }
  }
  
  return {
    type: hasChanges ? 'modified' : 'unchanged',
    path,
    oldValue: oldObj,
    newValue: newObj,
    valueType: 'object',
    children,
    hasChanges
  };
}

/**
 * Compare two arrays
 * @param {array} oldArr 
 * @param {array} newArr 
 * @param {string} path 
 * @returns {DiffNode}
 */
function compareArrays(oldArr, newArr, path) {
  const maxLen = Math.max(oldArr.length, newArr.length);
  const children = [];
  let hasChanges = false;
  
  for (let i = 0; i < maxLen; i++) {
    const childPath = `${path}[${i}]`;
    const child = compareJSON(oldArr[i], newArr[i], childPath);
    
    if (child) {
      children.push({ key: i, index: i, ...child });
      if (child.type !== 'unchanged') {
        hasChanges = true;
      }
    }
  }
  
  return {
    type: hasChanges ? 'modified' : 'unchanged',
    path,
    oldValue: oldArr,
    newValue: newArr,
    valueType: 'array',
    children,
    hasChanges
  };
}

/**
 * Build a tree for entirely added values
 * @param {any} value 
 * @param {string} path 
 * @returns {array|null}
 */
function buildAddedTree(value, path) {
  if (value === null || typeof value !== 'object') {
    return null;
  }
  
  if (Array.isArray(value)) {
    return value.map((item, i) => ({
      key: i,
      index: i,
      type: 'added',
      path: `${path}[${i}]`,
      oldValue: undefined,
      newValue: item,
      valueType: getValueType(item),
      children: buildAddedTree(item, `${path}[${i}]`)
    }));
  }
  
  return Object.keys(value).sort().map(key => ({
    key,
    type: 'added',
    path: path ? `${path}.${key}` : key,
    oldValue: undefined,
    newValue: value[key],
    valueType: getValueType(value[key]),
    children: buildAddedTree(value[key], path ? `${path}.${key}` : key)
  }));
}

/**
 * Build a tree for entirely removed values
 * @param {any} value 
 * @param {string} path 
 * @returns {array|null}
 */
function buildRemovedTree(value, path) {
  if (value === null || typeof value !== 'object') {
    return null;
  }
  
  if (Array.isArray(value)) {
    return value.map((item, i) => ({
      key: i,
      index: i,
      type: 'removed',
      path: `${path}[${i}]`,
      oldValue: item,
      newValue: undefined,
      valueType: getValueType(item),
      children: buildRemovedTree(item, `${path}[${i}]`)
    }));
  }
  
  return Object.keys(value).sort().map(key => ({
    key,
    type: 'removed',
    path: path ? `${path}.${key}` : key,
    oldValue: value[key],
    newValue: undefined,
    valueType: getValueType(value[key]),
    children: buildRemovedTree(value[key], path ? `${path}.${key}` : key)
  }));
}

/**
 * Count changes in a diff tree
 * @param {DiffNode} node 
 * @returns {{added: number, removed: number, modified: number}}
 */
export function countChanges(node) {
  const counts = { added: 0, removed: 0, modified: 0 };
  
  function traverse(n) {
    if (!n) return;
    
    if (n.type === 'added' && !n.children) {
      counts.added++;
    } else if (n.type === 'removed' && !n.children) {
      counts.removed++;
    } else if (n.type === 'modified' && !n.children) {
      counts.modified++;
    }
    
    if (n.children) {
      n.children.forEach(traverse);
    }
  }
  
  traverse(node);
  return counts;
}

/**
 * Flatten diff tree to get all changed paths
 * @param {DiffNode} node 
 * @returns {array}
 */
export function getChangedPaths(node) {
  const paths = [];
  
  function traverse(n) {
    if (!n) return;
    
    if (n.type !== 'unchanged' && n.path) {
      paths.push({
        path: n.path,
        type: n.type,
        oldValue: n.oldValue,
        newValue: n.newValue
      });
    }
    
    if (n.children) {
      n.children.forEach(traverse);
    }
  }
  
  traverse(node);
  return paths;
}

/**
 * Format a value for display
 * @param {any} value 
 * @param {boolean} truncate 
 * @returns {string}
 */
export function formatValue(value, truncate = true) {
  if (value === undefined) return 'undefined';
  if (value === null) return 'null';
  
  if (typeof value === 'string') {
    const display = truncate && value.length > 50 
      ? value.substring(0, 50) + '...' 
      : value;
    return `"${display}"`;
  }
  
  if (typeof value === 'object') {
    if (Array.isArray(value)) {
      return `Array(${value.length})`;
    }
    const keys = Object.keys(value);
    return `Object(${keys.length} keys)`;
  }
  
  return String(value);
}
