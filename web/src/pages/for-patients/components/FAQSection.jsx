import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';

const FAQSection = () => {
  const [openFAQ, setOpenFAQ] = useState(0);

  const faqs = [
    {
      id: 1,
      category: 'AI Accuracy',
      question: 'How accurate is Serene\'s AI dental analysis?',
      answer: `Our AI has been trained on over 500,000 dental images and achieves 94% accuracy in detecting common dental conditions. The system has been validated through clinical trials with over 200 dental professionals and consistently matches or exceeds human diagnostic accuracy for early-stage conditions.\n\nHowever, AI analysis is designed to complement, not replace, professional dental examination. We always recommend consulting with a qualified dentist for definitive diagnosis and treatment planning.`
    },
    {
      id: 2,
      category: 'Privacy & Security',
      question: 'Is my dental information secure and private?',
      answer: `Absolutely. Serene is fully HIPAA compliant and uses enterprise-grade encryption to protect your data. Your dental images and personal information are:\n\n• Encrypted both in transit and at rest using AES-256 encryption\n• Stored on secure, HIPAA-compliant cloud infrastructure\n• Never shared with third parties without your explicit consent\n• Automatically deleted after 90 days unless you choose to save them\n• Accessible only to you and dental professionals you authorize\n\nWe undergo regular security audits and maintain SOC 2 Type II compliance to ensure the highest standards of data protection.`
    },
    {
      id: 3,
      category: 'When to Seek Care',
      question: 'When should I see a dentist after using the AI analysis?',
      answer: `The AI provides clear recommendations based on your analysis results:\n\n**Immediate Care (within 24-48 hours):**\n• Severe pain or swelling\n• Signs of infection or abscess\n• Trauma or injury to teeth/mouth\n• Bleeding that won't stop\n\n**Prompt Care (within 1-2 weeks):**\n• Persistent sensitivity\n• Visible cavities or damage\n• Gum inflammation or recession\n• Changes in bite or tooth alignment\n\n**Routine Care (within 1-3 months):**\n• Preventive maintenance\n• Minor cosmetic concerns\n• Regular cleaning and checkup\n\nAlways trust your instincts—if something feels wrong, don't hesitate to seek professional care regardless of the AI recommendation.`
    },
    {
      id: 4,
      category: 'Using the App',
      question: 'How do I take the best photos for AI analysis?',
      answer: `For optimal AI analysis results, follow these photo guidelines:\n\n**Lighting:**\n• Use natural daylight or bright white LED light\n• Avoid yellow/warm lighting or shadows\n• Position light source in front of your face\n\n**Camera Position:**\n• Hold phone 6-8 inches from your mouth\n• Keep camera parallel to your teeth\n• Use the guided overlay in our app\n\n**Photo Types Needed:**\n• Front view with lips retracted\n• Upper teeth view (bite down gently)\n• Lower teeth view\n• Side views (left and right)\n\n**Tips for Success:**\n• Clean teeth before photos\n• Use a dental mirror for hard-to-reach areas\n• Take multiple shots—our AI will select the best ones\n• Follow the in-app guidance prompts`
    },
    {
      id: 5,
      category: 'Cost & Insurance',
      question: 'Does insurance cover AI dental analysis?',
      answer: `Currently, most insurance plans don't directly cover AI dental analysis as it's considered a screening tool rather than a diagnostic procedure. However:\n\n**Cost Savings:**\n• Early detection can prevent costly procedures\n• Average user saves $1,200 in avoided treatments\n• Free initial analysis with basic recommendations\n\n**Insurance Integration:**\n• Some progressive insurers are beginning to cover preventive AI tools\n• HSA/FSA funds can often be used for dental screening services\n• Many Serene partner dentists offer discounted rates for AI-guided visits\n\n**Affordable Options:**\n• Free basic analysis available\n• Premium features start at $9.99/month\n• Family plans available for multiple users\n• No hidden fees or surprise charges`
    },
    {
      id: 6,
      category: 'Technical Support',
      question: 'What if the app isn\'t working properly?',
      answer: `If you're experiencing technical issues:\n\n**Common Solutions:**\n• Ensure you have the latest app version\n• Check your internet connection\n• Clear app cache and restart\n• Allow camera and storage permissions\n\n**Camera Issues:**\n• Clean your phone's camera lens\n• Ensure adequate lighting\n• Try switching between front/back cameras\n• Restart the app if camera won't focus\n\n**Upload Problems:**\n• Check file size (max 10MB per image)\n• Ensure stable internet connection\n• Try uploading one image at a time\n\n**Get Help:**\n• In-app chat support (24/7)\n• Email: support@sereneai.com\n• Phone: 1-800-SERENE-1\n• Video tutorials in the app's help section\n\nOur support team typically responds within 15 minutes during business hours.`
    }
  ];

  const toggleFAQ = (index) => {
    setOpenFAQ(openFAQ === index ? -1 : index);
  };

  return (
    <section className="py-20 bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-text-primary mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-lg text-text-secondary max-w-2xl mx-auto">
            Get answers to common questions about AI dental analysis, privacy, accuracy, and when to seek professional care.
          </p>
        </div>

        <div className="space-y-4">
          {faqs?.map((faq, index) => (
            <div key={faq?.id} className="bg-surface rounded-2xl shadow-brand overflow-hidden">
              <button
                onClick={() => toggleFAQ(index)}
                className="w-full px-6 py-6 text-left flex items-center justify-between hover:bg-muted transition-gentle"
              >
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <span className="px-3 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full">
                      {faq?.category}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-text-primary pr-4">
                    {faq?.question}
                  </h3>
                </div>
                <Icon
                  name={openFAQ === index ? "ChevronUp" : "ChevronDown"}
                  size={24}
                  className="text-text-secondary flex-shrink-0"
                />
              </button>

              <div className={`disclosure-content ${openFAQ === index ? 'open' : ''}`}>
                <div className="px-6 pb-6">
                  <div className="prose prose-sm max-w-none">
                    {faq?.answer?.split('\n\n')?.map((paragraph, pIndex) => (
                      <div key={pIndex} className="mb-4 last:mb-0">
                        {paragraph?.includes('**') ? (
                          <div className="space-y-2">
                            {paragraph?.split('\n')?.map((line, lIndex) => {
                              if (line?.includes('**')) {
                                const parts = line?.split('**');
                                return (
                                  <div key={lIndex} className="flex items-start space-x-2">
                                    {parts?.length > 1 && (
                                      <>
                                        <Icon name="CheckCircle" size={16} className="text-primary mt-0.5 flex-shrink-0" />
                                        <div>
                                          <span className="font-semibold text-text-primary">{parts?.[1]}</span>
                                          {parts?.[2] && <span className="text-text-secondary">{parts?.[2]}</span>}
                                        </div>
                                      </>
                                    )}
                                  </div>
                                );
                              } else if (line?.startsWith('•')) {
                                return (
                                  <div key={lIndex} className="flex items-start space-x-2 ml-4">
                                    <Icon name="ArrowRight" size={14} className="text-primary mt-1 flex-shrink-0" />
                                    <span className="text-text-secondary">{line?.substring(2)}</span>
                                  </div>
                                );
                              } else if (line?.trim()) {
                                return (
                                  <p key={lIndex} className="text-text-secondary">
                                    {line}
                                  </p>
                                );
                              }
                              return null;
                            })}
                          </div>
                        ) : (
                          <p className="text-text-secondary leading-relaxed">
                            {paragraph}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Contact Support */}
        <div className="mt-12 text-center">
          <div className="bg-brand-canvas p-8 rounded-2xl">
            <Icon name="MessageCircle" size={48} className="text-primary mx-auto mb-4" />
            <h3 className="text-xl font-bold text-text-primary mb-2">
              Still have questions?
            </h3>
            <p className="text-text-secondary mb-6">
              Our support team is available 24/7 to help you with any concerns about using Serene AI.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="flex items-center justify-center space-x-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-gentle">
                <Icon name="MessageCircle" size={18} />
                <span>Start Live Chat</span>
              </button>
              <button className="flex items-center justify-center space-x-2 px-6 py-3 bg-white text-text-primary rounded-lg font-medium border border-border hover:bg-muted transition-gentle">
                <Icon name="Mail" size={18} />
                <span>Email Support</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FAQSection;