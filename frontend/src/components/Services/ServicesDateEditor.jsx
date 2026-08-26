import { useEffect, useState } from "react";
import customFetch from "../../auth/fetch";
import { useBooking } from "../../context/BookingContext";
import {
  normalizeBookingDates,
  updateBookingDateField,
  validateBookingDates,
} from "../../utils/bookingDates";
import BookingDateFields from "../HomePage/BookingDateFields";
import PopupDialog from "../Utility/PopupDialog";
import { formatIrishDate } from "../../utils/irishDate";
import "../HomePage/BookingDatesForm.css";

const ServicesDateEditor = () => {
  const { bookingData, setBookingData } = useBooking();
  const [formData, setFormData] = useState(() => normalizeBookingDates(bookingData?.bookingDates));
  const [minHours, setMinHours] = useState(4);
  const [popupMessage, setPopupMessage] = useState("");
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [updatedDays, setUpdatedDays] = useState(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  const appliedDates = normalizeBookingDates(bookingData?.bookingDates);
  const hasAppliedDates = Object.values(appliedDates).every(Boolean);
  const appliedDatesLabel = hasAppliedDates
    ? `${formatIrishDate(appliedDates.parkingFromDate).slice(0, 5)} ${appliedDates.parkingFromTime} – ${formatIrishDate(appliedDates.carCollectionDate).slice(0, 5)} ${appliedDates.carCollectionTime}`
    : "No dates selected";

  useEffect(() => {
    const controller = new AbortController();

    const loadBookingSettings = async () => {
      try {
        const response = await customFetch(
          `${import.meta.env.VITE_API_BASE_URL}/core/booking-settings/`,
          { signal: controller.signal },
        );
        if (!response?.ok) return;
        const data = await response.json();
        setMinHours(data.min_hours_before_booking || 4);
      } catch (error) {
        if (error.name !== "AbortError") {
          console.error("Error fetching booking settings:", error);
        }
      }
    };

    loadBookingSettings();
    return () => controller.abort();
  }, []);

  const handleChange = ({ target: { name, value } }) => {
    setUpdatedDays(null);
    setFormData((previous) => updateBookingDateField(previous, name, value));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const validation = validateBookingDates(formData, minHours);

    if (validation.error) {
      setPopupMessage(validation.error);
      setIsPopupOpen(true);
      return;
    }

    setBookingData((previous) => ({
      ...previous,
      bookingJourneyId: previous.bookingJourneyId || window.crypto.randomUUID(),
      bookingDates: { ...formData },
      paymentDetails: {
        ...(previous.paymentDetails || {}),
        noOfDays: validation.noOfDays,
      },
    }));
    setUpdatedDays(validation.noOfDays);
    setIsEditorOpen(false);
  };

  return (
    <section className="services-date-editor" aria-labelledby="services-date-heading">
      <div className="services-date-editor-heading">
        <div>
          <h2 id="services-date-heading">Your parking dates</h2>
          <p>Adjust your trip and update all parking prices below.</p>
        </div>
      </div>

      <button
        type="button"
        className="services-date-mobile-toggle"
        aria-expanded={isEditorOpen}
        aria-controls="services-date-editor-form"
        onClick={() => setIsEditorOpen((current) => !current)}
      >
        <span className="services-date-mobile-summary">
          <span>Parking dates</span>
          <strong>{appliedDatesLabel}</strong>
        </span>
        <span className="services-date-mobile-action">
          {isEditorOpen ? "Close" : hasAppliedDates ? "Change date/time" : "Select date/time"}
        </span>
      </button>

      <form
        id="services-date-editor-form"
        className={`services-date-editor-form${isEditorOpen ? " is-open" : ""}`}
        onSubmit={handleSubmit}
        noValidate
      >
        <BookingDateFields
          value={formData}
          onChange={handleChange}
          idPrefix="services-booking"
          required={false}
        />
        <div className="services-date-editor-actions">
          <button type="submit" className="btn-modern services-update-prices">
            Update Prices
          </button>
          <span className="services-date-update-status" aria-live="polite">
            {updatedDays ? `Prices updated for ${updatedDays} day${updatedDays === 1 ? "" : "s"}.` : ""}
          </span>
        </div>
      </form>

      <PopupDialog
        isOpen={isPopupOpen}
        onClose={() => setIsPopupOpen(false)}
        title="Invalid Parking Time"
        message={popupMessage}
      />
    </section>
  );
};

export default ServicesDateEditor;
