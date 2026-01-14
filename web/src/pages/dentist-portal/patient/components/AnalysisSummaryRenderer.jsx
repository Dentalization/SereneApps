import React from 'react';
import { useLanguage } from '../../../../contexts/LanguageContext';
import { cleanMarkdownFormatting, extractAnalysisTopics, parseTextWithLists } from '../../../../utils/textFormatting';
import { stripDiagnosisIntro } from '../../../../utils/aiTextHelpers';

/**
 * Component to render formatted analysis summary
 * Handles both structured (with topics) and unstructured text
 */
const AnalysisSummaryRenderer = ({ summary, findings, overallAssessment }) => {
  const { t } = useLanguage();
  
  const cleanInput = (value) => {
    if (!value) return null;
    if (Array.isArray(value)) {
      const joined = value.filter(Boolean).join('\n');
      return stripDiagnosisIntro(joined);
    }
    if (typeof value !== 'string') {
      return stripDiagnosisIntro(String(value));
    }
    return stripDiagnosisIntro(value);
  };

  const textContent = cleanInput(overallAssessment) || cleanInput(summary) || cleanInput(findings);
  
  if (!textContent) {
    return (
      <div className="text-center py-8 text-secondary">
        {t('dentistPatient.ai.summary.empty') || 'Tidak ada ringkasan analisis'}
      </div>
    );
  }

  // Try to extract structured topics (pattern like "**Topic:** content")
  const topics = extractAnalysisTopics(textContent);
  
  if (topics.length > 0) {
    return (
      <div className="space-y-6">
        {topics.map((topic, topicIndex) => (
          <div key={topicIndex} className="space-y-4">
            <h4 className="text-base font-semibold text-primary border-b border-primary/20 pb-2">
              {topic.title}
            </h4>
            
            <StructuredContent content={topic.content} />
          </div>
        ))}
      </div>
    );
  }

  // Otherwise, render as unstructured paragraphs
  const cleaned = cleanMarkdownFormatting(textContent);
  const sections = parseTextWithLists(cleaned);

  return (
    <div className="space-y-5">
      {sections.map((section, idx) => (
        <StructuredContent key={idx} content={[section]} />
      ))}
    </div>
  );
};

/**
 * Helper component to render structured content (paragraphs and lists)
 */
const StructuredContent = ({ content }) => {
  if (!Array.isArray(content)) {
    // Single section
    content = [content];
  }

  return (
    <>
      {content.map((section, idx) => {
        if (!section) return null;

        if (section.type === 'header') {
          return (
            <h5 key={idx} className="text-sm font-semibold text-primary border-b border-primary/20 pb-2 mt-4">
              {cleanMarkdownFormatting(section.content)}
            </h5>
          );
        }

        if (section.type === 'paragraph') {
          return (
            <p key={idx} className="text-sm text-primary leading-relaxed text-justify whitespace-pre-wrap">
              {cleanMarkdownFormatting(section.content)}
            </p>
          );
        }

        if (section.type === 'list') {
          return (
            <ul key={idx} className="space-y-2 ml-0">
              {section.content.map((item, itemIdx) => (
                <li key={itemIdx} className="text-sm text-primary flex items-start gap-3">
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-brand-primary/20 text-brand-primary text-xs font-bold mt-0.5 flex-shrink-0">
                    •
                  </span>
                  <span className="leading-relaxed">{cleanMarkdownFormatting(item)}</span>
                </li>
              ))}
            </ul>
          );
        }

        return null;
      })}
    </>
  );
};

export default AnalysisSummaryRenderer;
