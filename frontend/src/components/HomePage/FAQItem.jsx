import React from 'react';
import { FaPlus, FaMinus } from "react-icons/fa";

const FAQItem = ({ question, answer, isOpen, onClick }) => {
  return (
    <div className={`faq-card ${isOpen ? 'active' : ''}`}>
      <button 
        className="faq-header" 
        onClick={onClick}
        aria-expanded={isOpen}
      >
        <span className="question-text">{question}</span>
        <span className="toggle-icon">
          {isOpen ? <FaMinus size={14} /> : <FaPlus size={14} />}
        </span>
      </button>
      
      <div 
        className="faq-body" 
        style={{ 
          maxHeight: isOpen ? '500px' : '0px',
          opacity: isOpen ? 1 : 0
        }}
      >
        <div className="answer-content">
          {/* Using dangerouslySetInnerHTML to allow bolding/links in answers */}
          <div dangerouslySetInnerHTML={{ __html: answer }} />
        </div>
      </div>
    </div>
  );
};

export default FAQItem;