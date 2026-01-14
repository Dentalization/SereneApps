/**
 * Enhanced text parsing utilities for Indonesian AI analysis
 * Extracts symptoms and recommendations from formatted text
 */

/**
 * Parse Indonesian AI analysis text to extract structured symptoms and recommendations
 */
export function parseIndonesianAnalysis(text) {
  if (!text || typeof text !== 'string') return { symptoms: [], recommendations: [] };

  const symptoms = [];
  const recommendations = [];

  // Extract symptoms from implications section
  // Look for sections like "Ketika karies tidak diobati" or bullet points with implications
  const implicationsMatch = text.match(/Ketika karies tidak diobati[^:]*:([\s\S]*?)(?:\*\*(?:Perawatan|Rekomendasi)|$)/i);
  
  if (implicationsMatch) {
    const implicationsText = implicationsMatch[1];
    
    // Extract bullet points starting with * or **
    const bulletPoints = implicationsText.match(/\*\s*\*\*([^:*]+):\*\*([^*]+)/g);
    
    if (bulletPoints) {
      bulletPoints.forEach((point, index) => {
        const match = point.match(/\*\s*\*\*([^:*]+):\*\*([^*]+)/);
        if (match) {
          const name = match[1].trim().replace(/\*/g, '');
          const description = match[2].trim().replace(/\*/g, '');
          
          // Determine severity based on keywords
          let severity = 'medium';
          if (name.toLowerCase().includes('infeksi') || name.toLowerCase().includes('nyeri')) {
            severity = 'high';
          } else if (name.toLowerCase().includes('estetika') || name.toLowerCase().includes('kesulitan')) {
            severity = 'low';
          }
          
          symptoms.push({
            name,
            description,
            severity
          });
        }
      });
    }
  }

  // Extract recommendations from treatment section
  const treatmentMatch = text.match(/\*\*Perawatan[^:]*:\*\*([\s\S]*?)(?:\*\*Mengenai|$)/i);
  
  if (treatmentMatch) {
    const treatmentText = treatmentMatch[1];
    
    // Extract bullet points for treatments
    const treatmentPoints = treatmentText.match(/\*\s*\*\*([^:*]+):\*\*([^*]+)/g);
    
    if (treatmentPoints) {
      treatmentPoints.forEach((point, index) => {
        const match = point.match(/\*\s*\*\*([^:*]+):\*\*([^*]+)/);
        if (match) {
          const title = match[1].trim().replace(/\*/g, '');
          const description = match[2].trim().replace(/\*/g, '');
          
          // Determine urgency and priority
          let urgency = 'normal';
          let priority = 'normal';
          
          if (title.toLowerCase().includes('saluran akar')) {
            urgency = 'soon';
            priority = 'high';
          } else if (title.toLowerCase().includes('mahkota') || title.toLowerCase().includes('crown')) {
            urgency = 'normal';
            priority = 'high';
          } else if (title.toLowerCase().includes('tambalan')) {
            urgency = 'soon';
            priority = 'high';
          }
          
          recommendations.push({
            title,
            description,
            urgency,
            priority
          });
        }
      });
    }
  }

  // Extract recommendations from general recommendation section
  const recomMatch = text.match(/\*\*Rekomendasi[^:]*:\*\*([\s\S]*?)$/i);
  
  if (recomMatch) {
    const recomText = recomMatch[1];
    
    // Extract numbered recommendations - capture everything until next number or end
    const numberedPoints = recomText.match(/\d+\.\s*\*\*([^*]+)\*\*([^]+?)(?=\d+\.|$)/g);
    
    if (numberedPoints) {
      numberedPoints.forEach((point) => {
        const match = point.match(/\d+\.\s*\*\*([^*]+)\*\*([^]+?)$/);
        if (match) {
          const title = match[1].trim().replace(/\*/g, '');
          const description = match[2].trim().replace(/\*/g, '');
          
          recommendations.push({
            title,
            description,
            urgency: 'immediate',
            priority: 'urgent'
          });
        }
      });
    }
  }

  return { symptoms, recommendations };
}

/**
 * Clean all markdown formatting from text
 */
export function cleanMarkdown(text) {
  if (!text || typeof text !== 'string') return '';
  
  return text
    // Remove bold markers
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    // Remove italic markers  
    .replace(/\*([^*]+)\*/g, '$1')
    // Remove underscore bold
    .replace(/__([^_]+)__/g, '$1')
    // Remove underscore italic
    .replace(/_([^_]+)_/g, '$1')
    // Clean up any remaining single asterisks
    .replace(/\*/g, '')
    // Clean up multiple spaces
    .replace(/\s{2,}/g, ' ')
    // Trim each line
    .split('\n')
    .map(line => line.trim())
    .join('\n')
    // Remove empty lines at start/end
    .trim();
}

/**
 * Format text into structured paragraphs and lists
 */
export function formatAnalysisText(text) {
  if (!text || typeof text !== 'string') return [];
  
  // First clean markdown
  const cleaned = cleanMarkdown(text);
  
  const sections = [];
  const lines = cleaned.split('\n').filter(line => line.trim());
  
  let currentParagraph = '';
  
  lines.forEach((line) => {
    // Check if it's a heading (ends with :)
    if (line.trim().endsWith(':')) {
      // Save current paragraph
      if (currentParagraph) {
        sections.push({ type: 'paragraph', content: currentParagraph.trim() });
        currentParagraph = '';
      }
      // Add heading
      sections.push({ type: 'heading', content: line.replace(':', '').trim() });
    }
    // Check if it's a list item (starts with number or bullet)
    else if (/^\d+\./.test(line.trim()) || line.trim().startsWith('-')) {
      // Save current paragraph
      if (currentParagraph) {
        sections.push({ type: 'paragraph', content: currentParagraph.trim() });
        currentParagraph = '';
      }
      // Add list item
      const content = line.replace(/^\d+\.\s*/, '').replace(/^-\s*/, '').trim();
      sections.push({ type: 'list-item', content });
    }
    // Regular paragraph text
    else {
      currentParagraph += (currentParagraph ? ' ' : '') + line.trim();
    }
  });
  
  // Add remaining paragraph
  if (currentParagraph) {
    sections.push({ type: 'paragraph', content: currentParagraph.trim() });
  }
  
  return sections;
}

export default {
  parseIndonesianAnalysis,
  cleanMarkdown,
  formatAnalysisText
};
