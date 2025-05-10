import React, {useEffect} from 'react'
import BookingDatesForm from '../components/HomePage/BookingDatesForm'
import FAQSection from '../components/HomePage/FAQSection'
import { useBooking } from "../context/BookingContext";
import VoucherToast from "../components/Utility/VoucherToast"
import bannerImg1 from "../assets/banner-img1.webp"
import bannerImg2 from "../assets/banner-img2.webp"
import bannerImg3 from "../assets/banner-img3.webp"
import bannerImg4 from "../assets/banner-img4.webp"
import { Helmet } from 'react-helmet-async';

const Home = () => {

    const { setBookingData } = useBooking();
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
            setBookingData(null);
        }
        localStorage.removeItem("payment_status");
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
    }
]
}
`}
        </script>


    </Helmet>

    <VoucherToast />
    <div data-elementor-type="wp-page" data-elementor-id="88" className="elementor elementor-88" data-elementor-post-type="page">
        <div style={{height:"450px"}} className="elementor-element elementor-element-3c708887 e-flex e-con-boxed e-con e-parent e-lazyloaded" data-id="3c708887" data-element_type="container" data-settings="{&quot;background_background&quot;:&quot;slideshow&quot;,&quot;background_slideshow_gallery&quot;:[{&quot;id&quot;:503,&quot;url&quot;:&quot;https:\/\/rsexpressparking.com\/wp-content\/uploads\/2025\/01\/3efbfe9s-1920.jpg&quot;},{&quot;id&quot;:502,&quot;url&quot;:&quot;https:\/\/rsexpressparking.com\/wp-content\/uploads\/2025\/01\/podzemnaya_parkovka.jpg&quot;},{&quot;id&quot;:505,&quot;url&quot;:&quot;https:\/\/rsexpressparking.com\/wp-content\/uploads\/2025\/01\/wm_5c6d2e8b34438-scaled.jpg&quot;},{&quot;id&quot;:352,&quot;url&quot;:&quot;https:\/\/rsexpressparking.com\/wp-content\/uploads\/2025\/01\/pexels-pixabay-164634-1.jpg&quot;}],&quot;background_slideshow_slide_duration&quot;:30000,&quot;background_slideshow_loop&quot;:&quot;yes&quot;,&quot;background_slideshow_slide_transition&quot;:&quot;fade&quot;,&quot;background_slideshow_transition_duration&quot;:500}">
            <div className="elementor-background-slideshow swiper swiper-fade swiper-initialized swiper-horizontal swiper-pointer-events swiper-rtl swiper-watch-progress" dir="rtl">
            <div className="swiper-wrapper" id="swiper-wrapper-91399bea4b66f666" aria-live="off" style={{ transitionDuration: '0ms' }}>
                {[ 
                { index: 0, url: bannerImg1, classes: 'swiper-slide swiper-slide-duplicate', translate: '0px' },
                { index: 1, url: bannerImg2, classes: 'swiper-slide swiper-slide-duplicate', translate: '1905px' },
                { index: 2, url: bannerImg3, classes: 'swiper-slide swiper-slide-duplicate swiper-slide-duplicate-prev', translate: '3810px' },
                { index: 3, url: bannerImg4, classes: 'swiper-slide swiper-slide-duplicate swiper-slide-duplicate-active', translate: '5715px' },
                { index: 0, url: bannerImg1, classes: 'swiper-slide swiper-slide-duplicate-next', translate: '7620px' },
                { index: 1, url: bannerImg2, classes: 'swiper-slide', translate: '9525px' },
                { index: 2, url: bannerImg3, classes: 'swiper-slide swiper-slide-prev', translate: '11430px' },
                { index: 3, url: bannerImg4, classes: 'swiper-slide swiper-slide-visible swiper-slide-active', translate: '13335px', opacity: '1' },
                { index: 0, url: bannerImg1, classes: 'swiper-slide swiper-slide-duplicate swiper-slide-next', translate: '15240px' },
                { index: 1, url: bannerImg2, classes: 'swiper-slide swiper-slide-duplicate', translate: '17145px' },
                { index: 2, url: bannerImg3, classes: 'swiper-slide swiper-slide-duplicate swiper-slide-duplicate-prev', translate: '19050px' },
                { index: 3, url: bannerImg4, classes: 'swiper-slide swiper-slide-duplicate swiper-slide-duplicate-active', translate: '20955px' },
                ].map((slide, idx) => (
                <div key={idx} className={`elementor-background-slideshow__slide ${slide.classes}`} data-swiper-slide-index={slide.index} style={{ width: '1905px', transitionDuration: '0ms', opacity: slide.opacity || '0', transform: `translate3d(${slide.translate}, 0px, 0px)`, }} role="group" >
                    <div className="elementor-background-slideshow__slide__image" style={{     backgroundImage: `url('${slide.url}')`, }} ></div>
                </div>
                ))}
            </div>
                <span className="swiper-notification" aria-live="assertive" aria-atomic="true"></span>
            </div>
            <div>
            <div className="e-con-inner">
                {/* Existing Text Column */}
                <div className="text-column" style={{ flex: 1, minWidth: '300px' }}>
                    <div className="elementor-element elementor-element-7630333a e-con-full e-flex e-con e-child" data-id="7630333a" data-element_type="container">

                    <div style={{marginBottom:"10px"}} className="elementor-element elementor-element-282e4767 elementor-widget elementor-widget-heading animated fadeIn" data-id="282e4767" data-element_type="widget" data-settings="{&quot;_animation_delay&quot;:200}" data-widget_type="heading.default">
                        <div className="elementor-widget-container">
                        <h1 className="elementor-heading-title elementor-size-default home-heading">Meet &amp; Greet Dublin Airport Parking</h1>
                        </div>
                    </div>
                    <div className="elementor-element elementor-element-d2c488a elementor-widget__width-inherit elementor-widget elementor-widget-text-editor animated fadeIn" data-id="d2c488a" data-element_type="widget" data-settings="{}" data-widget_type="text-editor.default">
                        <div className="elementor-widget-container home-text">
                            <h5>Book secure Dublin Airport Parking with 24/7 CCTV monitoring &amp; Meet &amp; Greet service.</h5>
                            <h5>Quick drop-off, easy booking &amp; stress-free travel!</h5>
                        </div>
                    </div>
                    
                    </div>
                </div>

                
                
            </div>
        </div>
    </div>
    <BookingDatesForm />

        
        <div className="elementor-element elementor-element-404ae19c e-flex e-con-boxed e-con e-parent e-lazyloaded" data-id="404ae19c" data-element_type="container" id="reviews" data-settings="{&quot;background_background&quot;:&quot;classic&quot;}">
            <div className="e-con-inner">
                <div className="elementor-element elementor-element-1ac568ab elementor-widget__width-inherit elementor-widget elementor-widget-text-editor animated fadeIn" data-id="1ac568ab" data-element_type="widget" data-settings="{&quot;_animation&quot;:&quot;fadeIn&quot;}" data-widget_type="text-editor.default">
                    <div className="elementor-widget-container">
                    <p>Testimonial</p>
                    </div>
                </div>
                <div className="elementor-element elementor-element-3af66b91 elementor-widget elementor-widget-heading animated fadeIn" data-id="3af66b91" data-element_type="widget" data-settings="{&quot;_animation&quot;:&quot;fadeIn&quot;,&quot;_animation_delay&quot;:200}" data-widget_type="heading.default">
                    <div className="elementor-widget-container">
                    <h2 className="elementor-heading-title elementor-size-default">What Our Customers Say</h2>
                    </div>
                </div>
                <div className="elementor-element elementor-element-7fb02ccb e-grid e-con-full e-con e-child" data-id="7fb02ccb" data-element_type="container">
                    <div className="elementor-element elementor-element-69ac1cd0 e-con-full e-flex e-con e-child animated fadeIn" data-id="69ac1cd0" data-element_type="container" data-settings="{&quot;animation&quot;:&quot;fadeIn&quot;,&quot;animation_delay&quot;:400,&quot;background_background&quot;:&quot;classic&quot;}">
                    <div className="elementor-element elementor-element-7de316be elementor-widget elementor-widget-rating" data-id="7de316be" data-element_type="widget" data-widget_type="rating.default">
                        <div className="elementor-widget-container">
                            <div className="e-rating">
                                <meta content="0"/>
                                <meta content="5"/>
                                <div className="e-rating-wrapper" content="5" role="img" aria-label="Rated 5 out of 5">
                                <div className="e-icon">
                                    <div className="e-icon-wrapper e-icon-marked">
                                        <i aria-hidden="true" className="icon icon-star-1"></i>				
                                    </div>
                                    <div className="e-icon-wrapper e-icon-unmarked">
                                        <i aria-hidden="true" className="icon icon-star-1"></i>				
                                    </div>
                                </div>
                                <div className="e-icon">
                                    <div className="e-icon-wrapper e-icon-marked">
                                        <i aria-hidden="true" className="icon icon-star-1"></i>				
                                    </div>
                                    <div className="e-icon-wrapper e-icon-unmarked">
                                        <i aria-hidden="true" className="icon icon-star-1"></i>				
                                    </div>
                                </div>
                                <div className="e-icon">
                                    <div className="e-icon-wrapper e-icon-marked">
                                        <i aria-hidden="true" className="icon icon-star-1"></i>				
                                    </div>
                                    <div className="e-icon-wrapper e-icon-unmarked">
                                        <i aria-hidden="true" className="icon icon-star-1"></i>				
                                    </div>
                                </div>
                                <div className="e-icon">
                                    <div className="e-icon-wrapper e-icon-marked">
                                        <i aria-hidden="true" className="icon icon-star-1"></i>				
                                    </div>
                                    <div className="e-icon-wrapper e-icon-unmarked">
                                        <i aria-hidden="true" className="icon icon-star-1"></i>				
                                    </div>
                                </div>
                                <div className="e-icon">
                                    <div className="e-icon-wrapper e-icon-marked">
                                        <i aria-hidden="true" className="icon icon-star-1"></i>				
                                    </div>
                                    <div className="e-icon-wrapper e-icon-unmarked">
                                        <i aria-hidden="true" className="icon icon-star-1"></i>				
                                    </div>
                                </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="elementor-element elementor-element-5d315465 elementor-widget__width-inherit elementor-widget-divider--view-line elementor-widget elementor-widget-divider" data-id="5d315465" data-element_type="widget" data-widget_type="divider.default">
                        <div className="elementor-widget-container">
                            <div className="elementor-divider">
                                <span className="elementor-divider-separator">
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="elementor-element elementor-element-2f337483 elementor-widget elementor-widget-text-editor" data-id="2f337483" data-element_type="widget" data-widget_type="text-editor.default">
                        <div className="elementor-widget-container">
                            <p>“Amazing service! Hassle-free and very professional. Highly recommend RS Express Parking!”</p>
                        </div>
                    </div>
                    <div className="elementor-element elementor-element-8afa051 elementor-widget__width-inherit elementor-widget-divider--view-line elementor-widget elementor-widget-divider" data-id="8afa051" data-element_type="widget" data-widget_type="divider.default">
                        <div className="elementor-widget-container">
                            <div className="elementor-divider">
                                <span className="elementor-divider-separator">
                                </span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="elementor-element elementor-element-149fea59 e-con-full e-flex e-con e-child" data-id="149fea59" data-element_type="container">
                        <div className="elementor-element elementor-element-6d888937 elementor-widget elementor-widget-text-editor" data-id="6d888937" data-element_type="widget" data-widget_type="text-editor.default">
                            <div className="elementor-widget-container">
                                <p>Cindy Starlite</p>
                            </div>
                        </div>
                        <div className="elementor-element elementor-element-2275cf08 elementor-widget elementor-widget-text-editor" data-id="2275cf08" data-element_type="widget" data-widget_type="text-editor.default">
                            <div className="elementor-widget-container">
                                <p>Customer</p>
                            </div>
                        </div>
                    </div>
                    </div>
                    <div className="elementor-element elementor-element-7ea73934 e-con-full e-flex e-con e-child animated fadeIn" data-id="7ea73934" data-element_type="container" data-settings="{&quot;animation&quot;:&quot;fadeIn&quot;,&quot;animation_delay&quot;:500,&quot;background_background&quot;:&quot;classic&quot;}">
                    <div className="elementor-element elementor-element-283e19e1 elementor-widget elementor-widget-rating" data-id="283e19e1" data-element_type="widget" data-widget_type="rating.default">
                        <div className="elementor-widget-container">
                            <div className="e-rating">
                                <meta content="0"/>
                                <meta content="5"/>
                                <div className="e-rating-wrapper" content="5" role="img" aria-label="Rated 5 out of 5">
                                <div className="e-icon">
                                    <div className="e-icon-wrapper e-icon-marked">
                                        <i aria-hidden="true" className="icon icon-star-1"></i>				
                                    </div>
                                    <div className="e-icon-wrapper e-icon-unmarked">
                                        <i aria-hidden="true" className="icon icon-star-1"></i>				
                                    </div>
                                </div>
                                <div className="e-icon">
                                    <div className="e-icon-wrapper e-icon-marked">
                                        <i aria-hidden="true" className="icon icon-star-1"></i>				
                                    </div>
                                    <div className="e-icon-wrapper e-icon-unmarked">
                                        <i aria-hidden="true" className="icon icon-star-1"></i>				
                                    </div>
                                </div>
                                <div className="e-icon">
                                    <div className="e-icon-wrapper e-icon-marked">
                                        <i aria-hidden="true" className="icon icon-star-1"></i>				
                                    </div>
                                    <div className="e-icon-wrapper e-icon-unmarked">
                                        <i aria-hidden="true" className="icon icon-star-1"></i>				
                                    </div>
                                </div>
                                <div className="e-icon">
                                    <div className="e-icon-wrapper e-icon-marked">
                                        <i aria-hidden="true" className="icon icon-star-1"></i>				
                                    </div>
                                    <div className="e-icon-wrapper e-icon-unmarked">
                                        <i aria-hidden="true" className="icon icon-star-1"></i>				
                                    </div>
                                </div>
                                <div className="e-icon">
                                    <div className="e-icon-wrapper e-icon-marked">
                                        <i aria-hidden="true" className="icon icon-star-1"></i>				
                                    </div>
                                    <div className="e-icon-wrapper e-icon-unmarked">
                                        <i aria-hidden="true" className="icon icon-star-1"></i>				
                                    </div>
                                </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="elementor-element elementor-element-5314a7a5 elementor-widget__width-inherit elementor-widget-divider--view-line elementor-widget elementor-widget-divider" data-id="5314a7a5" data-element_type="widget" data-widget_type="divider.default">
                        <div className="elementor-widget-container">
                            <div className="elementor-divider">
                                <span className="elementor-divider-separator">
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="elementor-element elementor-element-3d3f8191 elementor-widget elementor-widget-text-editor" data-id="3d3f8191" data-element_type="widget" data-widget_type="text-editor.default">
                        <div className="elementor-widget-container">
                            <p>“The staff were so friendly and helpful. Parking made simple!”</p>
                        </div>
                    </div>
                    <div className="elementor-element elementor-element-2b201b35 elementor-widget__width-inherit elementor-widget-divider--view-line elementor-widget elementor-widget-divider" data-id="2b201b35" data-element_type="widget" data-widget_type="divider.default">
                        <div className="elementor-widget-container">
                            <div className="elementor-divider">
                                <span className="elementor-divider-separator">
                                </span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="elementor-element elementor-element-3713741d e-con-full e-flex e-con e-child" data-id="3713741d" data-element_type="container">
                        <div className="elementor-element elementor-element-5b049b82 elementor-widget elementor-widget-text-editor" data-id="5b049b82" data-element_type="widget" data-widget_type="text-editor.default">
                            <div className="elementor-widget-container">
                                <p>Mark Wellberg</p>
                            </div>
                        </div>
                        <div className="elementor-element elementor-element-68528165 elementor-widget elementor-widget-text-editor" data-id="68528165" data-element_type="widget" data-widget_type="text-editor.default">
                            <div className="elementor-widget-container">
                                <p>Customer</p>
                            </div>
                        </div>
                    </div>
                    </div>
                    <div className="elementor-element elementor-element-7c00d690 e-con-full e-flex e-con e-child animated fadeIn" data-id="7c00d690" data-element_type="container" data-settings="{&quot;animation&quot;:&quot;fadeIn&quot;,&quot;animation_delay&quot;:600,&quot;background_background&quot;:&quot;classic&quot;}">
                    <div className="elementor-element elementor-element-43210196 elementor-widget elementor-widget-rating" data-id="43210196" data-element_type="widget" data-widget_type="rating.default">
                        <div className="elementor-widget-container">
                            <div className="e-rating">
                                <meta content="0"/>
                                <meta content="5"/>
                                <div className="e-rating-wrapper" content="5" role="img" aria-label="Rated 5 out of 5">
                                <div className="e-icon">
                                    <div className="e-icon-wrapper e-icon-marked">
                                        <i aria-hidden="true" className="icon icon-star-1"></i>				
                                    </div>
                                    <div className="e-icon-wrapper e-icon-unmarked">
                                        <i aria-hidden="true" className="icon icon-star-1"></i>				
                                    </div>
                                </div>
                                <div className="e-icon">
                                    <div className="e-icon-wrapper e-icon-marked">
                                        <i aria-hidden="true" className="icon icon-star-1"></i>				
                                    </div>
                                    <div className="e-icon-wrapper e-icon-unmarked">
                                        <i aria-hidden="true" className="icon icon-star-1"></i>				
                                    </div>
                                </div>
                                <div className="e-icon">
                                    <div className="e-icon-wrapper e-icon-marked">
                                        <i aria-hidden="true" className="icon icon-star-1"></i>				
                                    </div>
                                    <div className="e-icon-wrapper e-icon-unmarked">
                                        <i aria-hidden="true" className="icon icon-star-1"></i>				
                                    </div>
                                </div>
                                <div className="e-icon">
                                    <div className="e-icon-wrapper e-icon-marked">
                                        <i aria-hidden="true" className="icon icon-star-1"></i>				
                                    </div>
                                    <div className="e-icon-wrapper e-icon-unmarked">
                                        <i aria-hidden="true" className="icon icon-star-1"></i>				
                                    </div>
                                </div>
                                <div className="e-icon">
                                    <div className="e-icon-wrapper e-icon-marked">
                                        <i aria-hidden="true" className="icon icon-star-1"></i>				
                                    </div>
                                    <div className="e-icon-wrapper e-icon-unmarked">
                                        <i aria-hidden="true" className="icon icon-star-1"></i>				
                                    </div>
                                </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="elementor-element elementor-element-611d2ee4 elementor-widget__width-inherit elementor-widget-divider--view-line elementor-widget elementor-widget-divider" data-id="611d2ee4" data-element_type="widget" data-widget_type="divider.default">
                        <div className="elementor-widget-container">
                            <div className="elementor-divider">
                                <span className="elementor-divider-separator">
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="elementor-element elementor-element-5dc82577 elementor-widget elementor-widget-text-editor" data-id="5dc82577" data-element_type="widget" data-widget_type="text-editor.default">
                        <div className="elementor-widget-container">
                            <p>“Secure and reliable. Will definitely book again!”</p>
                        </div>
                    </div>
                    <div className="elementor-element elementor-element-3eb964a1 elementor-widget__width-inherit elementor-widget-divider--view-line elementor-widget elementor-widget-divider" data-id="3eb964a1" data-element_type="widget" data-widget_type="divider.default">
                        <div className="elementor-widget-container">
                            <div className="elementor-divider">
                                <span className="elementor-divider-separator">
                                </span>
                            </div>
                        </div>
                    </div>
                   
                    <div className="elementor-element elementor-element-57520232 e-con-full e-flex e-con e-child" data-id="57520232" data-element_type="container">
                        <div className="elementor-element elementor-element-7186e90f elementor-widget elementor-widget-text-editor" data-id="7186e90f" data-element_type="widget" data-widget_type="text-editor.default">
                            <div className="elementor-widget-container">
                                <p>Wanda Young</p>
                            </div>
                        </div>
                        <div className="elementor-element elementor-element-714fb9ad elementor-widget elementor-widget-text-editor" data-id="714fb9ad" data-element_type="widget" data-widget_type="text-editor.default">
                            <div className="elementor-widget-container">
                                <p>Customer</p>
                            </div>
                        </div>
                    </div>
                    </div>
                    <div className="elementor-element elementor-element-30b4693a e-con-full e-flex e-con e-child animated fadeIn" data-id="30b4693a" data-element_type="container" data-settings="{&quot;animation&quot;:&quot;fadeIn&quot;,&quot;animation_delay&quot;:400,&quot;background_background&quot;:&quot;classic&quot;}">
                    <div className="elementor-element elementor-element-20afa83 elementor-widget elementor-widget-rating" data-id="20afa83" data-element_type="widget" data-widget_type="rating.default">
                        <div className="elementor-widget-container">
                            <div className="e-rating">
                                <meta content="0"/>
                                <meta content="5"/>
                                <div className="e-rating-wrapper" content="5" role="img" aria-label="Rated 5 out of 5">
                                <div className="e-icon">
                                    <div className="e-icon-wrapper e-icon-marked">
                                        <i aria-hidden="true" className="icon icon-star-1"></i>				
                                    </div>
                                    <div className="e-icon-wrapper e-icon-unmarked">
                                        <i aria-hidden="true" className="icon icon-star-1"></i>				
                                    </div>
                                </div>
                                <div className="e-icon">
                                    <div className="e-icon-wrapper e-icon-marked">
                                        <i aria-hidden="true" className="icon icon-star-1"></i>				
                                    </div>
                                    <div className="e-icon-wrapper e-icon-unmarked">
                                        <i aria-hidden="true" className="icon icon-star-1"></i>				
                                    </div>
                                </div>
                                <div className="e-icon">
                                    <div className="e-icon-wrapper e-icon-marked">
                                        <i aria-hidden="true" className="icon icon-star-1"></i>				
                                    </div>
                                    <div className="e-icon-wrapper e-icon-unmarked">
                                        <i aria-hidden="true" className="icon icon-star-1"></i>				
                                    </div>
                                </div>
                                <div className="e-icon">
                                    <div className="e-icon-wrapper e-icon-marked">
                                        <i aria-hidden="true" className="icon icon-star-1"></i>				
                                    </div>
                                    <div className="e-icon-wrapper e-icon-unmarked">
                                        <i aria-hidden="true" className="icon icon-star-1"></i>				
                                    </div>
                                </div>
                                <div className="e-icon">
                                    <div className="e-icon-wrapper e-icon-marked">
                                        <i aria-hidden="true" className="icon icon-star-1"></i>				
                                    </div>
                                    <div className="e-icon-wrapper e-icon-unmarked">
                                        <i aria-hidden="true" className="icon icon-star-1"></i>				
                                    </div>
                                </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="elementor-element elementor-element-754d6d81 elementor-widget__width-inherit elementor-widget-divider--view-line elementor-widget elementor-widget-divider" data-id="754d6d81" data-element_type="widget" data-widget_type="divider.default">
                        <div className="elementor-widget-container">
                            <div className="elementor-divider">
                                <span className="elementor-divider-separator">
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="elementor-element elementor-element-5b69e10d elementor-widget elementor-widget-text-editor" data-id="5b69e10d" data-element_type="widget" data-widget_type="text-editor.default">
                        <div className="elementor-widget-container">
                            <p>“Easy to use and worth every penny. Excellent parking service!”</p>
                        </div>
                    </div>
                    <div className="elementor-element elementor-element-3b1bf240 elementor-widget__width-inherit elementor-widget-divider--view-line elementor-widget elementor-widget-divider" data-id="3b1bf240" data-element_type="widget" data-widget_type="divider.default">
                        <div className="elementor-widget-container">
                            <div className="elementor-divider">
                                <span className="elementor-divider-separator">
                                </span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="elementor-element elementor-element-2d5ffed3 e-con-full e-flex e-con e-child" data-id="2d5ffed3" data-element_type="container">
                        <div className="elementor-element elementor-element-dec002e elementor-widget elementor-widget-text-editor" data-id="dec002e" data-element_type="widget" data-widget_type="text-editor.default">
                            <div className="elementor-widget-container">
                                <p>Manda Houston</p>
                            </div>
                        </div>
                        <div className="elementor-element elementor-element-5d143e9d elementor-widget elementor-widget-text-editor" data-id="5d143e9d" data-element_type="widget" data-widget_type="text-editor.default">
                            <div className="elementor-widget-container">
                                <p>Customer</p>
                            </div>
                        </div>
                    </div>
                    </div>
                    <div className="elementor-element elementor-element-42d68052 e-con-full e-flex e-con e-child animated fadeIn" data-id="42d68052" data-element_type="container" data-settings="{&quot;animation&quot;:&quot;fadeIn&quot;,&quot;animation_delay&quot;:500,&quot;background_background&quot;:&quot;classic&quot;}">
                    <div className="elementor-element elementor-element-9f021e elementor-widget elementor-widget-rating" data-id="9f021e" data-element_type="widget" data-widget_type="rating.default">
                        <div className="elementor-widget-container">
                            <div className="e-rating">
                                <meta content="0"/>
                                <meta content="5"/>
                                <div className="e-rating-wrapper" content="5" role="img" aria-label="Rated 5 out of 5">
                                <div className="e-icon">
                                    <div className="e-icon-wrapper e-icon-marked">
                                        <i aria-hidden="true" className="icon icon-star-1"></i>				
                                    </div>
                                    <div className="e-icon-wrapper e-icon-unmarked">
                                        <i aria-hidden="true" className="icon icon-star-1"></i>				
                                    </div>
                                </div>
                                <div className="e-icon">
                                    <div className="e-icon-wrapper e-icon-marked">
                                        <i aria-hidden="true" className="icon icon-star-1"></i>				
                                    </div>
                                    <div className="e-icon-wrapper e-icon-unmarked">
                                        <i aria-hidden="true" className="icon icon-star-1"></i>				
                                    </div>
                                </div>
                                <div className="e-icon">
                                    <div className="e-icon-wrapper e-icon-marked">
                                        <i aria-hidden="true" className="icon icon-star-1"></i>				
                                    </div>
                                    <div className="e-icon-wrapper e-icon-unmarked">
                                        <i aria-hidden="true" className="icon icon-star-1"></i>				
                                    </div>
                                </div>
                                <div className="e-icon">
                                    <div className="e-icon-wrapper e-icon-marked">
                                        <i aria-hidden="true" className="icon icon-star-1"></i>				
                                    </div>
                                    <div className="e-icon-wrapper e-icon-unmarked">
                                        <i aria-hidden="true" className="icon icon-star-1"></i>				
                                    </div>
                                </div>
                                <div className="e-icon">
                                    <div className="e-icon-wrapper e-icon-marked">
                                        <i aria-hidden="true" className="icon icon-star-1"></i>				
                                    </div>
                                    <div className="e-icon-wrapper e-icon-unmarked">
                                        <i aria-hidden="true" className="icon icon-star-1"></i>				
                                    </div>
                                </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="elementor-element elementor-element-86f8f2e elementor-widget__width-inherit elementor-widget-divider--view-line elementor-widget elementor-widget-divider" data-id="86f8f2e" data-element_type="widget" data-widget_type="divider.default">
                        <div className="elementor-widget-container">
                            <div className="elementor-divider">
                                <span className="elementor-divider-separator">
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="elementor-element elementor-element-15b98610 elementor-widget elementor-widget-text-editor" data-id="15b98610" data-element_type="widget" data-widget_type="text-editor.default">
                        <div className="elementor-widget-container">
                            <p>“Great value for money. Convenient and secure!”</p>
                        </div>
                    </div>
                    <div className="elementor-element elementor-element-21b44d96 elementor-widget__width-inherit elementor-widget-divider--view-line elementor-widget elementor-widget-divider" data-id="21b44d96" data-element_type="widget" data-widget_type="divider.default">
                        <div className="elementor-widget-container">
                            <div className="elementor-divider">
                                <span className="elementor-divider-separator">
                                </span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="elementor-element elementor-element-1530d766 e-con-full e-flex e-con e-child" data-id="1530d766" data-element_type="container">
                        <div className="elementor-element elementor-element-74bdaa58 elementor-widget elementor-widget-text-editor" data-id="74bdaa58" data-element_type="widget" data-widget_type="text-editor.default">
                            <div className="elementor-widget-container">
                                <p>Peter Lawson</p>
                            </div>
                        </div>
                        <div className="elementor-element elementor-element-256958d elementor-widget elementor-widget-text-editor" data-id="256958d" data-element_type="widget" data-widget_type="text-editor.default">
                            <div className="elementor-widget-container">
                                <p>Customer</p>
                            </div>
                        </div>
                    </div>
                    </div>
                    <div className="elementor-element elementor-element-68fa31f4 e-con-full e-flex e-con e-child animated fadeIn" data-id="68fa31f4" data-element_type="container" data-settings="{&quot;animation&quot;:&quot;fadeIn&quot;,&quot;animation_delay&quot;:600,&quot;background_background&quot;:&quot;classic&quot;}">
                    <div className="elementor-element elementor-element-684f0402 elementor-widget elementor-widget-rating" data-id="684f0402" data-element_type="widget" data-widget_type="rating.default">
                        <div className="elementor-widget-container">
                            <div className="e-rating">
                                <meta content="0"/>
                                <meta content="5"/>
                                <div className="e-rating-wrapper" content="5" role="img" aria-label="Rated 5 out of 5">
                                <div className="e-icon">
                                    <div className="e-icon-wrapper e-icon-marked">
                                        <i aria-hidden="true" className="icon icon-star-1"></i>				
                                    </div>
                                    <div className="e-icon-wrapper e-icon-unmarked">
                                        <i aria-hidden="true" className="icon icon-star-1"></i>				
                                    </div>
                                </div>
                                <div className="e-icon">
                                    <div className="e-icon-wrapper e-icon-marked">
                                        <i aria-hidden="true" className="icon icon-star-1"></i>				
                                    </div>
                                    <div className="e-icon-wrapper e-icon-unmarked">
                                        <i aria-hidden="true" className="icon icon-star-1"></i>				
                                    </div>
                                </div>
                                <div className="e-icon">
                                    <div className="e-icon-wrapper e-icon-marked">
                                        <i aria-hidden="true" className="icon icon-star-1"></i>				
                                    </div>
                                    <div className="e-icon-wrapper e-icon-unmarked">
                                        <i aria-hidden="true" className="icon icon-star-1"></i>				
                                    </div>
                                </div>
                                <div className="e-icon">
                                    <div className="e-icon-wrapper e-icon-marked">
                                        <i aria-hidden="true" className="icon icon-star-1"></i>				
                                    </div>
                                    <div className="e-icon-wrapper e-icon-unmarked">
                                        <i aria-hidden="true" className="icon icon-star-1"></i>				
                                    </div>
                                </div>
                                <div className="e-icon">
                                    <div className="e-icon-wrapper e-icon-marked">
                                        <i aria-hidden="true" className="icon icon-star-1"></i>				
                                    </div>
                                    <div className="e-icon-wrapper e-icon-unmarked">
                                        <i aria-hidden="true" className="icon icon-star-1"></i>				
                                    </div>
                                </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="elementor-element elementor-element-5293b71c elementor-widget__width-inherit elementor-widget-divider--view-line elementor-widget elementor-widget-divider" data-id="5293b71c" data-element_type="widget" data-widget_type="divider.default">
                        <div className="elementor-widget-container">
                            <div className="elementor-divider">
                                <span className="elementor-divider-separator">
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="elementor-element elementor-element-334d7463 elementor-widget elementor-widget-text-editor" data-id="334d7463" data-element_type="widget" data-widget_type="text-editor.default">
                        <div className="elementor-widget-container">
                            <p>“Highly efficient. The meet-and-greet option saved me so much time!”</p>
                        </div>
                    </div>
                    <div className="elementor-element elementor-element-1f6bef7e elementor-widget__width-inherit elementor-widget-divider--view-line elementor-widget elementor-widget-divider" data-id="1f6bef7e" data-element_type="widget" data-widget_type="divider.default">
                        <div className="elementor-widget-container">
                            <div className="elementor-divider">
                                <span className="elementor-divider-separator">
                                </span>
                            </div>
                        </div>
                    </div>
                   
                    <div className="elementor-element elementor-element-45f08120 e-con-full e-flex e-con e-child" data-id="45f08120" data-element_type="container">
                        <div className="elementor-element elementor-element-1dc9fee7 elementor-widget elementor-widget-text-editor" data-id="1dc9fee7" data-element_type="widget" data-widget_type="text-editor.default">
                            <div className="elementor-widget-container">
                                <p>Tamara Frans</p>
                            </div>
                        </div>
                        <div className="elementor-element elementor-element-521cf459 elementor-widget elementor-widget-text-editor" data-id="521cf459" data-element_type="widget" data-widget_type="text-editor.default">
                            <div className="elementor-widget-container">
                                <p>Customer</p>
                            </div>
                        </div>
                    </div>
                    </div>
                </div>
            </div>
        </div>
        <FAQSection />
    </div>

</>
  )
}

export default Home