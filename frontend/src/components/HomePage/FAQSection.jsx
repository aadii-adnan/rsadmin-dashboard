import React from 'react';
import FAQItem from './FAQItem';

const FAQSection = ({faqs, loading}) => {


  return (
    <div id='faq' className="faq-section container py-5">
      <div className="text-center mb-4">
        <p className="faq-subtitle">Answers to Common Dublin Airport Parking Queries</p>
        <h2 className="faq-title">Frequently Asked Questions</h2>
      </div>
      <div className="faq-items">
        {loading ? (
          <p>Loading FAQs...</p>
        ) : (
          faqs.map((faq, index) => (
            <FAQItem key={index} question={faq.question} answer={faq.answer} />
          ))
        )}
      </div>
    </div>
  );
};

export default FAQSection;