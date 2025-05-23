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
import FAQSection from "../components/HomePage/FAQSection";

const Home = () => {

    const { setBookingData } = useBooking();
    const [faqs, setFaqs] = useState([]);
    const [loading, setLoading] = useState(true);
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
        } catch (error) {
            console.error('Error fetching FAQs:', error);
        } finally {
            setLoading(false);
        }
    };
    fetchFAQs();
    }, []);
    
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

    <div style={{backgroundColor: "#F5F4EE"}} data-elementor-type="wp-page" data-elementor-id="88" className="elementor elementor-88" data-elementor-post-type="page">
        <div className="home-banner">
            <Swiper
                modules={[Autoplay, EffectFade]}
                effect="fade"
                autoplay={{ delay: 5000, disableOnInteraction: false }}
                loop={true}
                className="swiper-container"
            >
                <SwiperSlide>
                <div
                    className="banner-slide"
                    style={{
                    backgroundImage: `url(${bannerImg1})`,
                    }}
                >
                    <div className="overlay"></div>
                </div>
                </SwiperSlide>
                <SwiperSlide>
                <div
                    className="banner-slide"
                    style={{
                    backgroundImage: `url(${bannerImg2})`,
                    }}
                >
                    <div className="overlay"></div>
                </div>
                </SwiperSlide>
                <SwiperSlide>
                <div
                    className="banner-slide"
                    style={{
                    backgroundImage: `url(${bannerImg3})`,
                    }}
                >
                    <div className="overlay"></div>
                </div>
                </SwiperSlide>
                <SwiperSlide>
                <div
                    className="banner-slide"
                    style={{
                    backgroundImage: `url(${bannerImg4})`,
                    }}
                >
                    <div className="overlay"></div>
                </div>
                </SwiperSlide>
            </Swiper>
            <div className="banner-content">
                <h6 style={{letterSpacing:"5px", textTransform:"uppercase", fontWeight:400, fontSize:"14px"}}>Secure, Affordable &amp; Stress-Free</h6>
                <h1 className="banner-heading">Meet & Greet Dublin Airport Parking</h1>
                <h3 className="banner-subheading">
                Book secure Meet & Greet parking at Dublin Airport. 
                <br />
                24/7 CCTV-monitored, fully patrolled, with quick terminal handovers and easy booking.
                </h3>
            </div>
        </div>
    <BookingDatesForm />

        
        
        <div className="info-section">
            <p className="info-title">Start Your Trip the Smart Way – Park with Confidence</p>
            <h2 className="info-heading">Effortless Airport Parking – Secure, Fast & Reliable</h2>
            <p className="info-description">
                Say goodbye to airport parking worries. Our Meet & Greet service allows you to drive straight to your terminal, where our team will collect your car and park it safely in our secure, 24/7 monitored facility — so you can travel stress-free.
            </p>
            <p className="info-important">
                Important information:<br />
                If you experience delays or damage, please report the issue directly to RS Express Parking's customer support at <a style={{color:"#010659"}} href="tel:+35319640011">+353 1 964 0011</a>.
            </p>
            <h3 className="info-subheading"><strong>What To Do When You Arrive</strong></h3>
            <p><strong>Drop Off Procedure:</strong></p>
            <p>
                Call the driver directly at <a style={{color:"#010659"}} href="tel:+353834896505">+353 83 489 6505</a> around 25–30 minutes before reaching the terminal. This ensures we dispatch a driver to meet you promptly.<br/>
                <strong>Note:</strong> Please do not call the support number for arrival. Only contact the driver for drop-off and collection.
            </p>
            <p><strong>Terminal 1:</strong></p>
            <p>
                Call 25–30 minutes before arrival.<br />
                Follow signs for T1 departure — our driver will meet you there.
            </p>
            <p><strong>Terminal 2:</strong></p>
            <p>
                Call 25–30 minutes before arrival.<br />
                Follow signs for T2 departures.<br />
                Our driver will meet you at the designated set-down area.
            </p>
            <h3 className="info-subheading"><strong>What To Do When You Come Back</strong></h3>
            <p><strong>Return Procedure:</strong></p>
            <p>
                While collecting your luggage, call the driver at <a style={{color:"#010659"}} href="tel:+353834896505">+353 83 489 6505</a> around 20–25 minutes before leaving the terminal to notify them of your return.<br />
                Head to the collection zone as directed.<br />
                Our driver will meet you with your car at the ‘Arrival Pickup Area’, ready for you to drive straight home.
            </p>
            <p>
                No shuttle required — Meet & Greet service is provided directly at the terminal
            </p>
            <p>Cancellable up to 72 hours before drop-off</p>
            <p>
                Reserve now for a smooth, professional, and fully secure airport parking experience
            </p>
            <div className="info-button-wrapper">
                <a className="info-button" href="#book">Start Your Booking Now</a>
            </div>
        </div>
        <div className="features-section container custom-gap">
            <div className="row">
                <div className="col-12 feature-item">
                <img
                    src={customerSupport}
                    alt="24/7 Customer Support"
                    className="feature-image"
                />
                <h3 className="feature-title">24/7 Customer Support</h3>
                <hr className="feature-divider" />
                <p className="feature-description">
                    Need help anytime? Our dedicated support team is available round-the-clock to assist you — from booking to pickup — making your journey completely worry-free.
                </p>
                </div>
                <div className="col-12 feature-item">
                <img
                    src={terminal}
                    alt="Terminal Meet & Greet"
                    className="feature-image"
                />
                <h3 className="feature-title">Terminal Meet & Greet</h3>
                <hr className="feature-divider" />
                <p className="feature-description">
                    No need to search for parking. Just drive straight to the terminal, where our staff will greet you, assist with luggage, and handle the rest — quick, simple, and efficient.
                </p>
                </div>
                <div className="col-12 feature-item">
                <img
                    src={secureParking}
                    alt="Secure Parking Facility"
                    className="feature-image"
                />
                <h3 className="feature-title">Secure Parking Facility</h3>
                <hr className="feature-divider" />
                <p className="feature-description">
                    Rest easy knowing your car is parked in a CCTV-monitored facility with 24/7 on-site security patrols. Your vehicle’s safety is our priority while you’re away.
                </p>
                </div>
            </div>
        </div>
       <div className="container py-5">
            <div className="row align-items-stretch">
                {/* Left Image Section */}
                <div className="col-12 col-md-6 d-flex align-items-center">
                <img
                    src={addOns}
                    alt="Car Wash"
                    className="img-fluid rounded w-100 h-100"
                    style={{ objectFit: "cover" }}
                />
                </div>
                {/* Right Content Section */}
                <div className="col-12 col-md-6 d-flex flex-column justify-content-center px-4 right-content">
                <h2 className="text-dark-blue mb-4">Optional Add-Ons – Valet & Car Wash</h2>
                <p className="text-muted">
                    Make your return even better with our expert car wash and valet options. Choose from a range of services to keep your vehicle spotless while you’re away.
                </p>
                <ul className="list-unstyled">
                    <li>
                    <strong>Hand Wash &amp; Wax</strong>
                    <br />
                    Exterior wash, wheel cleaning, and tyre polish. (Jeep/MPV +€5)
                    </li>
                    <li className="mt-3">                    
                    <strong>Interior &amp; Exterior Valet</strong>
                    <br />
                    Full exterior wash with interior vacuuming. (Jeep/MPV +€10)
                    </li>
                    <li className="mt-3">                    
                    <strong>Full Valet</strong>
                    <br />
                    Interior deep clean, waxing, and polishing. (Jeep/MPV +€10)
                    </li>                    
                    <li className="mt-3">
                    <strong>Premium Valet</strong>
                    <br />
                    Shampooing, waxing, and full interior detailing. (Jeep/MPV +€20)
                    </li>                    
                    <li className="mt-3">
                    <strong>Ultimate Valet</strong>
                    <br />
                    Complete valet with professional paint buffing for showroom finish. (Jeep/MPV +€50)
                    </li>
                </ul>
                <p className="text-muted mt-1">
                    You can select any add-on service while booking your parking. It’s quick, easy, and optional.
                </p>
                <a href="#book" className="btn btn-primary btn-lg mt-3">
                    Start Your Booking Now
                </a>
                </div>
            </div>
        </div>
        
        <div className="testimonials-main">
            <div className="testimonials-section">
                <div className="testimonials-header">
                    <p className="testimonials-subtitle">Testimonial</p>
                    <h2 className="testimonials-title">What Our Customers Say</h2>
                </div>
                <div className="testimonials-container">
                    <div className="testimonial-card">
                        <div className="testimonial-stars">★★★★★</div>
                        <hr className="testimonial-divider" />
                        <p className="testimonial-text">
                            “Amazing service! Hassle-free and very professional. Highly recommend RS Express Parking!”
                        </p>
                        <hr className="testimonial-divider" />
                        <p className="testimonial-author">Cindy Starlite</p>
                        <p className="testimonial-role">Customer</p>
                    </div>
                    <div className="testimonial-card">
                        <div className="testimonial-stars">★★★★★</div>
                        <hr className="testimonial-divider" />
                        <p className="testimonial-text">
                            “The staff were so friendly and helpful. Parking made simple!”
                        </p>
                        <hr className="testimonial-divider" />
                        <p className="testimonial-author">Mark Wellberg</p>
                        <p className="testimonial-role">Customer</p>
                    </div>
                    <div className="testimonial-card">
                        <div className="testimonial-stars">★★★★★</div>
                        <hr className="testimonial-divider" />
                        <p className="testimonial-text">
                            “Secure and reliable. Will definitely book again!”
                        </p>
                        <hr className="testimonial-divider" />
                        <p className="testimonial-author">Wanda Young</p>
                        <p className="testimonial-role">Customer</p>
                    </div>
                    <div className="testimonial-card">
                        <div className="testimonial-stars">★★★★★</div>
                        <hr className="testimonial-divider" />
                        <p className="testimonial-text">
                            “Easy to use and worth every penny. Excellent parking service!”
                        </p>
                        <hr className="testimonial-divider" />
                        <p className="testimonial-author">Manda Houston</p>
                        <p className="testimonial-role">Customer</p>
                    </div>
                    <div className="testimonial-card">
                        <div className="testimonial-stars">★★★★★</div>
                        <hr className="testimonial-divider" />
                        <p className="testimonial-text">
                            “Great value for money. Convenient and secure!”
                        </p>
                        <hr className="testimonial-divider" />
                        <p className="testimonial-author">Peter Lawson</p>
                        <p className="testimonial-role">Customer</p>
                    </div>
                    <div className="testimonial-card">
                        <div className="testimonial-stars">★★★★★</div>
                        <hr className="testimonial-divider" />
                        <p className="testimonial-text">
                            “Highly efficient. The meet-and-greet option saved me so much time!”
                        </p>
                        <hr className="testimonial-divider" />
                        <p className="testimonial-author">Tamara Frans</p>
                        <p className="testimonial-role">Customer</p>
                    </div>
                </div>
            </div>
        </div>

<FAQSection faqs={faqs} loading={loading}/>



    </div>

</>
  )
}

export default Home