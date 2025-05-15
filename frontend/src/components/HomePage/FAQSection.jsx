import React, { useEffect, useState } from 'react';
import FAQItem from './FAQItem';

const FAQSection = () => {
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFAQs = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/faqs/`); // Update with your actual endpoint
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        setFaqs(data);
      } catch (error) {
        console.error('Error fetching FAQs:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFAQs();
  }, []);

  return (
    <div className="faq-section container py-5">
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