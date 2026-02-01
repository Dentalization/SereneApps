import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const FAQSection = () => {
  const [openFAQ, setOpenFAQ] = useState(null);

  const faqs = [
    {
      id: 1,
      category: 'Technology',
      question: 'How accurate is the AI diagnosis?',
      answer: [
        "Our models (YOLOv8 & ResNet) achieve a 94.7% accuracy rate in detecting common pathologies like caries and gingivitis.",
        "While highly precise, this tool is designed for screening. A licensed dentist must verify all findings before treatment."
      ]
    },
    {
      id: 2,
      category: 'Privacy',
      question: 'Is my dental data secure?',
      answer: [
        "Yes. We are HIPAA and SOC-2 compliant. All images are anonymized and encrypted using AES-256 before being processed.",
        "You own your data and can request permanent deletion at any time."
      ]
    },
    {
      id: 3,
      category: 'Medical',
      question: 'Can this replace my dentist?',
      answer: [
        "No. Serene AI is a decision-support tool. It cannot perform physical exams, tactile sensing, or X-rays.",
        "It is best used for early detection, second opinions, and tracking oral hygiene progress between visits."
      ]
    },
    {
      id: 4,
      category: 'Usage',
      question: 'What if I can\'t take a clear photo?',
      answer: [
        "The app includes a guided capture mode that will reject blurry or dark images automatically.",
        "If you struggle, you can also upload existing photos from your gallery if they meet our quality standards."
      ]
    },
    {
      id: 5,
      category: 'Cost',
      question: 'Is it covered by insurance?',
      answer: [
        "Teledentistry codes (D9995/D9996) may apply for remote evaluations depending on your carrier.",
        "We provide a standard superbill that you can submit for potential reimbursement."
      ]
    }
  ];

  const toggleFAQ = (index) => {
    setOpenFAQ(openFAQ === index ? null : index);
  };

  return (
    <section className="py-24 bg-slate-50 dark:bg-slate-950 relative overflow-hidden">
      
      {/* Decor */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold uppercase tracking-wider mb-6">
            <Icon name="HelpCircle" size={14} />
            <span>Support</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-bold text-slate-900 dark:text-white mb-6">
            Frequently Asked <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
              Questions
            </span>
          </h2>
          <p className="text-lg text-slate-600 dark:text-slate-400">
            Everything you need to know about AI dental screening.
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => {
            const isOpen = openFAQ === index;
            
            return (
              <div 
                key={faq.id} 
                className={`bg-white dark:bg-slate-900 rounded-2xl border transition-all duration-300 ${
                  isOpen 
                    ? 'border-blue-500 shadow-lg' 
                    : 'border-slate-200 dark:border-slate-800 hover:border-blue-300'
                }`}
              >
                <button
                  onClick={() => toggleFAQ(index)}
                  className="w-full px-6 py-5 flex items-center justify-between text-left group"
                >
                  <div>
                    <div className="text-xs font-bold text-blue-600 uppercase tracking-wide mb-1">{faq.category}</div>
                    <h3 className={`text-lg font-semibold transition-colors ${isOpen ? 'text-blue-600' : 'text-slate-900 dark:text-white group-hover:text-blue-500'}`}>
                      {faq.question}
                    </h3>
                  </div>
                  <div className={`p-2 rounded-full transition-all duration-300 ${isOpen ? 'bg-blue-600 text-white rotate-180' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 rotate-0'}`}>
                    <Icon name="ChevronDown" size={20} />
                  </div>
                </button>

                {/* --- SMOOTH ANIMATION CONTAINER --- */}
                <div 
                  className={`grid transition-[grid-template-rows] duration-300 ease-out ${
                    isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                  }`}
                >
                  <div className="overflow-hidden min-h-0">
                    <div className="px-6 pb-6 pt-0 text-slate-600 dark:text-slate-400 leading-relaxed border-t border-dashed border-slate-100 dark:border-slate-800 mt-2">
                      <div className="pt-4 space-y-3">
                        {faq.answer.map((p, i) => (
                          <p key={i} className="flex gap-3">
                            <Icon name="Check" size={16} className="text-green-500 shrink-0 mt-1" />
                            <span>{p}</span>
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                {/* --- END ANIMATION CONTAINER --- */}

              </div>
            );
          })}
        </div>

        <div className="mt-16 text-center bg-slate-900 dark:bg-slate-800 rounded-3xl p-8 lg:p-12 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/20 rounded-full blur-[80px]" />
          
          <div className="relative z-10">
            <h3 className="text-2xl font-bold text-white mb-4">Still have questions?</h3>
            <p className="text-slate-400 mb-8 max-w-lg mx-auto">
              Can't find the answer you're looking for? Please chat to our friendly team.
            </p>
            <div className="flex justify-center gap-4">
              {/* WhatsApp / Chat Button */}
              <a 
                href="https://wa.me/6281287928805" 
                target="_blank" 
                rel="noopener noreferrer"
              >
                <Button 
                  className="bg-white text-slate-900 hover:bg-slate-100 border-none" 
                  iconName="MessageCircle"
                >
                  Chat on WhatsApp
                </Button>
              </a>

              {/* Email Support Button */}
              <a href="mailto:serene.management@gmail.com">
                <Button 
                  variant="outline" 
                  className="text-white border-white/20 hover:bg-white/10" 
                  iconName="Mail"
                >
                  Email Support
                </Button>
              </a>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
};

export default FAQSection;