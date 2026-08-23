import React, { useEffect, useRef, useState } from 'react';
import { useBooking } from "../../context/BookingContext";
import customFetch from "../../auth/fetch";
import { clearAttribution, getAttribution } from "../../utils/attribution";
import {
  BOOKING_FIELD_LABELS,
  normalizeBookingSubmissionError,
  parseBookingErrorResponse,
} from "../../utils/bookingSubmissionErrors";
import { PhoneInput } from 'react-international-phone';
import 'react-international-phone/style.css';

const Step1BookingForm = ({ labelStyle, inputStyle, formData, handleChange, nextButtonStyle, goNext, goBack, prevButtonStyle, contactNo, setContactNo, serviceDetails, couponId, discountedPrice, totalPrice, statuses, setFormData, selectedAddOns, addOnsDetails }) => {
  const [submissionError, setSubmissionError] = useState({
    fieldErrors: {},
    summaryMessages: [],
  });
  const [loading, setLoading] = useState(false); // Loading state while creating the booking
  const submissionLockRef = useRef(false);
  const formCardRef = useRef(null);
  const errorSummaryRef = useRef(null);
  const {
    bookingData,
    setBookingData,
    bookingData: { bookingDates: { parkingFromDate, parkingFromTime, carCollectionDate, carCollectionTime }, userDetails },
  } = useBooking();

  useEffect(() => {
    window.scrollTo(0, 300)
  }, []);

  const showSubmissionError = (nextError) => {
    setSubmissionError(nextError);

    window.requestAnimationFrame(() => {
      const firstInvalidField = Object.keys(nextError.fieldErrors)
        .map((fieldName) => formCardRef.current?.querySelector(`[name="${fieldName}"]`))
        .find(Boolean);

      if (firstInvalidField) {
        firstInvalidField.focus();
        firstInvalidField.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }

      errorSummaryRef.current?.focus();
      errorSummaryRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  };

  const clearFieldError = (fieldName) => {
    setSubmissionError((currentError) => {
      if (!currentError.fieldErrors[fieldName]) return currentError;

      const nextFieldErrors = { ...currentError.fieldErrors };
      delete nextFieldErrors[fieldName];
      return { ...currentError, fieldErrors: nextFieldErrors };
    });
  };

  const handleFieldChange = (event) => {
    clearFieldError(event.target.name);
    handleChange(event);
  };

  const fieldErrorProps = (fieldName) => {
    const hasError = Boolean(submissionError.fieldErrors[fieldName]?.length);
    return {
      "aria-invalid": hasError,
      "aria-describedby": hasError ? `${fieldName}-error` : undefined,
    };
  };

  const renderFieldError = (fieldName) => {
    const messages = submissionError.fieldErrors[fieldName];
    if (!messages?.length) return null;

    return (
      <p className="booking-field-error" id={`${fieldName}-error`}>
        {messages.join(" ")}
      </p>
    );
  };

  const validateInputs = () => {
    const fieldErrors = {};
    const summaryMessages = [];
    const requiredFields = {
      car_registration_no: "Enter your car registration.",
      car_model: "Enter your car model.",
      car_colour: "Enter your car color.",
      car_manufacturer: "Enter your car manufacturer.",
      departure_terminal: "Select a departure terminal.",
      return_terminal: "Select a return terminal.",
    };

    if (bookingData?.userDetails?.id) {
      Object.assign(requiredFields, {
        first_name: "Enter your first name.",
        last_name: "Enter your last name.",
        email: "Enter your email address.",
        contact_no: "Enter your contact number.",
      });
    }

    Object.entries(requiredFields).forEach(([fieldName, message]) => {
      const value = fieldName === "contact_no" ? contactNo : formData[fieldName];
      if (!String(value ?? "").trim()) {
        fieldErrors[fieldName] = [message];
      }
    });

    if (
      !fieldErrors.email &&
      formData.email &&
      !/^\S+@\S+\.\S+$/.test(formData.email.trim())
    ) {
      fieldErrors.email = ["Enter a valid email address, such as name@example.com."];
    }

    if (
      !fieldErrors.contact_no &&
      bookingData?.userDetails?.id &&
      contactNo.replace(/\D/g, "").length < 7
    ) {
      fieldErrors.contact_no = ["Enter a valid contact number including the country code."];
    }

    if (!parkingFromDate || !parkingFromTime || !carCollectionDate || !carCollectionTime) {
      summaryMessages.push(
        "Your booking dates or times are missing. Return to the home page, select them again, and retry your booking.",
      );
    }

    if (totalPrice <= 0) {
      summaryMessages.push(
        "The booking price could not be calculated. Return to the home page, select your dates and service again, then retry.",
      );
    }

    if (!serviceDetails?.id || !statuses.length) {
      summaryMessages.push(
        "The booking options are still loading. Wait a moment and try again.",
      );
    }

    const validationError = { fieldErrors, summaryMessages };
    if (Object.keys(fieldErrors).length || summaryMessages.length) {
      showSubmissionError(validationError);
      return false;
    }

    setSubmissionError({ fieldErrors: {}, summaryMessages: [] });
    return true;
  };

  const updateBookingUserStatus = async (bookingUserId) => {
    if (!bookingUserId) return;
    try {
      await customFetch(
        `${import.meta.env.VITE_API_BASE_URL}/bookings/booking-user/${bookingUserId}/status/`,
        {
          method: "PUT",
          body: { booking_completion_status: true },
        }
      );
    } catch (err) {
      console.error("Failed to update booking user status", err);
    }
  };

  // Create/update the booking record, then advance to payment.
  // (The previous "Add Ons" step is skipped, so booking creation happens here.)
  const handleBooking = async () => {
    try {
      const statusId = statuses.find((status) => status.name === formData.status_name && status.type === "booking")?.id;

      if (!statusId) {
        showSubmissionError({
          fieldErrors: {},
          summaryMessages: [
            "The booking options have not finished loading. Wait a moment and try again.",
          ],
        });
        return;
      }

      if (!parkingFromDate || !carCollectionDate) {
        showSubmissionError({
          fieldErrors: {},
          summaryMessages: [
            "Your booking dates are missing. Return to the home page, select them again, and retry your booking.",
          ],
        });
        return;
      }

      const bookingPayload = {
        ...formData,
        service: serviceDetails.id,
        user: userDetails?.id,
        booking_user: formData.booking_user_id || null,
        contact_no: contactNo,
        departure_time: parkingFromDate + " " + parkingFromTime,
        return_time: carCollectionDate + " " + carCollectionTime,
        coupon: couponId,
        discounted_price: discountedPrice == 0 ? totalPrice.toFixed(2) : discountedPrice.toFixed(2),
        total_price: totalPrice.toFixed(2),
        status: statusId,
        website: "rsexpressparking",
        add_ons: selectedAddOns,
      };

      let response, data;
      const isNewBooking = !formData.booking_id;
      if (formData.booking_id) {
        // Update existing booking
        response = await customFetch(
          `${import.meta.env.VITE_API_BASE_URL}/bookings/${formData.booking_id}/`,
          {
            method: "PUT",
            body: bookingPayload,
          }
        );
      } else {
        // Create new booking — attach first-touch marketing attribution (create only)
        response = await customFetch(`${import.meta.env.VITE_API_BASE_URL}/bookings/`, {
          method: "POST",
          headers: {
            ...(bookingData.bookingJourneyId
              ? { "Idempotency-Key": bookingData.bookingJourneyId }
              : {}),
          },
          body: { ...bookingPayload, ...getAttribution() },
        });
      }

      if (!response) return;

      if (response.ok) {
        data = await response.json();
        if (isNewBooking) {
          clearAttribution();
        }
        setFormData((prev) => ({
          ...prev,
          booking_id: data.id,
        }));
        setBookingData((prev) => ({
          ...prev,
          bookingDetails: {
            ...prev.bookingDetails,
            booking_id: data.id,
            booking_unique_id: data?.booking_id,
            total_price: totalPrice,
          },
          carFlightDetails: {
            ...prev.carFlightDetails,
            addOnsDetails: addOnsDetails,
          },
        }));
        if (formData.booking_user_id) {
          await updateBookingUserStatus(formData.booking_user_id);
        }
        goNext();
      } else {
        showSubmissionError(await parseBookingErrorResponse(response));
      }
    } catch (error) {
      console.error("Error creating/updating booking:", error);
      showSubmissionError(
        normalizeBookingSubmissionError(null, {
          networkError: error instanceof TypeError,
        }),
      );
    }
  };

  // Handle Next button click
  const handleNext = async () => {
    if (submissionLockRef.current) return;
    submissionLockRef.current = true;
    if (!validateInputs()) {
      submissionLockRef.current = false;
      return;
    }
    setLoading(true);
    try {
      await handleBooking(); // Creates the booking and advances on success
    } finally {
      setLoading(false);
      submissionLockRef.current = false;
    }
  };

  const errorSummaryItems = [
    ...Object.entries(submissionError.fieldErrors).flatMap(([fieldName, messages]) =>
      messages.map((message) => `${BOOKING_FIELD_LABELS[fieldName] || fieldName}: ${message}`),
    ),
    ...submissionError.summaryMessages,
  ];

  return (
    <div>
    <fieldset className="fieldset active">
      <div className="form-card" ref={formCardRef}>
        <h2 style={{ fontSize: "20px", fontWeight: "bold", color: "#010659", marginBottom: "20px" }}>Car Details:</h2>
        {errorSummaryItems.length > 0 && (
          <div
            className="booking-error-summary"
            ref={errorSummaryRef}
            role="alert"
            aria-live="assertive"
            tabIndex={-1}
          >
            <h3>We couldn&apos;t save your booking</h3>
            <p>
              {Object.keys(submissionError.fieldErrors).length
                ? "Please correct the highlighted fields and try again."
                : "Please follow the guidance below and try again."}
            </p>
            <ul>
              {errorSummaryItems.map((message, index) => (
                <li key={`${index}-${message}`}>{message}</li>
              ))}
            </ul>
          </div>
        )}
        <div className="bookingform-row">
            <div  className="bookingform-col">
                <label htmlFor="car_registration_no" style={labelStyle}>Car Registration: *</label>
                <input
                className="booking-field-input"
                id="car_registration_no"
                type="text"
                name="car_registration_no"
                placeholder="Registration No"
                style={inputStyle}
                value={formData?.car_registration_no}
                onChange={handleFieldChange}
                {...fieldErrorProps("car_registration_no")}
                required
                />
                {renderFieldError("car_registration_no")}
            </div>
            <div  className="bookingform-col">
                <label htmlFor="car_model" style={labelStyle}>Car Model: *</label>
                <input
                className="booking-field-input"
                id="car_model"
                type="text"
                name="car_model"
                placeholder="Model"
                style={inputStyle}
                value={formData?.car_model}
                onChange={handleFieldChange}
                {...fieldErrorProps("car_model")}
                required
                />
                {renderFieldError("car_model")}
            </div>
        </div>
        <div className="bookingform-row">
            <div  className="bookingform-col">
                <label htmlFor="car_colour" style={labelStyle}>Car Color: *</label>
                <input
                className="booking-field-input"
                id="car_colour"
                type="text"
                name="car_colour"
                placeholder="Color"
                style={inputStyle}
                value={formData?.car_colour}
                onChange={handleFieldChange}
                {...fieldErrorProps("car_colour")}
                required
                />
                {renderFieldError("car_colour")}
            </div>
            <div  className="bookingform-col">
                <label htmlFor="car_manufacturer" style={labelStyle}>Car Manufacturer: *</label>
                <input
                className="booking-field-input"
                id="car_manufacturer"
                type="text"
                name="car_manufacturer"
                placeholder="Manufacturer"
                style={inputStyle}
                value={formData?.car_manufacturer}
                onChange={handleFieldChange}
                {...fieldErrorProps("car_manufacturer")}
                required
                />
                {renderFieldError("car_manufacturer")}
            </div>
        </div>

        <div className="bookingform-row">
          <div className="bookingform-col">
            <label htmlFor="total_passengers" style={labelStyle}>Total Passengers:</label>
            <input className='custom-input booking-field-input' id="total_passengers" type="number" name="total_passengers" placeholder="Passengers" style={inputStyle} min={0} value={formData?.total_passengers} onChange={e=>{
              const val = Number(e.target.value);
              if(val < 0) return;
              handleFieldChange(e);
            }} {...fieldErrorProps("total_passengers")}/>
            {renderFieldError("total_passengers")}
          </div>
        </div>

        <div className="bookingform-row">
            <div className="col-7">
                <h2 className="fs-title" style={{ fontSize: "20px", fontWeight: "bold", color: "#010659", marginBottom: "20px", marginTop: "20px" }}>
                Flight Details:
                </h2>
            </div>                       
        </div>
        <div className="bookingform-row">
            <div className="bookingform-col">
                <label htmlFor="departure_terminal" style={labelStyle}>Departure Terminal: *</label>
                <select
                  className='custom-input booking-field-input'
                  id="departure_terminal"
                  name="departure_terminal"
                  style={inputStyle}
                  value={formData?.departure_terminal ?? ''}
                  onChange={handleFieldChange}
                  {...fieldErrorProps("departure_terminal")}
                  required
                >
                  <option value="">Select Terminal</option>
                  <option value="1">Terminal 1</option>
                  <option value="2">Terminal 2</option>
                </select>
                {renderFieldError("departure_terminal")}
            </div>
            <div className="bookingform-col">
                <label htmlFor="return_terminal" style={labelStyle}>Return Terminal: *</label>
                <select
                  className='custom-input booking-field-input'
                  id="return_terminal"
                  name="return_terminal"
                  style={inputStyle}
                  value={formData?.return_terminal ?? ''}
                  onChange={handleFieldChange}
                  {...fieldErrorProps("return_terminal")}
                  required
                >
                  <option value="">Select Terminal</option>
                  <option value="1">Terminal 1</option>
                  <option value="2">Terminal 2</option>
                </select>
                {renderFieldError("return_terminal")}
            </div>
        </div>

        <div className="bookingform-row">
          <div className="bookingform-col">
              <label htmlFor="departure_flight_number" style={labelStyle}>Departure Flight Number:</label>
              <input className='custom-input booking-field-input'
              id="departure_flight_number"
              type="text"
              name="departure_flight_number"
              placeholder="Dep Flight Number"
              style={inputStyle}
              value={formData?.departure_flight_number}
              onChange={handleFieldChange}
              {...fieldErrorProps("departure_flight_number")}
              />
              {renderFieldError("departure_flight_number")}
          </div>
          <div className="bookingform-col">
              <label htmlFor="return_flight_number" style={labelStyle}>Return Flight Number:</label>
              <input className='custom-input booking-field-input'
              id="return_flight_number"
              type="text"
              name="return_flight_number"
              placeholder="Ret Flight Number"
              style={inputStyle}
              value={formData?.return_flight_number}
              onChange={handleFieldChange}
              {...fieldErrorProps("return_flight_number")}
              />
              {renderFieldError("return_flight_number")}
          </div>
        </div>  

          {bookingData?.userDetails?.id && <>
             
            <div className="bookingform-row">
                  <div className="col-7">
                      <h2 className="fs-title" style={{ fontSize: "20px", fontWeight: "bold", color: "#010659", marginBottom: "20px" }}>
                      Your Details:
                      </h2>
                  </div>                       
              </div>

              <div className="bookingform-row">
                  <div className="bookingform-col" style={{ width: "50%", paddingRight: "10px" }}>
                      <label htmlFor="first_name" style={labelStyle}>First Name: *</label>
                      <input className='custom-input booking-field-input'
                      id="first_name"
                      type="text"
                      name="first_name"
                      placeholder="First Name"
                      style={inputStyle}
                      value={formData?.first_name}
                      onChange={handleFieldChange}
                      {...fieldErrorProps("first_name")}
                      required
                      />
                      {renderFieldError("first_name")}
                  </div>
                  <div className="bookingform-col" style={{ width: "50%", paddingLeft: "10px" }}>
                      <label htmlFor="last_name" style={labelStyle}>Last Name: *</label>
                      <input className='custom-input booking-field-input'
                      id="last_name"
                      type="text"
                      name="last_name"
                      placeholder="Last Name"
                      style={inputStyle}
                      value={formData?.last_name}
                      onChange={handleFieldChange}
                      {...fieldErrorProps("last_name")}
                      required
                      />
                      {renderFieldError("last_name")}
                  </div>
              </div>

              <div className="bookingform-row">
                  <div className="bookingform-col" style={{ width: "50%", paddingRight: "10px" }}>
                      <label htmlFor="email" style={labelStyle}>Email: *</label>
                      <input className='custom-input booking-field-input'
                      id="email"
                      type="email"
                      name="email"
                      placeholder="Email Id"
                      style={inputStyle}
                      value={formData?.email}
                      onChange={handleFieldChange}
                      {...fieldErrorProps("email")}
                      required
                      />
                      {renderFieldError("email")}
                  </div>
                  <div className="bookingform-col" style={{ width: "50%", paddingLeft: "10px", marginBottom: "10px" }}>
                      <label htmlFor="contact_no" style={labelStyle}>Contact No: *</label>
                      <PhoneInput
                      defaultCountry="ie"
                      value={contactNo}
                      onChange={(phone) => {
                        clearFieldError("contact_no");
                        setContactNo(phone);
                      }}
                      inputClassName="booking-field-input"
                      inputProps={{
                        id: "contact_no",
                        name: "contact_no",
                        ...fieldErrorProps("contact_no"),
                      }}
                      />
                      {renderFieldError("contact_no")}
                  </div>
              </div>
            </>}
           
      </div>
      <input type="button" className="next action-button" value={loading ? "loading..." : "Next"} onClick={handleNext} disabled={loading} style={nextButtonStyle} />
      {!bookingData?.userDetails?.id && <input type="button" className="previous action-button-previous" value="Back" onClick={goBack} style={prevButtonStyle} />}
    </fieldset>
    </div>
  );
};

export default Step1BookingForm;
