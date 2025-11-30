import React from 'react';
import { Helmet } from 'react-helmet-async';

const PrivacyPolicy = () => {
  return (
    <>
    <Helmet>
        <title>Privacy Policy - RS Express Parking</title>
        <meta name="description" content="At RS Express Parking, we prioritize your privacy and ensure the security of your personal data. This policy explains how we collect, use, and safeguard your information."/>
        <meta name="robots" content="index, follow"/>
        <link rel="canonical" href="https://rsexpressparking.com/privacy-policy/"/>

        <meta property="og:title" content="Privacy Policy - RS Express Parking"/>
        <meta property="og:description" content="Learn how RS Express Parking collects, uses, and protects your personal data. Your privacy matters to us."/>
        <meta property="og:type" content="website"/>
        <meta property="og:url" content="https://rsexpressparking.com/privacy-policy/"/>
        <meta property="og:image" content="https://rsexpressparking.com/images/og-parking.jpg"/>
        <meta property="og:site_name" content="RS Express Parking"/>
        <meta property="og:locale" content="en_US"/>
        <meta name="twitter:card" content="summary_large_image"/>
        <meta name="twitter:title" content="Privacy Policy - RS Express Parking"/>
        <meta name="twitter:description" content="Understand how RS Express Parking handles and protects your data. Review our privacy practices."/>
        <meta name="twitter:image" content="https://rsexpressparking.com/images/og-parking.jpg"/>

    </Helmet>
    <div style={{backgroundColor:"#fff"}}>
        <div className="container py-5 privacy-policy">
        <h1 style={{textAlign:"center", color:"#010659"}} className="mb-4">RS Express Parking Privacy Policy</h1>

        <section className="mb-5">
            <h2 style={{color:"#010659"}} className="h4">1. Introduction</h2>
            <p>
            At <strong>RS Express Parking</strong>, we prioritize your privacy and ensure the security of your personal data.
            This policy explains how we collect, use, and safeguard your information.
            </p>
        </section>

        <section className="mb-5">
            <h2 style={{color:"#010659"}} className="h4">2. Information We Collect</h2>
            <p>We may collect the following details:</p>
            <ul className="list-group list-group-flush">
            <li style={{backgroundColor:"#fff"}} className="list-group-item"><strong>Personal Information</strong>: Name, contact details, and email address.</li>
            <li style={{backgroundColor:"#fff"}} className="list-group-item"><strong>Booking Details</strong>: Vehicle information and payment-related data.</li>
            <li style={{backgroundColor:"#fff"}} className="list-group-item"><strong>Communication Records</strong>: Emails, phone calls, or messages exchanged with our support team.</li>
            <li style={{backgroundColor:"#fff"}} className="list-group-item"><strong>Website Analytics</strong>: IP address, browser type, and usage behavior.</li>
            </ul>
        </section>

        <section className="mb-5">
            <h2 style={{color:"#010659"}} className="h4">3. How We Use Your Information</h2>
            <p>We collect your data to:</p>
            <ul className="list-unstyled ms-3">
            <li>• Process bookings and confirm reservations.</li>
            <li>• Provide customer support and respond to inquiries.</li>
            <li>• Send booking confirmations, reminders, and service updates.</li>
            <li>• Improve our website’s functionality and user experience.</li>
            <li>• Send promotional content with your consent.</li>
            </ul>
        </section>

        <section className="mb-5">
            <h2 style={{color:"#010659"}} className="h4">4. Information Sharing & Disclosure</h2>
            <ul className="list-group list-group-flush">
            <li style={{backgroundColor:"#fff"}} className="list-group-item"><strong>Third-Party Providers</strong>: To facilitate transactions and services.</li>
            <li style={{backgroundColor:"#fff"}} className="list-group-item"><strong>Legal Compliance</strong>: To meet legal and regulatory requirements.</li>
            <li style={{backgroundColor:"#fff"}} className="list-group-item"><strong>Data Protection</strong>: We do <strong>not</strong> sell, rent, or trade your data.</li>
            </ul>
        </section>

        <section className="mb-5">
            <h2 style={{color:"#010659"}} className="h4">5. Data Security</h2>
            <p>
            We implement security measures to protect your information. While we strive to safeguard data,
            no online transmission is completely secure. Please take caution when sharing personal details online.
            </p>
        </section>

        <section className="mb-5">
            <h2 style={{color:"#010659"}} className="h4">6. Your Rights</h2>
            <p>You have the right to:</p>
            <ul className="list-unstyled ms-3">
            <li>• Request access to the data we hold about you.</li>
            <li>• Correct inaccurate information.</li>
            <li>• Request data deletion (subject to legal requirements).</li>
            <li>• Opt out of marketing communications.</li>
            </ul>
            <p>
            To exercise your rights, contact us at:{" "}
            <a href="mailto:support@rsexpressparking.com"><strong>support@rsexpressparking.com</strong></a>
            </p>
        </section>

        <section className="mb-5">
            <h2 style={{color:"#010659"}} className="h4">7. Cookies & Tracking Technologies</h2>
            <p>
            Our website uses cookies to enhance user experience and analyze traffic.
            You can manage cookie preferences through your browser settings.
            </p>
        </section>

        <section className="mb-5">
            <h2 style={{color:"#010659"}} className="h4">8. Policy Updates</h2>
            <p>
            We may update this policy periodically. Updates will be posted on our site.
            Continued use implies acceptance of changes.
            </p>
        </section>

        <section>
            <h2 style={{color:"#010659"}} className="h4">9. Contact Us</h2>
            <p><strong>Phone:</strong> <a href="tel:+35319640011">+353 1 964 0011</a></p>
            <p><strong>Phone:</strong> <a href="tel:+353834896505">+353 83 489 6505</a></p>
            <p><strong>Email:</strong> <a href="mailto:support@rsexpressparking.com"><strong>support@rsexpressparking.com</strong></a></p>
        </section>
        </div>
    </div>
    </>
  );
};

export default PrivacyPolicy;
