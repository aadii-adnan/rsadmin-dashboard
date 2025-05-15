import React from 'react';

const ServiceShimmer = () => {
  return (
    <div className="service-card shimmer-card">
      <div className="service-card-image shimmer-image">
        <div className="shimmer-effect"></div>
      </div>
      <div className="service-card-details">
        <div className="shimmer-title">
          <div className="shimmer-effect"></div>
        </div>
        <div className="shimmer-text">
          <div className="shimmer-effect"></div>
          <div className="shimmer-effect"></div>
          <div className="shimmer-effect"></div>
        </div>
      </div>
      <div className="service-card-actions">
        <div className="shimmer-price">
          <div className="shimmer-effect"></div>
        </div>
        <div className="shimmer-buttons">
          <div className="shimmer-button">
            <div className="shimmer-effect"></div>
          </div>
          <div className="shimmer-button">
            <div className="shimmer-effect"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServiceShimmer;