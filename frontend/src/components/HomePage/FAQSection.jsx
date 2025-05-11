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
    <div
      data-wpr-lazyrender="1"
      className="elementor-element elementor-element-4e94b02b e-flex e-con-boxed e-con e-parent e-lazyloaded"
      data-id="4e94b02b"
      data-element_type="container"
    >
      <div className="e-con-inner">
        <div
          className="elementor-element elementor-element-5b1dcdc5 elementor-widget__width-inherit elementor-widget elementor-widget-text-editor animated fadeIn"
          data-id="5b1dcdc5"
          data-element_type="widget"
          data-settings='{"_animation":"fadeIn"}'
          data-widget_type="text-editor.default"
        >
          <div className="elementor-widget-container">
            <p>Answers to Common Dublin Airport Parking Queries</p>
          </div>
        </div>
        <div
          className="elementor-element elementor-element-3e3a26d6 elementor-widget elementor-widget-heading animated fadeIn"
          data-id="3e3a26d6"
          data-element_type="widget"
          data-settings='{"_animation":"fadeIn","_animation_delay":200}'
          data-widget_type="heading.default"
        >
          <div className="elementor-widget-container">
            <h2 className="elementor-heading-title elementor-size-default">
              Frequently Asked Questions
            </h2>
          </div>
        </div>
        <div
          className="elementor-element elementor-element-6f4e1865 elementor-widget__width-inherit elementor-widget elementor-widget-elementskit-accordion animated fadeIn"
          data-id="6f4e1865"
          data-element_type="widget"
          data-settings='{"_animation":"fadeIn","_animation_delay":400}'
          data-widget_type="elementskit-accordion.default"
        >
          <div className="elementor-widget-container">
            <div className="ekit-wid-con">
              <div className="elementskit-accordion accoedion-primary" id="accordion-680f68f99a080">
                {loading ? (
                  <p>Loading FAQs...</p>
                ) : (
                  faqs.map((faq, index) => (
                    <FAQItem key={index} question={faq.question} answer={faq.answer} />
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FAQSection;
