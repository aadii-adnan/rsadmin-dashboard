import React, {useState} from 'react'
import contactImg from "../assets/contact-us.webp"

const ContactUs = () => {

    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        phone: '',
        email: '',
        message: '',
      });
    
      const [responseMessage, setResponseMessage] = useState('');
      const [isSubmitting, setIsSubmitting] = useState(false);
    
      const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prevData) => ({
          ...prevData,
          [name]: value,
        }));
      };
    
      const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setResponseMessage('');
    
        try {
          const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/contact/`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData),
          });
    
          if (!response.ok) {
            throw new Error('Failed to submit the form. Please try again.');
          }
    
          const data = await response.json();
          setResponseMessage('Your message has been sent successfully!');
          setFormData({
            first_name: '',
            last_name: '',
            phone: '',
            email: '',
            message: '',
          });
        } catch (error) {
          setResponseMessage(error.message);
        } finally {
          setIsSubmitting(false);
        }
      };

  return (
    <div data-elementor-type="wp-page" data-elementor-id="637" class="elementor elementor-637" data-elementor-post-type="page">
        <div style={{backgroundImage: `url('${contactImg}')`}} class="elementor-element elementor-element-f872fc6 e-flex e-con-boxed e-con e-parent e-lazyloaded" data-id="f872fc6" data-element_type="container" data-rocket-lazy-bg-83b6f427-1807-4298-8330-b22bf3dbfb44="excluded">
            <div className="overlay"></div>
            <div class="e-con-inner">                
                <div class="elementor-element elementor-element-3ad1a84 elementor-widget__width-inherit elementor-widget elementor-widget-heading animated fadeIn" data-id="3ad1a84" data-element_type="widget" data-settings="{}" data-widget_type="heading.default">
                    <div class="elementor-widget-container">
                    <h1 style={{fontSize:"50px", color:"#fff", position: "relative", zIndex:2, margin:0}} class="elementor-heading-title elementor-size-default">Contact Us</h1>
                    </div>
                </div>
            </div>            
        </div>
        <div class="elementor-element elementor-element-42712714 e-flex e-con-boxed e-con e-parent e-lazyloaded" data-id="42712714" data-element_type="container">
            <div class="e-con-inner">
                <div style={{backgroundImage: `url('${contactImg}')`}} class="elementor-element elementor-element-5266326c e-con-full e-flex e-con e-child animated fadeIn" data-id="5266326c" data-element_type="container" data-settings="{&quot;background_background&quot;:&quot;classic&quot;}" data-rocket-lazy-bg-f159c7e0-f388-4499-a87c-c8250ddbc1da="excluded">
                    <div class="elementor-element elementor-element-f6c24b6 elementor-shape-circle e-grid-align-right e-grid-align-tablet-right elementor-hidden-desktop elementor-hidden-tablet elementor-hidden-mobile elementor-grid-0 elementor-widget elementor-widget-social-icons" data-id="f6c24b6" data-element_type="widget" data-widget_type="social-icons.default">
                    <div class="elementor-widget-container">
                        <div class="elementor-social-icons-wrapper elementor-grid">
                            <span class="elementor-grid-item">
                                <a class="elementor-icon elementor-social-icon elementor-social-icon-facebook-f elementor-repeater-item-aea8238" target="_blank">
                                <span class="elementor-screen-only">Facebook-f</span>
                                <svg class="e-font-icon-svg e-fab-facebook-f" viewBox="0 0 320 512" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M279.14 288l14.22-92.66h-88.91v-60.13c0-25.35 12.42-50.06 52.24-50.06h40.42V6.26S260.43 0 225.36 0c-73.22 0-121.08 44.38-121.08 124.72v70.62H22.89V288h81.39v224h100.17V288z"></path>
                                </svg>
                                </a>
                            </span>
                            <span class="elementor-grid-item">
                            <a class="elementor-icon elementor-social-icon elementor-social-icon-icon-instagram-1 elementor-repeater-item-49f853b" target="_blank">
                            <span class="elementor-screen-only">Icon-instagram-1</span>
                            <i class="icon icon-instagram-1"></i>					</a>
                            </span>
                            <span class="elementor-grid-item">
                                <a class="elementor-icon elementor-social-icon elementor-social-icon-x-twitter elementor-repeater-item-f592de8" target="_blank">
                                <span class="elementor-screen-only">X-twitter</span>
                                <svg class="e-font-icon-svg e-fab-x-twitter" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M389.2 48h70.6L305.6 224.2 487 464H345L233.7 318.6 106.5 464H35.8L200.7 275.5 26.8 48H172.4L272.9 180.9 389.2 48zM364.4 421.8h39.1L151.1 88h-42L364.4 421.8z"></path>
                                </svg>
                                </a>
                            </span>
                            <span class="elementor-grid-item">
                                <a class="elementor-icon elementor-social-icon elementor-social-icon-youtube elementor-repeater-item-b96695c" target="_blank">
                                <span class="elementor-screen-only">Youtube</span>
                                <svg class="e-font-icon-svg e-fab-youtube" viewBox="0 0 576 512" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M549.655 124.083c-6.281-23.65-24.787-42.276-48.284-48.597C458.781 64 288 64 288 64S117.22 64 74.629 75.486c-23.497 6.322-42.003 24.947-48.284 48.597-11.412 42.867-11.412 132.305-11.412 132.305s0 89.438 11.412 132.305c6.281 23.65 24.787 41.5 48.284 47.821C117.22 448 288 448 288 448s170.78 0 213.371-11.486c23.497-6.321 42.003-24.171 48.284-47.821 11.412-42.867 11.412-132.305 11.412-132.305s0-89.438-11.412-132.305zm-317.51 213.508V175.185l142.739 81.205-142.739 81.201z"></path>
                                </svg>
                                </a>
                            </span>
                            <span class="elementor-grid-item">
                                <a class="elementor-icon elementor-social-icon elementor-social-icon-linkedin-in elementor-repeater-item-046161f" target="_blank">
                                <span class="elementor-screen-only">Linkedin-in</span>
                                <svg class="e-font-icon-svg e-fab-linkedin-in" viewBox="0 0 448 512" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M100.28 448H7.4V148.9h92.88zM53.79 108.1C24.09 108.1 0 83.5 0 53.8a53.79 53.79 0 0 1 107.58 0c0 29.7-24.1 54.3-53.79 54.3zM447.9 448h-92.68V302.4c0-34.7-.7-79.2-48.29-79.2-48.29 0-55.69 37.7-55.69 76.7V448h-92.78V148.9h89.08v40.8h1.3c12.4-23.5 42.69-48.3 87.88-48.3 94 0 111.28 61.9 111.28 142.3V448z"></path>
                                </svg>
                                </a>
                            </span>
                        </div>
                    </div>
                    </div>
                </div>
                <div class="elementor-element elementor-element-23ebb524 e-con-full e-flex e-con e-child" data-id="23ebb524" data-element_type="container">
                    <div class="elementor-element elementor-element-ecacd92 elementor-widget__width-inherit elementor-widget elementor-widget-text-editor animated fadeIn" data-id="ecacd92" data-element_type="widget" data-settings="{}" data-widget_type="text-editor.default">
                    <div class="elementor-widget-container">
                        <p>Contact Us</p>
                    </div>
                    </div>
                    <div class="elementor-element elementor-element-413fd3b3 elementor-widget elementor-widget-heading animated fadeIn" data-id="413fd3b3" data-element_type="widget" data-settings="{&quot;_animation_delay&quot;:200}" data-widget_type="heading.default">
                    <div class="elementor-widget-container">
                        <h2 class="elementor-heading-title elementor-size-default">Get in Touch</h2>
                    </div>
                    </div>
                    <div class="elementor-element elementor-element-132c8c4 elementor-widget elementor-widget-text-editor" data-id="132c8c4" data-element_type="widget" data-widget_type="text-editor.default">
                    <div class="elementor-widget-container">
                        <p>Want to get a booking, need any assistance, or have queries about RS Express Dublin Airport Parking? Our team of experts is available around-the-clock for you! Whether you need details about meet-and-greet services, pricing or online booking procedure, we are just a call or an email away! Contact us now:</p>
                    </div>
                    </div>
                    <div class="elementor-element elementor-element-45100a3e elementor-widget-divider--view-line elementor-widget elementor-widget-divider animated fadeIn" data-id="45100a3e" data-element_type="widget" data-settings="{&quot;_animation_delay&quot;:400}" data-widget_type="divider.default">
                    <div class="elementor-widget-container">
                        <div class="elementor-divider">
                            <span class="elementor-divider-separator">
                            </span>
                        </div>
                    </div>
                    </div>
                    <div class="elementor-element elementor-element-7140d27c e-grid e-con-full e-con e-child animated fadeIn" data-id="7140d27c" data-element_type="container" data-settings="{&quot;animation_delay&quot;:400}">
                    <div class="elementor-element elementor-element-4e2c2f6d e-con-full e-flex e-con e-child" data-id="4e2c2f6d" data-element_type="container">
                        <div class="elementor-element elementor-element-2a263fec elementor-widget elementor-widget-text-editor" data-id="2a263fec" data-element_type="widget" data-widget_type="text-editor.default">
                            <div class="elementor-widget-container">
                                <p>Our Phone</p>
                            </div>
                        </div>
                        <div class="elementor-element elementor-element-4674e07e elementor-widget elementor-widget-button" data-id="4674e07e" data-element_type="widget" data-widget_type="button.default">
                            <div class="elementor-widget-container">
                                <div class="elementor-button-wrapper">
                                <a class="elementor-button elementor-button-link elementor-size-sm" href="tel:+35319640011">
                                <span class="elementor-button-content-wrapper">
                                <span class="elementor-button-text">+353 1 964 0011</span>
                                </span>
                                </a>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="elementor-element elementor-element-72c0fc49 e-con-full e-flex e-con e-child" data-id="72c0fc49" data-element_type="container">
                        <div class="elementor-element elementor-element-12b127f9 elementor-widget elementor-widget-text-editor" data-id="12b127f9" data-element_type="widget" data-widget_type="text-editor.default">
                            <div class="elementor-widget-container">
                                <p>Send Message</p>
                            </div>
                        </div>
                        <div class="elementor-element elementor-element-35126748 elementor-widget elementor-widget-button" data-id="35126748" data-element_type="widget" data-widget_type="button.default">
                            <div class="elementor-widget-container">
                                <div class="elementor-button-wrapper">
                                <a class="elementor-button elementor-button-link elementor-size-sm">
                                <span class="elementor-button-content-wrapper">
                                <span class="elementor-button-text">support@rsexpressparking.com</span>
                                </span>
                                </a>
                                </div>
                            </div>
                        </div>
                    </div>
                    </div>
                    <div class="elementor-element elementor-element-64341d6c elementor-widget-divider--view-line elementor-widget elementor-widget-divider animated fadeIn" data-id="64341d6c" data-element_type="widget" data-settings="{&quot;_animation_delay&quot;:600}" data-widget_type="divider.default">
                    <div class="elementor-widget-container">
                        <div class="elementor-divider">
                            <span class="elementor-divider-separator">
                            </span>
                        </div>
                    </div>
                    </div>
                    <div class="elementor-element elementor-element-7358461e elementor-widget elementor-widget-heading animated fadeIn" data-id="7358461e" data-element_type="widget" data-settings="{&quot;_animation_delay&quot;:600}" data-widget_type="heading.default">
                    <div class="elementor-widget-container">
                        <h2 class="elementor-heading-title elementor-size-default">Let's talk about future</h2>
                    </div>
                    </div>
                    <div class="elementor-element elementor-element-9c13f93 elementor-widget elementor-widget-metform" data-id="9c13f93" data-element_type="widget" data-widget_type="metform.default">
                    <div class="elementor-widget-container">
                        <div id="mf-response-props-id-896" data-previous-steps-style="" data-editswitchopen="" data-response_type="alert" data-erroricon="fas fa-exclamation-triangle" data-successicon="fas fa-check" data-messageposition="top" class="   mf-scroll-top-no">
                            <div class="formpicker_warper formpicker_warper_editable" data-metform-formpicker-key="896">
                                <div class="mf-widget-container">
                                <div id="metform-wrap-9c13f93-896" class="mf-form-wrapper" data-form-id="896" data-wp-nonce="adf9a777bc" data-form-nonce="cf09791848" data-quiz-summery="false" data-save-progress="false" data-form-type="general-form" data-stop-vertical-effect="">
                                    <form onSubmit={handleSubmit} class="metform-form-content">
                                        <div class="mf-main-response-wrap   mf-response-msg-wrap" data-show="0">
                                            <div class="mf-response-msg">
                                            <i class="mf-success-icon fas fa-check"></i>
                                            <p></p>
                                            </div>
                                        </div>
                                        <div class="metform-form-main-wrapper">
                                            <div data-elementor-type="wp-post" data-elementor-id="896" class="elementor elementor-896" data-elementor-post-type="metform-form">
                                            <div class="elementor-element elementor-element-2221bce e-flex e-con-boxed e-con e-parent" data-id="2221bce" data-element_type="container">
                                                <div class="e-con-inner">
                                                    <div class="elementor-element elementor-element-b427d1 e-con-full e-flex e-con e-child" data-id="b427d1" data-element_type="container">
                                                        <div class="elementor-element elementor-element-7ae93cb9 e-con-full e-flex e-con e-child" data-id="7ae93cb9" data-element_type="container">
                                                        <div class="elementor-element elementor-element-41dddb3b elementor-widget__width-inherit elementor-widget elementor-widget-mf-listing-fname" data-id="41dddb3b" data-element_type="widget" data-settings="{&quot;mf_input_name&quot;:&quot;mf-listing-fname&quot;}" data-widget_type="mf-listing-fname.default">
                                                            <div class="elementor-widget-container">
                                                                <div class="mf-input-wrapper"><label class="mf-input-label" for="mf-input-text-41dddb3b">First Name 					<span class="mf-input-required-indicator">*</span></label><input value={formData.first_name} onChange={handleChange} type="text" class="mf-input " id="mf-input-text-41dddb3b" name="first_name" placeholder="Jhon " aria-invalid="false"/></div>
                                                            </div>
                                                        </div>
                                                        </div>
                                                        <div class="elementor-element elementor-element-3729b07d e-con-full e-flex e-con e-child" data-id="3729b07d" data-element_type="container">
                                                        <div class="elementor-element elementor-element-67b22a87 elementor-widget__width-inherit elementor-widget elementor-widget-mf-listing-lname" data-id="67b22a87" data-element_type="widget" data-settings="{&quot;mf_input_name&quot;:&quot;mf-listing-lname&quot;}" data-widget_type="mf-listing-lname.default">
                                                            <div class="elementor-widget-container">
                                                                <div class="mf-input-wrapper"><label class="mf-input-label" for="mf-input-text-67b22a87">Last Name 					<span class="mf-input-required-indicator">*</span></label><input value={formData.last_name} onChange={handleChange} type="text" class="mf-input " id="mf-input-text-67b22a87" name="last_name" placeholder="Doe " aria-invalid="false"/></div>
                                                            </div>
                                                        </div>
                                                        </div>
                                                    </div>
                                                    <div class="elementor-element elementor-element-724e334a e-con-full e-flex e-con e-child" data-id="724e334a" data-element_type="container">
                                                        <div class="elementor-element elementor-element-123aaada e-con-full e-flex e-con e-child" data-id="123aaada" data-element_type="container">
                                                        <div class="elementor-element elementor-element-7603acf5 elementor-widget__width-inherit elementor-widget elementor-widget-mf-telephone" data-id="7603acf5" data-element_type="widget" data-settings="{&quot;mf_input_name&quot;:&quot;mf-telephone&quot;}" data-widget_type="mf-telephone.default">
                                                            <div class="elementor-widget-container">
                                                                <div class="mf-input-wrapper"><label class="mf-input-label" for="mf-input-telephone-7603acf5">Phone 					<span class="mf-input-required-indicator">*</span></label><input value={formData.phone} onChange={handleChange} type="tel" class="mf-input " id="mf-input-telephone-7603acf5" name="phone" placeholder="+353 1 964 0011 " aria-invalid="false"/></div>
                                                            </div>
                                                        </div>
                                                        </div>
                                                        <div class="elementor-element elementor-element-31d15c94 e-con-full e-flex e-con e-child" data-id="31d15c94" data-element_type="container">
                                                        <div class="elementor-element elementor-element-10456889 elementor-widget__width-inherit elementor-widget elementor-widget-mf-email" data-id="10456889" data-element_type="widget" data-settings="{&quot;mf_input_name&quot;:&quot;mf-email&quot;}" data-widget_type="mf-email.default">
                                                            <div class="elementor-widget-container">
                                                                <div class="mf-input-wrapper"><label class="mf-input-label" for="mf-input-email-10456889">Email 					<span class="mf-input-required-indicator">*</span></label><input value={formData.email} onChange={handleChange} type="email" class="mf-input " id="mf-input-email-10456889" name="email" placeholder="example@mail.com " aria-invalid="false" /></div>
                                                            </div>
                                                        </div>
                                                        </div>
                                                    </div>
                                                    <div class="elementor-element elementor-element-7bca3ef8 e-con-full e-flex e-con e-child" data-id="7bca3ef8" data-element_type="container">
                                                        <div class="elementor-element elementor-element-19c518a7 elementor-widget__width-inherit elementor-widget elementor-widget-mf-textarea" data-id="19c518a7" data-element_type="widget" data-settings="{&quot;mf_input_name&quot;:&quot;mf-textarea&quot;}" data-widget_type="mf-textarea.default">
                                                        <div class="elementor-widget-container">
                                                            <div class="mf-input-wrapper"><label class="mf-input-label" for="mf-input-text-area-19c518a7">Message 					<span class="mf-input-required-indicator"></span></label><textarea value={formData.message} onChange={handleChange} class="mf-input mf-textarea " id="mf-input-text-area-19c518a7" name="message" placeholder="Hello there! " cols="30" rows="10" aria-invalid="false"></textarea></div>
                                                        </div>
                                                        </div>
                                                    </div>
                                                    <div class="elementor-element elementor-element-6e36f998 mf-btn--justify mf-btn--tablet-justify mf-btn--mobile-justify elementor-widget elementor-widget-mf-button" data-id="6e36f998" data-element_type="widget" data-widget_type="mf-button.default">
                                                        <div class="elementor-widget-container">
                                                        <div class="mf-btn-wraper " data-mf-form-conditional-logic-requirement=""><button type="submit" class="metform-btn metform-submit-btn " id=""><span>Submit Form </span></button></div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            </div>
                                        </div>
                                    </form>
                                    {responseMessage && (
                                        <div className={`alert ${isSubmitting ? 'alert-info' : 'alert-success'} mt-3`} role="alert">
                                        {responseMessage}
                                        </div>
                                    )}
                                </div>
                                
                                </div>
                            </div>
                        </div>
                    </div>
                    </div>
                </div>
            </div>
        </div>
  
    </div>
  )
}

export default ContactUs