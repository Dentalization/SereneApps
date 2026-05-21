/**
 * Avatar gradient system that follows light/dark mode theme
 */

// Light mode gradients - very light, pastel colors for light backgrounds
const LIGHT_GRADIENTS = [
  ['#ddd6fe', '#c7d2fe'],  // Purple pastel
  ['#e9d5ff', '#ddd6fe'],  // Violet pastel
  ['#cffafe', '#a5f3fc'],  // Cyan pastel
  ['#fbcfe8', '#f5d4e6'],  // Pink pastel
  ['#bfdbfe', '#93c5fd'],  // Blue pastel
  ['#fed7aa', '#fcd34d'],  // Amber pastel
  ['#d1fae5', '#a7f3d0'],  // Emerald pastel
  ['#fecaca', '#fca5a5'],  // Rose pastel
];

// Dark mode gradients - brighter, more vibrant for contrast
const DARK_GRADIENTS = [
  ['#c084fc', '#a78bfa'],  // Purple light
  ['#d8b4fe', '#c4b5fd'],  // Purple lighter
  ['#a5f3fc', '#67e8f9'],  // Cyan
  ['#f0abfc', '#d8b4fe'],  // Fuchsia
  ['#93c5fd', '#60a5fa'],  // Blue light
  ['#fbbf24', '#f59e0b'],  // Amber
  ['#34d399', '#10b981'],  // Emerald
  ['#fb7185', '#f43f5e'],  // Rose
];

/**
 * Get gradient colors based on theme
 * @param {string} name - Name to hash for consistent gradients
 * @param {boolean} isDark - Whether dark mode is active
 * @returns {Object} Style object with background gradient
 */
export function getAvatarGradient(name = '', isDark = false) {
  const gradients = isDark ? DARK_GRADIENTS : LIGHT_GRADIENTS;
  const hash = [...String(name)].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const [from, to] = gradients[hash % gradients.length];
  return { 
    background: `linear-gradient(135deg, ${from}, ${to})`,
    backgroundImage: `linear-gradient(135deg, ${from}, ${to})`,
    borderRadius: '10px'
  };
}

/**
 * Get initials from a name
 * @param {string} name - The name to extract initials from
 * @returns {string} Uppercase initials (max 2 characters)
 */
export function getInitials(name = '') {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '??';
}
