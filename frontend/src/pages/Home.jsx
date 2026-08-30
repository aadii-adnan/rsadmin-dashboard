import React, {useEffect, useRef, useState} from 'react'
import { useBooking } from "../context/BookingContext";
import "../Home.css";
import secureParking from "../assets/secure-parking.webp"
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
const BookingDatesForm = React.lazy(() => import('../components/HomePage/BookingDatesForm'));
const FAQSection = React.lazy(() => import('../components/HomePage/FAQSection'));
const VideoTestimonialSection = React.lazy(() => import('../components/HomePage/VideoTestimonialSection'));
import { 
    FaCarSide, FaCheckCircle, FaShieldAlt, FaPlaneDeparture, 
    FaUserTie, FaSuitcase, FaChild, FaVideo, FaKey, 
    FaClock, FaStar 
} from "react-icons/fa";
import { SiTrustpilot } from "react-icons/si"; 
import { FcGoogle } from "react-icons/fc";
import parkingVideo from "../assets/vid2.mp4"; 
import videoPoster from "../assets/hero-cover.webp"; 
import parking from "../assets/parking2.webp";
const DiscountPopup = React.lazy(() => import('../components/Utility/DiscountPopup'));

const landingFaqs = [
    {
        question: "What is Meet and Greet parking and how does it work?",
        answer: "Book online, meet your driver at the agreed Dublin Airport terminal point, hand over your vehicle and continue to Departures. Your car is parked securely and returned when you arrive back.",
    },
    {
        question: "How much does Meet & Greet parking at Dublin Airport cost?",
        answer: "Prices depend on your parking dates, length of stay and service selected. Enter your dates above to check current availability and pricing.",
    },
    {
        question: "Where do I meet the driver at Dublin Airport?",
        answer: "Your booking confirmation will provide the agreed meeting instructions and terminal handover details.",
    },
    {
        question: "How early should I arrive before my flight?",
        answer: "Allow enough time for the vehicle handover and your airline's recommended airport check-in time. Follow the instructions included with your booking confirmation.",
    },
    {
        question: "Is my car safe while parked?",
        answer: "Your vehicle is stored in a monitored parking facility with CCTV and controlled access. Vehicles are handled by trained and insured drivers.",
    },
    {
        question: "What happens if my return flight is delayed?",
        answer: "Follow the contact instructions provided with your booking so the team can coordinate your vehicle return based on your updated arrival time.",
    },
    {
        question: "How can I pay for my booking?",
        answer: "Available payment options are shown during the booking process before your reservation is completed.",
    },
    {
        question: "Can I change or cancel my booking?",
        answer: "Changes and cancellations are subject to the terms of your booking. Check the Terms & Conditions or contact the RS Express Parking team for assistance.",
    },
];

function ViewportGate({ children, placeholderClass, onReveal, rootMargin = '700px 0px' }) {
    const [revealed, setRevealed] = useState(false);
    const gateRef = useRef(null);

    useEffect(() => {
        if (revealed) {
            onReveal?.();
            return undefined;
        }

        if (!('IntersectionObserver' in window)) {
            setRevealed(true);
            return undefined;
        }

        const observer = new IntersectionObserver((entries) => {
            if (entries.some((entry) => entry.isIntersecting)) {
                setRevealed(true);
                observer.disconnect();
            }
        }, { rootMargin });

        if (gateRef.current) {
            observer.observe(gateRef.current);
        }

        return () => observer.disconnect();
    }, [onReveal, revealed, rootMargin]);

    return (
        <div className="viewport-gate" ref={gateRef}>
            {revealed ? children : <div className={placeholderClass} aria-hidden="true" />}
        </div>
    );
}

function DeferredDiscountOffer() {
    const [shouldMount, setShouldMount] = useState(false);

    useEffect(() => {
        try {
            if (localStorage.getItem('discount_popup_done')) {
                return undefined;
            }
        } catch {
            // Storage can be unavailable in privacy modes; keep the in-session offer.
        }

        const timer = window.setTimeout(() => setShouldMount(true), 12000);
        return () => window.clearTimeout(timer);
    }, []);

    if (!shouldMount) return null;

    return (
        <React.Suspense fallback={null}>
            <DiscountPopup />
        </React.Suspense>
    );
}

const Home = () => {

    const { setBookingData } = useBooking();
    const [reviewFilter, setReviewFilter] = useState('all');
    const [showAll, setShowAll] = useState(false);
    
    // Keep the hero poster as the initial LCP candidate, then attach video source later.
    const [shouldAttachVideoSource, setShouldAttachVideoSource] = useState(false);
    const [heroVideoReady, setHeroVideoReady] = useState(false);

    useEffect(() => {
        let activated = false;
        let lcpObserver;
        let idleId;
        let fallbackTimer;

        const clearTimers = () => {
            if (idleId && 'cancelIdleCallback' in window) {
                window.cancelIdleCallback(idleId);
                idleId = null;
            }
            if (fallbackTimer) {
                window.clearTimeout(fallbackTimer);
                fallbackTimer = null;
            }
        };

        const activateVideo = () => {
            if (activated) {
                return;
            }
            activated = true;
            clearTimers();
            setShouldAttachVideoSource(true);
            if (lcpObserver) {
                lcpObserver.disconnect();
            }
            window.removeEventListener('pointerdown', activateVideo);
            window.removeEventListener('scroll', activateVideo);
            window.removeEventListener('touchstart', activateVideo);
            window.removeEventListener('keydown', activateVideo);
            window.removeEventListener('load', scheduleFallback);
        };

        const scheduleActivationAfterLCP = () => {
            if (activated) {
                return;
            }

            clearTimers();
            if ('requestIdleCallback' in window) {
                idleId = window.requestIdleCallback(activateVideo, { timeout: 2500 });
            } else {
                fallbackTimer = window.setTimeout(activateVideo, 1200);
            }
        };

        const scheduleFallback = () => {
            if (activated) {
                return;
            }
            clearTimers();
            fallbackTimer = window.setTimeout(activateVideo, 5000);
        };

        window.addEventListener('pointerdown', activateVideo, { once: true, passive: true });
        window.addEventListener('scroll', activateVideo, { once: true, passive: true });
        window.addEventListener('touchstart', activateVideo, { once: true, passive: true });
        window.addEventListener('keydown', activateVideo, { once: true });

        if ('PerformanceObserver' in window) {
            try {
                lcpObserver = new PerformanceObserver((entryList) => {
                    const heroPainted = entryList.getEntries().some((entry) => (
                        entry.element?.classList?.contains('banner-poster-img')
                    ));
                    if (heroPainted) {
                        scheduleActivationAfterLCP();
                    }
                });
                lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
            } catch {
                scheduleFallback();
            }
        } else {
            scheduleFallback();
        }

        if (document.readyState === 'complete') {
            scheduleFallback();
        } else {
            window.addEventListener('load', scheduleFallback, { once: true });
        }

        return () => {
            clearTimers();
            if (lcpObserver) {
                lcpObserver.disconnect();
            }
            window.removeEventListener('pointerdown', activateVideo);
            window.removeEventListener('scroll', activateVideo);
            window.removeEventListener('touchstart', activateVideo);
            window.removeEventListener('keydown', activateVideo);
            window.removeEventListener('load', scheduleFallback);
        };
    }, []);

    useEffect(() => {
        if(localStorage.getItem("access_token")){
        setBookingData((prev) => ({
            ...prev,
            bookingDates: null,
            bookingDetails: null,
            paymentDetails: null,
            carFlightDetails: null,
            bookingJourneyId: null,
          }));}
        else{
            setBookingData(() => ({
            bookingDates: null,
            bookingDetails: null,
            paymentDetails: null,
            carFlightDetails: null,
            userDetails: null,
            selectedOption: null,
            bookingJourneyId: null,
          }));
        }
        localStorage.removeItem("payment_status");
    }, [setBookingData]);

    // --- Content Data ---
    const processSteps = [
        { icon: <FaClock />, title: "Book Online", desc: "Select your dates and times, check availability and secure your Dublin Airport parking online." },
        { icon: <FaUserTie />, title: "Meet the Driver", desc: "Meet your insured driver at the agreed Dublin Airport Departures meeting point for a quick vehicle handover." },
        { icon: <FaShieldAlt />, title: "Secure Parking", desc: "Your car is taken to our secure, monitored parking facility with controlled access and 24/7 CCTV." },
        { icon: <FaCarSide />, title: "Pick Up", desc: "When you return, your car is brought back to the agreed terminal meeting point so you can continue your journey without unnecessary delays." },
    ];

    const reasons = [
        { title: "No Shuttle Bus", desc: "Meet your driver directly at the terminal and avoid transferring between remote car parks and the airport.", icon: <FaPlaneDeparture/> },
        { title: "Fully Insured Drivers", desc: "Your vehicle is handled by trained and insured drivers throughout the handover process.", icon: <FaKey/> },
        { title: "24/7 CCTV Monitoring", desc: "Your car is parked in a monitored facility with round-the-clock CCTV coverage.", icon: <FaVideo/> },
        { title: "Fast Terminal Handover", desc: "Drop off your car close to the terminal and continue straight to Departures.", icon: <FaUserTie/> },
        { title: "Ideal for Families", desc: "Avoid carrying children, luggage and pushchairs across large airport car parks.", icon: <FaChild/> },
        { title: "Optional Car Wash", desc: "Choose an optional car wash service and return to a clean vehicle after your trip.", icon: <FaCarSide/> },
    ];

    const audience = [
        { title: "Families", desc: "A convenient option for parents who want quick terminal access without shuttle buses or long walks with children and luggage.", icon: <FaChild/> },
        { title: "Business Travellers", desc: "Reliable Dublin Airport parking designed for travellers who want a fast handover and a smoother journey to Departures.", icon: <FaUserTie/> },
        { title: "Travellers with Heavy Luggage", desc: "Hand over your car near the terminal instead of carrying bags across large airport parking areas.", icon: <FaSuitcase/> }
    ];

    const allReviews = [
      // Google (6)
      { id: 1, source: 'google', name: 'Sharon Maginnis', type: 'Family Traveller', text: 'Brilliant service....so handy with no waiting on buses and ending up going round all the zones. Drop off and pick up at the terminal door!.', stars: 5 },
      { id: 2, source: 'google', name: 'Sinead FitzGeraldy', type: 'Frequent Flyer', text: 'Handy valet parking service. 2nd time using these guys and it makes for airport parking very easy.thx', stars: 5 },
      { id: 3, source: 'google', name: 'Chelsea Greenwood', type: 'Business Traveller', text: 'Amazing service from RS Express Parking! Collected my car late at night, and it was returned quickly and efficiently. Friendly team, great communication, and competitive prices. Highly recommend for Dublin Airport parking!', stars: 5 },
      { id: 4, source: 'google', name: 'Michael Handy', type: 'Holiday Traveller', text: 'I have used these guys a few times now and the service is great. Everytime is no issue and always there on time. It makes the start to you journey much easier. Also when returning they are always on time and have everything in order. Highly recommend.', stars: 5 },
      { id: 5, source: 'google', name: 'Francis Larkin', type: 'Family Traveller', text: 'Excellent service. Just call 30 minutes before you.arrive at the airport and the driver meets you at departures and takes your car away and the same service on your return. No time wasted trying to find parking spaces, bus shuttles etc.', stars: 5 },
      { id: 6, source: 'google', name: 'Gerry Cosgrave', type: 'Frequent Flyer', text: 'RS Express Parking is the best thing to happen at Dublin Airport in a long time.', stars: 5 },
      // Trustpilot (6)
      { id: 7, source: 'trustpilot', name: 'Karen McArdle', type: 'Family Traveller', text: 'Terrific experience with these guys.. very efficient and easy to deal with, will 100% be using them again next year for our family holiday.. 100% recommend', stars: 5 },
      { id: 8, source: 'trustpilot', name: 'Sinead White', type: 'Holiday Traveller', text: 'Great service. Good communication & car collected & dropped at terminal al for us. Also a great valet done on car. Highly recommended', stars: 5 },
      { id: 9, source: 'trustpilot', name: 'Nicole Maher', type: 'Frequent Flyer', text: 'I can\'t recommend this company enough, friendly staff and amazing service, we will definitely use for our next trip!', stars: 5 },
      { id: 10, source: 'trustpilot', name: 'Lee', type: 'Business Traveller', text: 'We have used RS Express Parking many times and always found them very reliable and trustworthy.', stars: 5 },
      { id: 11, source: 'trustpilot', name: 'John.', type: 'Holiday Traveller', text: 'Good instructions & communication. Easy to deal with. Great service!', stars: 5 },
      { id: 12, source: 'trustpilot', name: 'Ian Parsons', type: 'Frequent Flyer', text: 'Terrific experience with these guys.. very efficient and easy to deal with, will 100% be using them again next year for our family holiday.. 100% recommend.', stars: 5 },
    ];

    // Apply showAll rules:
    // - all: show 6 by default, 12 when showAll
    // - google/trustpilot: show 3 by default, 6 when showAll
    let visibleReviews = [];
    if (reviewFilter === 'all') {
      const google = allReviews.filter(r => r.source === 'google');
      const trustpilot = allReviews.filter(r => r.source === 'trustpilot');
      if (showAll) {
        visibleReviews = [...google, ...trustpilot]; // 12
      } else {
        visibleReviews = [...google.slice(0, 3), ...trustpilot.slice(0, 3)]; // 6 (3+3)
      }
    } else {
      const filtered = allReviews.filter(r => r.source === reviewFilter);
      visibleReviews = showAll ? filtered.slice(0, 6) : filtered.slice(0, 3);
    }

    // The page renders immediately; heavier media sections stay deferred.
    
  return (
    <>
    <Helmet>
        <title>Meet and Greet Dublin Airport Parking - RS Express Parking</title>
        <meta name="description" content="Secure Meet and Greet parking at Dublin Airport with quick terminal drop-off, insured drivers and 24/7 monitored parking."/>
        <meta name="robots" content="index, follow, max-snippet:-1, max-video-preview:-1, max-image-preview:large"/>
        <link rel="canonical" href="https://rsexpressparking.com/"/>
        <meta property="og:title" content="Meet and Greet Dublin Airport Parking - RS Express Parking"/>
        <meta property="og:description" content="Secure Meet and Greet parking at Dublin Airport with quick terminal drop-off, insured drivers and 24/7 monitored parking."/>
        <meta property="og:type" content="website"/>
        <meta property="og:url" content="https://rsexpressparking.com/"/>
        <meta property="og:image" content="https://rsexpressparking.com/images/og-parking.jpg"/>
        <meta property="og:site_name" content="RS Express Parking"/>
        <meta property="og:locale" content="en_US"/>
        <meta name="twitter:card" content="summary_large_image"/>
        <meta name="twitter:title" content="Meet and Greet Dublin Airport Parking - RS Express Parking"/>
        <meta name="twitter:description" content="Secure Meet and Greet parking at Dublin Airport with quick terminal drop-off, insured drivers and 24/7 monitored parking."/>
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
            landingFaqs.map(faq => ({
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

    <DeferredDiscountOffer />

    <main className="home-page" style={{backgroundColor: "#fff"}}>
        <div className="home-wrapper">
        <div className="home-banner video-banner">
            
            {/* Keep poster on screen until video is attached and can play. */}
            {(!shouldAttachVideoSource || !heroVideoReady) && (
                <img 
                    src={videoPoster}
                    alt="Dublin Airport Meet and Greet Parking"
                    className="banner-video banner-poster-img"
                    width="1920"
                    height="1080"
                    fetchPriority="high"
                    decoding="async"
                />
            )}

            {shouldAttachVideoSource && (
                <video 
                    autoPlay 
                    loop 
                    muted 
                    playsInline 
                    preload="metadata"
                    className="banner-video"
                    width="1920"
                    height="1080"
                    poster={videoPoster}
                    onCanPlay={() => setHeroVideoReady(true)}
                    style={!heroVideoReady ? { opacity: 0 } : undefined}
                    aria-hidden={!heroVideoReady}
                >
                    <source src={parkingVideo} type="video/mp4" />
                </video>
            )}
            

            <div className="video-overlay"></div>

            <div className="banner-content">
                 {/* Your text content here */}                 
                <h1 className="banner-heading">Meet and Greet Dublin Airport Parking</h1>
                <h2 className="banner-subheading">
                Secure Meet and Greet parking at Dublin Airport with quick terminal drop-off, insured drivers and 24/7 monitored parking.
                </h2>
                <div className="trust-badges">
                    <div className="badge-item"><FaShieldAlt /> Secure Parking</div>
                    <div className="badge-item"><FaCheckCircle /> Insured Drivers</div>
                    <div className="badge-item"><FaVideo /> 24/7 CCTV</div>
                    <div className="badge-item"><FaStar /> No Hidden Fees</div>
              </div>
            </div>
        </div>
        </div>
    <React.Suspense fallback={<div className="form-column booking-form-placeholder" aria-hidden="true" />}>
        <BookingDatesForm />
    </React.Suspense>

        
        
        {/* 2. PROCESS SECTION (Modern Timeline) */}
            <section className="section-padding bg-white info-sect deferred-render-section">
                <div className="container">
                    <div className="section-header text-center mb-5">
                        <h2 className="section-title">How Meet and Greet Dublin Airport Parking Works</h2>
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
            <section className="section-padding bg-primary-dark deferred-render-section">
                <div className="container">
                    <div className="row justify-content-center text-center mb-5">
                        <div className="col-lg-8">
                            <h2 className="section-title text-white">Why Choose RS Express?</h2>
                            <p className="section-subtitle text-light-grey">
                                A quicker and easier way to park at Dublin Airport without shuttle buses, long walks or unnecessary waiting.
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
            <section className="section-padding bg-light-blue deferred-render-section">
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
            <section className="section-padding bg-white deferred-render-section">
                <div className="container">
                    <div className="row align-items-center">
                        <div className="col-lg-6 mb-4 mb-lg-0">
                            <div className="image-collage">
                                <img 
                                        src={secureParking} 
                                        loading="lazy"
                                        decoding="async"
                                        width="464" 
                                        height="348" 
                                        alt="Secure Parking"
                                        srcSet={`${secureParking} 464w, ${secureParking} 800w`}
                                        sizes="(max-width: 768px) 100vw, 464px"
                                    />
                                    <img 
                                        src={parking} 
                                        alt="CCTV" 
                                        className="collage-small"
                                        loading="lazy"
                                        decoding="async"
                                        width="273"
                                        height="164"
                                        srcSet={`${parking} 273w, ${parking} 600w`}
                                        sizes="(max-width: 768px) 100vw, 273px"
                                    />
                                <div className="collage-badge">
                                    <FaShieldAlt /> 24/7 Secure
                                </div>
                            </div>
                        </div>
                        <div className="col-lg-6 ps-lg-5">
                            <h2 className="section-title mb-4">Your Car Stays in Safe Hands</h2>
                            <p className="text-muted mb-4">
                                Your vehicle is parked in a secure, well-lit facility monitored around the clock.
                                RS Express Parking uses trained and insured drivers who handle every vehicle with care.
                            </p>
                            
                            <div className="facility-features">
                                <div className="f-item">
                                    <FaCheckCircle className="text-green" /> <span>Gated and well-lit parking facility</span>
                                </div>
                                <div className="f-item">
                                    <FaCheckCircle className="text-green" /> <span>24/7 CCTV monitoring</span>
                                </div>
                                <div className="f-item">
                                    <FaCheckCircle className="text-green" /> <span>Fully insured drivers</span>
                                </div>
                                <div className="f-item">
                                    <FaCheckCircle className="text-green" /> <span>Controlled access parking</span>
                                </div>
                                <div className="f-item">
                                    <FaCheckCircle className="text-green" /> <span>Optional car wash service</span>
                                </div>
                            </div>

                            <a href="#book" className="btn-modern mt-4">Check Availability</a>
                        </div>
                    </div>
                </div>
            </section>

            {/* 6. TESTIMONIALS (Modern Redesign) */}
            <section className="section-padding bg-light-grey deferred-render-section">
                <div className="container">
                <div className="section-header text-center mb-4">
                    <h2 className="section-title">What Our Customers Say</h2>
                    <p className="section-subtitle">Trusted by Dublin Airport Travellers</p>

                    {/* Filter buttons */}
                    <div className="review-filter-row mt-3" style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                        <button
                            className={`btn-modern ${reviewFilter === 'all' ? '' : 'dark-btn'}`}
                            onClick={() => { setReviewFilter('all'); setShowAll(false); }}
                        >
                            All
                        </button>
                        <button
                            className={`review-badge google-badge ${reviewFilter === 'google' ? 'active' : ''}`}
                            onClick={() => { setReviewFilter('google'); setShowAll(false); }}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 999, border: '1px solid #ddd', background: '#fff', cursor: 'pointer' }}
                        >
                            <FcGoogle size={20} />
                            <span>Google</span>
                        </button>
                        <button
                            className={`review-badge trustpilot-badge ${reviewFilter === 'trustpilot' ? 'active' : ''}`}
                            onClick={() => { setReviewFilter('trustpilot'); setShowAll(false); }}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 999, border: '1px solid #ddd', background: '#fff', cursor: 'pointer' }}
                        >
                            <SiTrustpilot size={20} color="#00b67a" />
                            <span>Trustpilot</span>
                        </button>
                    </div>
                </div>

                {/* Reviews Grid (6 total, filtered to 3 by source) */}
                <div className="reviews-grid">
                {visibleReviews.map(r => (
                    <div key={r.id} className="review-card">
                    <div className="card-top" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <div className="reviewer-info">
                        <h4 style={{ margin: 0 }}>{r.name}</h4>
                        <span className="reviewer-type" style={{ fontSize: 13, color: '#666' }}>{r.type}</span>
                        </div>
                        <div className="source-icon">
                        {r.source === 'google' ? <FcGoogle /> : <SiTrustpilot color="#00b67a" />}
                        </div>
                    </div>
                    <p className="review-text" style={{ fontSize: 14, color: '#333' }}>{r.text}</p>
                    <div className="review-stars" style={{ color: '#f5a623' }}>
                        {Array.from({ length: r.stars }).map((_, i) => <FaStar key={i} />)}
                    </div>
                    </div>
                ))}
                </div>

                {/* Footer CTA */}
                <div className="text-center mt-5">
                    <button
                        type="button"
                        className="btn-modern dark-btn"
                        onClick={() => setShowAll(s => !s)}
                    >
                        {showAll ? 'Show Fewer Reviews' : 'View All Reviews'}
                    </button>
                </div>
                </div>
            </section>     

            {/* VIDEO TESTIMONIALS SECTION */}
            <ViewportGate placeholderClass="video-section-placeholder">
                <React.Suspense fallback={<div className="video-section-placeholder" aria-hidden="true" />}>
                    <VideoTestimonialSection 
                        testimonials={[
                            {
                                id: 1,
                                videoUrl: '/videos/review_1.webm',
                                thumbnailUrl: '/videos/thumb1.webp',
                                title: 'Customer Video Review 1',
                            },
                            {
                                id: 2,
                                videoUrl: '/videos/review_2.webm',
                                thumbnailUrl: '/videos/thumb2.webp',
                                title: 'Customer Video Review 2',
                            },
                        ]}
                        sectionTitle="Video Testimonials"
                        sectionSubtitle="Hear directly from our happy customers"
                    />
                </React.Suspense>
            </ViewportGate>

            <ViewportGate placeholderClass="faq-section-placeholder">
                <React.Suspense fallback={<div className="faq-section-placeholder" aria-hidden="true" />}>
                    <FAQSection faqs={landingFaqs} loading={false}/>
                </React.Suspense>
            </ViewportGate>

            <section className="section-padding bg-primary-dark final-cta-section deferred-render-section">
                <div className="container text-center">
                    <h2 className="section-title text-white">Ready to Book Your Dublin Airport Parking?</h2>
                    <p className="section-subtitle text-light-grey mb-4">
                        Check your dates, view current availability and get your parking price online.
                    </p>
                    <Link to="/contact-us" className="btn-modern">Contact Support</Link>
                </div>
            </section>



    </main>

</>
  )
}

export default Home
