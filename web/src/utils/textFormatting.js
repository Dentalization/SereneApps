/**
 * Utility functions for formatting and cleaning text content
 * UPDATED: Preserves Bold Formatting (**) for Rich Text Rendering
 */

/**
 * CORE FUNCTION: Normalize AI explanation into structured summary + details
 */
export const normalizeAIExplanation = (rawData) => {
  if (!rawData) return null;
  
  let fullText =
    rawData.description ||
    rawData.details ||
    rawData.explanation ||
    rawData.summary ||
    rawData.findings ||
    rawData.overallAssessment ||
    '';
  if (!fullText || typeof fullText !== 'string') return null;
  
  // Clean basic formatting but KEEP BOLD
  let cleaned = cleanMarkdownFormatting(fullText);
  
  // CRITICAL: Inject line breaks BEFORE semantic headers
  cleaned = cleaned.replace(/([.!?])\s+(Mengenai|Ketika|Perawatan|Rekomendasi|Penyebab|Tujuan|Masalah)/gi, '$1\n\n$2');
  // Also split before numbered lists
  cleaned = cleaned.replace(/([.!?])\s+(\d+\.)/g, '$1\n$2');
  
  // Extract SUMMARY
  let summary = '';
  const sentences = cleaned.replace(/\*\*/g, '').match(/[^.!?]+[.!?]+/g); // Strip bold for summary extraction logic
  if (sentences && sentences.length > 0) {
    for (const sent of sentences) {
      const trimmed = sent.trim();
      if (trimmed.length > 20 && 
          !trimmed.toLowerCase().includes('analysis') &&
          !trimmed.toLowerCase().includes('analisis dental')) {
        summary = trimmed;
        if (summary.length > 150) {
          const words = summary.split(' ');
          summary = words.slice(0, 15).join(' ').trim() + '...';
        }
        break;
      }
    }
  }
  
  if (!summary) {
    summary = cleaned.replace(/\*\*/g, '').substring(0, 147).trim() + '...';
  }
  
  // Extract SECTIONS
  const sections = [];
  const lines = cleaned.split('\n');
  let currentSection = null;
  let currentContent = [];
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    
    // Check if line looks like a header (bold or plain text ending in colon)
    const headerMatch = trimmed.match(/^(\**?[^:]+?\**?):\s*(.*)$/);
    
    if (headerMatch && headerMatch[1].length < 100 && headerMatch[1].length > 3) {
      if (currentSection && currentContent.length > 0) {
        const content = currentContent.join(' ').trim();
        if (content.length > 20) {
          sections.push({
            title: currentSection.replace(/\*\*/g, ''), // Clean bold from title for cleaner display
            content: content,
          });
        }
      }
      currentSection = headerMatch[1].trim();
      currentContent = headerMatch[2] ? [headerMatch[2].trim()] : [];
    } else if (currentSection) {
      currentContent.push(trimmed);
    }
  }
  
  if (currentSection && currentContent.length > 0) {
    const content = currentContent.join(' ').trim();
    if (content.length > 20) {
      sections.push({
        title: currentSection.replace(/\*\*/g, ''),
        content: content,
      });
    }
  }
  
  if (sections.length === 0) {
    const paragraphs = cleaned.split(/(?<=[.!?])\s+(?=[A-Z][a-z])/);
    paragraphs.forEach((para, idx) => {
      const trimmed = para.trim();
      if (trimmed.length > 50) {
        sections.push({ title: `Bagian ${idx + 1}`, content: trimmed });
      }
    });
  }
  
  if (sections.length === 0) {
    sections.push({ title: 'Penjelasan Lengkap', content: cleaned });
  }
  
  return {
    summary: summary,
    explanation: cleaned,
    sections: sections,
    confidence: rawData.confidence || rawData.confidenceScore || 0,
  };
};

/**
 * Clean markdown formatting
 * UPDATED: Preserves **bold** markers.
 * Converts single * bullets to dashes for easier list parsing.
 */
export const cleanMarkdownFormatting = (text) => {
  if (!text || typeof text !== 'string') return '';
  
  return text
    // Replace single asterisk bullet points with dashes (lists), ignore bold **
    .replace(/(^|\n)\* /g, '$1- ')
    // Remove italic underscores
    .replace(/_([^_]+)_/g, '$1')
    // Remove stray probability lines
    .replace(/^\s*\d+%\s*probability\s*$/gim, '')
    // Fix multiple spaces
    .replace(/\s{2,}/g, ' ')
    // Trim lines
    .split('\n').map(line => line.trim()).join('\n')
    .trim();
};

/**
 * Parse markdown-style bullet lists
 * Preserves bold formatting in content.
 */
export const parseTextWithLists = (text) => {
  if (!text || typeof text !== 'string') return [];
  
  const cleanedText = cleanMarkdownFormatting(text);
  
  // Inject line breaks before headers if missing
  const injected = cleanedText.replace(/(Perawatan|Rekomendasi|Mengenai|Ringkasan|Kesimpulan)\s*:/gi, '\n$1:');
  const lines = injected.split('\n');
  const sections = [];
  
  let currentSection = { type: 'paragraph', content: [] };

  const flushSection = () => {
    if (currentSection.content.length > 0) {
      if (currentSection.type === 'paragraph') {
        const cleaned = currentSection.content.join(' ').trim();
        if (cleaned) sections.push({ type: 'paragraph', content: cleaned });
      } else {
        // List
        sections.push({ type: 'list', content: [...currentSection.content] });
      }
    }
    currentSection = { type: 'paragraph', content: [] };
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) {
      flushSection();
      continue;
    }

    const isHeader = line.endsWith(':');
    const isBullet = /^[\-\+\u2022]/.test(line) || /^\d+\./.test(line);

    if (isBullet) {
      if (currentSection.type !== 'list') flushSection();
      currentSection.type = 'list';
      // Strip bullet marker but keep bold text
      const content = line.replace(/^[\-\+\u2022]\s*/, '').replace(/^\d+\.\s*/, '');
      currentSection.content.push(content);
    } 
    else if (isHeader) {
      flushSection();
      sections.push({ 
        type: 'header', 
        content: line.replace(/:$/, '') // Remove trailing colon
      });
    } 
    else {
      if (currentSection.type === 'list') flushSection(); // Break list on new paragraph
      currentSection.type = 'paragraph';
      currentSection.content.push(line);
    }
  }

  flushSection();
  return sections;
};

/**
 * Extract key information from analysis text
 * Supports bold headers e.g. "**Title:** Content"
 */
export const extractAnalysisTopics = (text) => {
  if (!text || typeof text !== 'string') return [];
  
  const topics = [];
  // Split by double newlines to find chunks
  const blocks = text.split(/\n\s*\n/);

  blocks.forEach(block => {
    // Look for lines starting with bold text ending in colon
    const match = block.match(/^(\**?[^:]+?\**?):\s*([\s\S]*)/);
    
    if (match) {
      topics.push({
        title: cleanMarkdownFormatting(match[1]), // Remove bold markers from title
        content: cleanMarkdownFormatting(match[2]), // Keep bold markers in content
      });
    }
  });
  
  return topics;
};

/**
 * Format analysis summary with proper structure
 */
export const formatAnalysisSummary = (text) => {
  if (!text || typeof text !== 'string') return null;
  
  const cleaned = cleanMarkdownFormatting(text);
  const topics = extractAnalysisTopics(cleaned);
  
  if (topics.length > 0) {
    return {
      type: 'structured',
      topics: topics.map(t => ({
        title: t.title,
        content: parseTextWithLists(t.content),
      })),
    };
  }
  
  const sections = parseTextWithLists(cleaned);
  
  return {
    type: 'unstructured',
    sections,
  };
};

/**
 * Truncate text
 */
export const truncateText = (text, maxLength = 200) => {
  if (!text || text.length <= maxLength) return text;
  const truncated = text.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  return lastSpace > 0 ? truncated.substring(0, lastSpace) + '...' : truncated + '...';
};

export default {
  normalizeAIExplanation,
  cleanMarkdownFormatting,
  parseTextWithLists,
  extractAnalysisTopics,
  formatAnalysisSummary,
  truncateText
};