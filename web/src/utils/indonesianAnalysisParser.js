/**
 * Enhanced text parsing utilities for Indonesian AI analysis
 * Designed to preserve Rich Text formatting (Bold) for the UI renderer
 */

/**
 * 1. Parse Indonesian AI analysis text to extract structured symptoms and recommendations
 * (Used for the specific logic in extracting data for charts/cards)
 */
export function parseIndonesianAnalysis(text) {
  if (!text || typeof text !== 'string') return { symptoms: [], recommendations: [] };

  const symptoms = [];
  const recommendations = [];

  // Extract symptoms from implications section
  const implicationsMatch = text.match(/Ketika karies tidak diobati[^:]*:([\s\S]*?)(?:\*\*(?:Perawatan|Rekomendasi)|$)/i);
  
  if (implicationsMatch) {
    const implicationsText = implicationsMatch[1];
    
    // Extract bullet points starting with * or **
    const bulletPoints = implicationsText.match(/\*\s*\*\*([^:*]+):\*\*([^*]+)/g);
    
    if (bulletPoints) {
      bulletPoints.forEach((point) => {
        const match = point.match(/\*\s*\*\*([^:*]+):\*\*([^*]+)/);
        if (match) {
          const name = match[1].trim().replace(/\*/g, '');
          const description = match[2].trim().replace(/\*/g, '');
          
          let severity = 'medium';
          if (name.toLowerCase().includes('infeksi') || name.toLowerCase().includes('nyeri')) {
            severity = 'high';
          } else if (name.toLowerCase().includes('estetika') || name.toLowerCase().includes('kesulitan')) {
            severity = 'low';
          }
          
          symptoms.push({ name, description, severity });
        }
      });
    }
  }

  // Extract recommendations from treatment section
  const treatmentMatch = text.match(/\*\*Perawatan[^:]*:\*\*([\s\S]*?)(?:\*\*Mengenai|$)/i);
  
  if (treatmentMatch) {
    const treatmentText = treatmentMatch[1];
    const treatmentPoints = treatmentText.match(/\*\s*\*\*([^:*]+):\*\*([^*]+)/g);
    
    if (treatmentPoints) {
      treatmentPoints.forEach((point) => {
        const match = point.match(/\*\s*\*\*([^:*]+):\*\*([^*]+)/);
        if (match) {
          const title = match[1].trim().replace(/\*/g, '');
          const description = match[2].trim().replace(/\*/g, '');
          
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
          
          recommendations.push({ title, description, urgency, priority });
        }
      });
    }
  }

  // Extract recommendations from general recommendation section
  const recomMatch = text.match(/\*\*Rekomendasi[^:]*:\*\*([\s\S]*?)$/i);
  
  if (recomMatch) {
    const recomText = recomMatch[1];
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
 * 2. Clean Markdown Formatting
 * UPDATED: Now PRESERVES bold characters (**) so the UI can render them.
 * Only cleans excessive whitespace and single asterisks if they aren't part of bold.
 */
export function cleanMarkdownFormatting(text) {
  if (!text || typeof text !== 'string') return '';
  
  return text
    // Replace single asterisk bullet points with a standard dash for easier parsing, 
    // BUT ignore double asterisks (bold)
    .replace(/(^|\n)\* /g, '$1- ')
    // Remove underscores (italic) as we focus on bold
    .replace(/_([^_]+)_/g, '$1')
    // Fix multiple spaces
    .replace(/\s{2,}/g, ' ')
    // Trim lines
    .split('\n')
    .map(line => line.trim())
    .join('\n')
    .trim();
}

/**
 * 3. Extract Analysis Topics
 * Identifies sections that start with "**Title:**" or "Title:" 
 * Returns an array of { title, content }
 */
export function extractAnalysisTopics(text) {
  if (!text) return [];

  // Split by double newlines to find chunks
  const blocks = text.split(/\n\s*\n/);
  const topics = [];

  blocks.forEach(block => {
    // Look for lines starting with bold text ending in colon
    // e.g. "**Diagnosa:** Periodontitis"
    const match = block.match(/^\*\*([^*]+):\*\*\s*([\s\S]*)/);
    
    if (match) {
      topics.push({
        title: match[1].trim(),
        content: parseTextWithLists(match[2].trim()) // Recursively parse the content
      });
    }
  });

  return topics;
}

/**
 * 4. Parse Text With Lists
 * Parses text into structured blocks: paragraphs, lists, and headers.
 * PRESERVES bold (**text**) markers inside the content.
 */
export function parseTextWithLists(text) {
  if (!text || typeof text !== 'string') return [];
  
  const cleaned = cleanMarkdownFormatting(text);
  const lines = cleaned.split('\n').filter(line => line.trim());
  const sections = [];
  
  let listBuffer = [];

  const flushList = () => {
    if (listBuffer.length > 0) {
      sections.push({ type: 'list', content: [...listBuffer] });
      listBuffer = [];
    }
  };

  lines.forEach((line) => {
    const trimmed = line.trim();

    // Check for List Items (- or 1.)
    const isList = /^[-\u2022]/.test(trimmed) || /^\d+\./.test(trimmed);

    if (isList) {
      // Remove the bullet/number marker but keep the rest (including bold)
      const content = trimmed.replace(/^[-\u2022]\s*/, '').replace(/^\d+\.\s*/, '');
      listBuffer.push(content);
    } 
    else {
      // If we encounter a non-list line, flush any existing list
      flushList();

      // Check for Header (ends with colon)
      if (trimmed.endsWith(':')) {
        sections.push({ 
          type: 'header', 
          content: trimmed.replace(/:$/, '') // Remove trailing colon
        });
      } 
      // Regular Paragraph
      else {
        sections.push({ type: 'paragraph', content: trimmed });
      }
    }
  });

  // Flush any remaining list at the end
  flushList();
  
  return sections;
}

// Default export for backward compatibility if needed
export default {
  parseIndonesianAnalysis,
  cleanMarkdownFormatting,
  extractAnalysisTopics,
  parseTextWithLists
};