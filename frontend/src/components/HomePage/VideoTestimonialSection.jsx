import React, { useState } from 'react';
import { FaPlay } from 'react-icons/fa';
import '../../VideoTestimonialSection.css';

/**
 * VideoTestimonialSection Component
 * 
 * Uses the Facade Pattern (Click-to-Load) for performance optimization.
 * Videos are only loaded when the user clicks to play, avoiding
 * impact on Core Web Vitals and initial page load speed.
 * 
 * Features:
 * - Glassmorphism design with frosted glass cards
 * - CSS-only pulse animation on play button
 * - Hover lift effect with glowing shadow
 * - No heavy animation libraries (Framer Motion, GSAP)
 * 
 * @param {Array} testimonials - Array of video testimonial objects
 *   Each object should have: { id, videoUrl, thumbnailUrl, title }
 */

// Default testimonials - can be overridden via props
const defaultTestimonials = [
    {
        id: 1,
        videoUrl: '/videos/revieww_1.mp4',
        thumbnailUrl: '/videos/thumb1.webp',
        title: 'Customer Video Review 1',
    },
    {
        id: 2,
        videoUrl: '/videos/revieww_2.mp4',
        thumbnailUrl: '/videos/thumb2.webp',
        title: 'Customer Video Review 2',
    },
];

const VideoCard = ({ videoUrl, thumbnailUrl, title }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handlePlayClick = () => {
        setIsLoading(true);
        setIsPlaying(true);
    };

    const handleVideoLoaded = () => {
        setIsLoading(false);
    };

    return (
        <div className="video-testimonial-card">
            {!isPlaying ? (
                // Facade: Thumbnail with glassmorphism overlay and animated play button
                <div 
                    className="video-facade"
                    onClick={handlePlayClick}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && handlePlayClick()}
                    aria-label={`Play ${title}`}
                >
                    <img 
                        src={thumbnailUrl} 
                        alt={title}
                        className="video-thumbnail"
                        loading="lazy"
                        decoding="async"
                    />
                    <div className="play-button-overlay">
                        <div className="play-button">
                            <FaPlay className="play-icon" />
                        </div>
                    </div>
                </div>
            ) : (
                // Actual video player - only rendered after click
                <div className="video-player-container">
                    {isLoading && (
                        <div className="video-loading-overlay">
                            <div className="video-loading-spinner"></div>
                        </div>
                    )}
                    <video
                        className="video-player"
                        src={videoUrl}
                        controls
                        autoPlay
                        playsInline
                        onLoadedData={handleVideoLoaded}
                        onCanPlay={handleVideoLoaded}
                    >
                        Your browser does not support the video tag.
                    </video>
                </div>
            )}
        </div>
    );
};

const VideoTestimonialSection = ({ 
    testimonials = defaultTestimonials,
    sectionTitle = "What Our Customers Say",
    sectionSubtitle = "Real experiences from real customers who trust us with their vehicles"
}) => {
    return (
        <section className="video-testimonial-section section-padding">
            <div className="container">
                <div className="section-header text-center">
                    <h2 className="section-title">{sectionTitle}</h2>
                    <p className="section-subtitle">{sectionSubtitle}</p>
                </div>
                
                <div className="video-testimonials-grid">
                    {testimonials.map((testimonial) => (
                        <VideoCard
                            key={testimonial.id}
                            videoUrl={testimonial.videoUrl}
                            thumbnailUrl={testimonial.thumbnailUrl}
                            title={testimonial.title}
                        />
                    ))}
                </div>
            </div>
        </section>
    );
};

export default VideoTestimonialSection;
