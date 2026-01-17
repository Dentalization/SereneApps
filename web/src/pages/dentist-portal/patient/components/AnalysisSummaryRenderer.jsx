import React from 'react';
import { useLanguage } from '../../../../contexts/LanguageContext';
import { extractAnalysisTopics, parseTextWithLists } from '../../../../utils/textFormatting';
import { stripDiagnosisIntro } from '../../../../utils/aiTextHelpers';

/**
 * Helper to render text with Bold formatting (**text**)
 * UPDATED: Uses split index logic for robust parsing
 */
const RichText = ({ text }) => {
  if (!text) return null;
  
  // Split by bold markers. Capturing group () keeps the delimiters in the array.
  const parts = text.split(/(\*\*.*?\*\*)/g);
  
  return (
    <>
      {parts.map((part, i) => {
        // In a split with capture groups, odd indices are always the matches
        if (i % 2 === 1) {
          const content = part.slice(2, -2); // Remove the ** asterisks
          return (
            <strong key={i} className="font-bold text-slate-900">
              {content}
            </strong>
          );
        }
        // Even indices are the normal text
        return <span key={i}>{part}</span>;
      })}
    </>
  );
};

// ... (Sisa kode AnalysisSummaryRenderer sama seperti sebelumnya) ...

const AnalysisSummaryRenderer = ({ summary, findings, overallAssessment }) => {
  // (Simpan kode AnalysisSummaryRenderer yang lama, cukup ganti RichText di atas)
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

  const topics = extractAnalysisTopics(textContent);
  
  if (topics.length > 0) {
    return (
      <div className="space-y-6">
        {topics.map((topic, topicIndex) => (
          <div key={topicIndex} className="bg-surface/50 rounded-lg p-1">
            <h4 className="text-base font-bold text-primary border-b border-primary/10 pb-2 mb-3">
              <RichText text={topic.title} />
            </h4>
            <StructuredContent content={topic.content} />
          </div>
        ))}
      </div>
    );
  }

  const sections = parseTextWithLists(textContent);

  return (
    <div className="space-y-4">
      {sections.map((section, idx) => (
        <StructuredContent key={idx} content={[section]} />
      ))}
    </div>
  );
};

const StructuredContent = ({ content }) => {
  if (!Array.isArray(content)) content = [content];

  return (
    <>
      {content.map((section, idx) => {
        if (!section) return null;

        if (section.type === 'header') {
          return (
            <h5 key={idx} className="text-sm font-bold text-primary mt-4 mb-2">
              <RichText text={section.content} />
            </h5>
          );
        }

        if (section.type === 'paragraph') {
          return (
            <p key={idx} className="text-sm text-primary leading-[1.8] text-justify mb-3 last:mb-0">
              <RichText text={section.content} />
            </p>
          );
        }

        if (section.type === 'list') {
          return (
            <ul key={idx} className="space-y-2 mb-3 pl-1">
              {section.content.map((item, itemIdx) => (
                <li key={itemIdx} className="text-sm text-primary flex items-start gap-3">
                  <span className="mt-2 w-1.5 h-1.5 bg-primary/60 rounded-full flex-shrink-0" />
                  <span className="leading-[1.7] text-justify">
                    <RichText text={item} />
                  </span>
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