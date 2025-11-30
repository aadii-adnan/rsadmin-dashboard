import React, {useEffect, useState} from 'react'
import BookingDatesForm from '../components/HomePage/BookingDatesForm'
import { useBooking } from "../context/BookingContext";
import bannerImg1 from "../assets/banner-img1.webp"
import bannerImg2 from "../assets/banner-img2.webp"
import bannerImg3 from "../assets/banner-img3.webp"
import bannerImg4 from "../assets/banner-img4.webp"
import customerSupport from "../assets/customer-support.webp"
import terminal from "../assets/terminal.webp"
import secureParking from "../assets/secure-parking.webp"
import addOns from "../assets/add-ons.webp"
import { Helmet } from 'react-helmet-async';
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/effect-fade";
import "swiper/css/autoplay";
import { Autoplay, EffectFade } from "swiper/modules";
import { ClipLoader } from "react-spinners";
import FAQSection from "../components/HomePage/FAQSection";
import { 
    FaCarSide, FaCheckCircle, FaShieldAlt, FaPlaneDeparture, 
    FaUserTie, FaSuitcase, FaChild, FaVideo, FaKey, 
    FaClock, FaPhoneAlt, FaEnvelope, FaStar 
} from "react-icons/fa";
import { SiTrustpilot } from "react-icons/si"; 
import { FaStarHalfAlt, FaQuoteRight } from "react-icons/fa";
import { FcGoogle } from "react-icons/fc";
import { BiSupport } from "react-icons/bi";
import logo from "../assets/logo.png";
import parkingVideo from "../assets/vid.mp4"; 
import videoPoster from "../assets/hero-cover.png"; 

const Home = () => {

    const { setBookingData } = useBooking();
    const [faqs, setFaqs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [openFaqIndex, setOpenFaqIndex] = useState(null);
    useEffect(() => {
        if(localStorage.getItem("access_token")){
        setBookingData((prev) => ({
            ...prev,
            bookingDates: null,
            bookingDetails: null,
            paymentDetails: null,
            carFlightDetails: null,
          }));}
        else{
            setBookingData(() => ({
            bookingDates: null,
            bookingDetails: null,
            paymentDetails: null,
            carFlightDetails: null,
            userDetails: null,
            selectedOption: null,
          }));
        }
        localStorage.removeItem("payment_status");
    }, []);

    useEffect(() => {
    const fetchFAQs = async () => {
        try {
            const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/faqs/`);
            if (!response.ok) throw new Error('Network response was not ok');
            const data = await response.json();
            setFaqs(data);

            if (!document.getElementById("shapo-embed-js")) {
                const script = document.createElement("script");
                script.id = "shapo-embed-js";
                script.type = "text/javascript";
                script.src = "https://cdn.shapo.io/js/embed.js";
                script.defer = true;
                document.body.appendChild(script);
            }
        
        } catch (error) {
            console.error('Error fetching FAQs:', error);
        } finally {
            setLoading(false);
        }
    };
    fetchFAQs();
    }, []);

    // --- Content Data ---
    const processSteps = [
        { icon: <FaClock />, title: "Book Online", desc: "Choose your dates using the form above and secure your Dublin Airport parking in seconds." },
        { icon: <FaUserTie />, title: "Meet the Driver", desc: "Arrive at the terminal, where our insured driver meets you for a smooth meet and greet handover." },
        { icon: <FaShieldAlt />, title: "Secure Parking", desc: "Your car is taken to our monitored facility offering affordable Dublin Airport parking with full CCTV." },
        { icon: <FaCarSide />, title: "Pick Up", desc: "When you return, your car is brought back to the terminal so you can head home without delays." },
    ];

    const reasons = [
        { title: "No walking needed", desc: "Go straight to the terminal for a simple start to your trip.", icon: <FaPlaneDeparture/> },
        { title: "Fast terminal handover", desc: "Meet the driver at Departures for quick valet parking.", icon: <FaKey/> },
        { title: "Perfect for families", desc: "No stress with kids, strollers or luggage.", icon: <FaChild/> },
        { title: "Ideal for business trips", desc: "Save time with direct meet and greet drop-off.", icon: <FaUserTie/> },
        { title: "Secure monitored facility", desc: "Your car stays protected with CCTV and controlled access.", icon: <FaVideo/> },
        { title: "Optional car wash service", desc: "Get your car cleaned while you travel.", icon: <FaCarSide/> },
    ];

    const audience = [
        { title: "Families", desc: "A smooth option for parents who want quick terminal access without long walks or shuttle delays.", icon: <FaChild/> },
        { title: "Business Travellers", desc: "Reliable valet parking at Dublin Airport that helps you save time and stay on schedule.", icon: <FaUserTie/> },
        { title: "Travellers with Heavy Luggage", desc: "Ideal for anyone who wants direct terminal handover without carrying bags across large parking areas.", icon: <FaSuitcase/> }
    ];

    if (loading) {
        return (
            <div className="loading-screen">
                <img src={logo} alt="RS Express Parking" className="loading-logo" />
                <ClipLoader color="#447e9b" size={60} />
                <div className="loading-text">Loading your experience...</div>
            </div>
        );
    }
    
  return (
    <>
    <Helmet>
        <title>Meet & Greet Dublin Airport Parking - RS Express Parking</title>
        <meta name="description" content="Secure Meet & Greet Dublin Airport Parking with 24/7 surveillance. Easy booking, hassle-free drop-off & pick-up. Reserve your parking spot today!"/>
        <meta name="robots" content="index, follow, max-snippet:-1, max-video-preview:-1, max-image-preview:large"/>
        <link rel="canonical" href="https://rsexpressparking.com/"/>
        <meta property="og:title" content="Meet & Greet Dublin Airport Parking - RS Express Parking"/>
        <meta property="og:description" content="Secure, reliable Dublin Airport parking with hassle-free booking."/>
        <meta property="og:type" content="website"/>
        <meta property="og:url" content="https://rsexpressparking.com/"/>
        <meta property="og:image" content="https://rsexpressparking.com/images/og-parking.jpg"/>
        <meta property="og:site_name" content="RS Express Parking"/>
        <meta property="og:locale" content="en_US"/>
        <meta name="twitter:card" content="summary_large_image"/>
        <meta name="twitter:title" content="Meet & Greet Dublin Airport Parking - RS Express Parking"/>
        <meta name="twitter:description" content="Easy, secure Dublin Airport parking with Meet & Greet service."/>
        <meta name="twitter:image" content="https://rsexpressparking.com/images/og-parking.jpg"/>

        <script type="application/ld+json">
{`
{
"@context": "https://schema.org",
"@graph": [
    {
    "@type": "Organization",
    "@id": "https://rsexpressparking.com/#organization",
    "name": "RS Express Parking",
    "url": "https://rsexpressparking.com/",
    "description": "RS Express Parking offers secure and affordable Meet & Greet parking at Dublin Airport with 24/7 surveillance and hassle-free service.",
    "logo": {
        "@type": "ImageObject",
        "url": "https://rsexpressparking.com/images/icon-large.jpg"
    },
    "sameAs": [
        "https://www.facebook.com/rsexpressparking",
        "https://www.instagram.com/rsexpressparking",
        "https://www.linkedin.com/company/rs-express-parking"
    ],
    "contactPoint": {
        "@type": "ContactPoint",
        "telephone": "+353 1 964 0011",
        "contactType": "Customer Service",
        "areaServed": "IE",
        "availableLanguage": "English"
    },
    "founder": {
        "@type": "Person",
        "name": "RS Admin"
    },
    "address": {
        "@type": "PostalAddress",
        "addressLocality": "Dublin",
        "addressCountry": "IE"
    }
    },
    {
    "@type": "LocalBusiness",
    "@id": "https://rsexpressparking.com/#localbusiness",
    "name": "RS Express Parking",
    "image": "https://rsexpressparking.com/images/icon-large.jpg",
    "priceRange": "$",
    "description": "Affordable Meet & Greet Dublin Airport Parking with 24/7 security, fast drop-off & collection. Trusted by thousands of Irish travelers.",
    "telephone": "+353 1 964 0011",
    "email": "support@rsexpressparking.com",
    "url": "https://rsexpressparking.com/",
    "address": {
        "@type": "PostalAddress",
        "addressLocality": "Dublin",
        "addressCountry": "IE"
    },
    "openingHours": "Mo-Su 00:00-23:59",
    "areaServed": "IE"
    },
    {
        "@type": "WebSite",
        "@id": "https://rsexpressparking.com/#website",
        "url": "https://rsexpressparking.com/",
        "name": "RS Express Parking",
        "publisher": {
            "@id": "https://rsexpressparking.com/#organization"
        },
        "potentialAction": {
            "@type": "SearchAction",
            "target": "https://rsexpressparking.com/?s={search_term_string}",
            "query-input": "required name=search_term_string"
        }
    },
    {
        "@type": "FAQPage",
        "@id": "https://rsexpressparking.com/#faq",
        "mainEntity": ${JSON.stringify(
            faqs.map(faq => ({
                "@type": "Question",
                "name": faq.question,
                "acceptedAnswer": {
                    "@type": "Answer",
                    "text": faq.answer.replace(/<[^>]*>/g, '')
                }
            }))
        )}
    }
]
}
`}
        </script>


    </Helmet>

    <div style={{backgroundColor: "#fff"}} data-elementor-type="wp-page" data-elementor-id="88" className="elementor elementor-88" data-elementor-post-type="page">
        <div className="home-wrapper">
        <div className="home-banner video-banner">
            
            {/* PERFORMANCE OPTIMIZED VIDEO TAG */}
            <video 
                autoPlay 
                loop 
                muted 
                playsInline 
                preload="none" /* Wait until page loads to fetch video */
                poster={videoPoster} /* Shows this image instantly while video loads */
                className="banner-video"
            >
                <source src={parkingVideo} type="video/mp4" />
                {/* Optional: Add a .webm source here for even better speed on Chrome */}
            </video>

            <div className="video-overlay"></div>

            <div className="banner-content">
                 {/* Your text content here */}
                 <h6 style={{letterSpacing:"5px", textTransform:"uppercase", fontWeight:400, fontSize:"14px"}}>Secure, Affordable &amp; Stress-Free</h6>
                <h1 className="banner-heading">Meet & Greet Dublin Airport Parking</h1>
                <h3 className="banner-subheading">
                Book secure Meet & Greet parking at Dublin Airport. 
                <br />
                24/7 CCTV-monitored, fully patrolled, with quick terminal handovers.
                </h3>
            </div>
        </div>
        </div>
    <BookingDatesForm />

        
        
        {/* 2. PROCESS SECTION (Modern Timeline) */}
            <section className="section-padding bg-white info-sect">
                <div className="container">
                    <div className="section-header text-center mb-5">
                        <span className="badge-pill">Simple Process</span>
                        <h2 className="section-title">How Our Meet & Greet Works</h2>
                    </div>
                    
                    <div className="process-timeline">
                        {processSteps.map((step, index) => (
                            <div key={index} className="process-step">
                                <div className="step-icon-wrapper">
                                    <div className="step-icon">
                                        {step.icon}
                                    </div>
                                    <div className="step-number">{index + 1}</div>
                                </div>
                                <h3 className="step-title">{step.title}</h3>
                                <p className="step-desc">{step.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* 3. WHY CHOOSE US (Grid Layout - Dark Blue/Gold Theme) */}
            <section className="section-padding bg-primary-dark">
                <div className="container">
                    <div className="row justify-content-center text-center mb-5">
                        <div className="col-lg-8">
                            <h2 className="section-title text-white">Why Choose RS Express?</h2>
                            <p className="section-subtitle text-light-grey">
                                We provide a quicker, easier way to manage Dublin Airport parking without long walks or shuttle delays.
                            </p>
                        </div>
                    </div>
                    
                    <div className="reasons-grid">
                        {reasons.map((reason, idx) => (
                            <div key={idx} className="feature-card">
                                <div className="feature-icon">{reason.icon}</div>
                                <div className="feature-content">
                                    <h4>{reason.title}</h4>
                                    <p>{reason.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* 4. WHO IS THIS FOR (Modern Cards) */}
            <section className="section-padding bg-light-blue">
                <div className="container">
                    <div className="section-header text-center mb-5">
                        <h2 className="section-title">Perfect for All Travellers</h2>
                    </div>
                    <div className="audience-grid">
                        {audience.map((item, index) => (
                            <div key={index} className="audience-card hover-lift">
                                <div className="audience-icon-circle">{item.icon}</div>
                                <h3>{item.title}</h3>
                                <p>{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* 5. SECURE FACILITY (Split Layout) */}
            <section className="section-padding bg-white">
                <div className="container">
                    <div className="row align-items-center">
                        <div className="col-lg-6 mb-4 mb-lg-0">
                            <div className="image-collage">
                                <img src={secureParking} alt="Secure Parking" className="collage-main" />
                                <img src={bannerImg2} alt="CCTV" className="collage-small" />
                                <div className="collage-badge">
                                    <FaShieldAlt /> 24/7 Secure
                                </div>
                            </div>
                        </div>
                        <div className="col-lg-6 ps-lg-5">
                            <span className="badge-pill mb-3">Safety First</span>
                            <h2 className="section-title mb-4">Your Car Stays in Safe Hands</h2>
                            <p className="text-muted mb-4">
                                Your vehicle is parked in a gated, well-lit facility monitored around the clock. 
                                RS Express Parking uses insured and trained drivers who handle every car carefully.
                            </p>
                            
                            <div className="facility-features">
                                <div className="f-item">
                                    <FaCheckCircle className="text-green" /> <span>Gated & Well-lit facility</span>
                                </div>
                                <div className="f-item">
                                    <FaCheckCircle className="text-green" /> <span>24/7 CCTV Monitoring</span>
                                </div>
                                <div className="f-item">
                                    <FaCheckCircle className="text-green" /> <span>Fully Insured Drivers</span>
                                </div>
                                <div className="f-item">
                                    <FaCheckCircle className="text-green" /> <span>Optional Car Wash</span>
                                </div>
                            </div>

                            <a href="#book" className="btn-modern mt-4">Book Now</a>
                        </div>
                    </div>
                </div>
            </section>

            {/* 6. TESTIMONIALS (Modern Redesign) */}
            <section className="section-padding bg-light-grey">
                <div className="container">
                    
                    {/* Header & Badges */}
                    <div className="section-header text-center mb-5">
                        <h2 className="section-title">What Our Customers Say</h2>
                        <p className="section-subtitle">Trusted by thousands of travellers</p>
                        
                        {/* Trust Badges Row */}
                        <div className="review-badges-row mt-4">
                            <div className="review-badge google-badge">
                                <FcGoogle size={28} />
                                <div className="badge-text">
                                    <span className="source-name">Google</span>
                                    <span className="source-rating">Reviews <FaStar className="star-mini"/></span>
                                </div>
                            </div>
                            <div className="review-badge trustpilot-badge">
                                <SiTrustpilot size={28} color="#00b67a" />
                                <div className="badge-text">
                                    <span className="source-name">Trustpilot</span>
                                    <span className="source-rating">Excellent <FaStar className="star-mini"/></span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Review Cards Grid */}
                    <div className="reviews-grid">
                        {/* Review 1 */}
                        <div className="review-card">
                            <div className="card-top">
                                
                                <div className="reviewer-info">
                                    <h4>Sharon Maginnis</h4>
                                    <span className="reviewer-type">Family Traveller</span>
                                </div>
                                <div className="source-icon"><FcGoogle /></div>
                            </div>
                            <p className="review-text">
                                "Brilliant service....so handy with no waiting on buses and ending up going round all the zones. Drop off and pick up at the terminal door!."
                            </p>
                            <div className="review-stars">
                                <FaStar /><FaStar /><FaStar /><FaStar /><FaStar />
                            </div>
                        </div>

                        {/* Review 2 */}
                        <div className="review-card">
                            <div className="card-top">
                                
                                <div className="reviewer-info">
                                    <h4>Karen McArdle</h4>
                                    <span className="reviewer-type">Family Traveller</span>
                                </div>
                                <div className="source-icon"><SiTrustpilot color="#00b67a"/></div>
                            </div>
                            <p className="review-text">
                                "Terrific experience with these guys.. very efficient and easy to deal with, will 100% be using them again next year for our family holiday.. 100% recommend"
                            </p>
                            <div className="review-stars">
                                <FaStar /><FaStar /><FaStar /><FaStar /><FaStar />
                            </div>
                        </div>

                        {/* Review 3 */}
                        <div className="review-card">
                            <div className="card-top">                                
                                <div className="reviewer-info">
                                    <h4>Sinead FitzGeraldy</h4>
                                    <span className="reviewer-type">Frequent Flyer</span>
                                </div>
                                <div className="source-icon"><FcGoogle /></div>
                            </div>
                            <p className="review-text">
                                "Handy valet parking service. 2nd time using these guys and it makes for airport parking very easy.thx"
                            </p>
                            <div className="review-stars">
                                <FaStar /><FaStar /><FaStar /><FaStar /><FaStar />
                            </div>
                        </div>
                    </div>

                    {/* Footer CTA */}
                    <div className="text-center mt-5">
                         <a href="https://www.google.com/maps/place/RS+Express+Parking/@53.3883167,-6.2480426,17z/data=!4m8!3m7!1s0x48677374e94d3ad3:0xce7454b87b0fb695!8m2!3d53.3883135!4d-6.2454677!9m1!1b1!16s%2Fg%2F11x2wfyvqj?entry=ttu&g_ep=EgoyMDI1MTEyMy4xIKXMDSoASAFQAw%3D%3D" target="_blank" rel="noopener noreferrer" className="btn-modern dark-btn">
                            View All Reviews
                        </a>
                    </div>

                </div>
            </section>       

<FAQSection faqs={faqs} loading={loading}/>



    </div>

</>
  )
}

export default Home