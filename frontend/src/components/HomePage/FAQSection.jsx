import React, { useState } from 'react';
import FAQItem from './FAQItem';
import { BiSupport } from "react-icons/bi";
import { Link } from 'react-router-dom';
import './FAQSection.css';

const FAQSection = ({ faqs, loading, isBlog = false }) => {
  const [openIndex, setOpenIndex] = useState(null);

  const toggleFAQ = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div id='faq' className="faq-section section-padding">
      <div className="container">
        
        {/* Header */}
        <div className="section-header text-center mb-5">
          <h2 className="section-title">Frequently Asked Questions</h2>
          {!isBlog && <p className="section-subtitle">Everything you need to know about parking with RS Express</p>}
        </div>

        {/* FAQ List */}
        <div className="faq-container-width mx-auto">
          {loading ? (
            <div className="faq-items faq-loading-items" aria-label="Loading answers">
              {Array.from({ length: 6 }).map((_, index) => (
                <div className="faq-card faq-skeleton-card" aria-hidden="true" key={index}>
                  <span />
                </div>
              ))}
            </div>
          ) : (
            <div className="faq-items">
              {faqs.map((faq, index) => (
                <FAQItem 
                  key={index} 
                  question={faq.question} 
                  answer={faq.answer} 
                  isOpen={openIndex === index}
                  onClick={() => toggleFAQ(index)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Contact Support CTA */}
        {!isBlog && (
          <div className="faq-support-card mt-5 text-center">
            <div className="icon-box mb-3">
               <BiSupport size={30} color="#fff"/>
            </div>
            <h4>Still have questions?</h4>
            <p>Can’t find the answer you’re looking for? Please contact our friendly support team.</p>
            <Link to="/contact-us" className="contact-link">Contact Support</Link>
          </div>
        )}

      </div>
    </div>
  );
};

export default FAQSection;
