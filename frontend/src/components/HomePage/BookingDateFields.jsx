import { useState } from "react";
import IrishDatePicker from "./IrishDatePicker";
import { getDublinTodayIso } from "../../utils/irishDate";

const TIME_OPTIONS = Array.from({ length: 24 * 6 }, (_, index) => {
  const hour = Math.floor(index / 6).toString().padStart(2, "0");
  const minute = ((index % 6) * 10).toString().padStart(2, "0");
  return `${hour}:${minute}`;
});

const BookingDateFields = ({ value, onChange, idPrefix = "booking", required = true }) => {
  const [timeFormat, setTimeFormat] = useState("24");
  const today = getDublinTodayIso();

  const formatTimeLabel = (time24) => {
    if (timeFormat === "24") return time24;

    const [hourText, minute] = time24.split(":");
    const hour24 = Number(hourText);
    const hour12 = hour24 % 12 || 12;
    return `${hour12}:${minute} ${hour24 >= 12 ? "PM" : "AM"}`;
  };

  const fieldId = (name) => `${idPrefix}-${name}`;

  return (
    <>
      <div className="time-format-mobile">
        <span>Time</span>
        <select
          aria-label="Time format"
          value={timeFormat}
          onChange={(event) => setTimeFormat(event.target.value)}
        >
          <option value="24">24h</option>
          <option value="12">12h</option>
        </select>
      </div>

      <div className="time-format-desktop">
        <span>Time format:</span>
        <label>
          <input
            type="radio"
            name={`${idPrefix}-timeFormat`}
            value="24"
            checked={timeFormat === "24"}
            onChange={() => setTimeFormat("24")}
          />
          24-hour
        </label>
        <label>
          <input
            type="radio"
            name={`${idPrefix}-timeFormat`}
            value="12"
            checked={timeFormat === "12"}
            onChange={() => setTimeFormat("12")}
          />
          12-hour (AM/PM)
        </label>
      </div>

      <div className="booking-date-row">
        <div className="form-date">
          <IrishDatePicker
            id={fieldId("parkingFromDate")}
            name="parkingFromDate"
            label="Drop-off Date"
            value={value.parkingFromDate}
            minimum={today}
            onChange={onChange}
            analyticsId={fieldId("dropoff-date")}
            required={required}
          />
        </div>
        <div className="form-time">
          <label htmlFor={fieldId("parkingFromTime")}>Drop-off Time</label>
          <select
            id={fieldId("parkingFromTime")}
            name="parkingFromTime"
            value={value.parkingFromTime}
            onChange={onChange}
            required={required}
          >
            <option value="">Select time</option>
            {TIME_OPTIONS.map((time) => (
              <option key={time} value={time}>{formatTimeLabel(time)}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="booking-date-row">
        <div className="form-date">
          <IrishDatePicker
            id={fieldId("carCollectionDate")}
            name="carCollectionDate"
            label="Pickup Date"
            value={value.carCollectionDate}
            minimum={value.parkingFromDate || today}
            onChange={onChange}
            analyticsId={fieldId("pickup-date")}
            required={required}
          />
        </div>
        <div className="form-time">
          <label htmlFor={fieldId("carCollectionTime")}>Pickup Time</label>
          <select
            id={fieldId("carCollectionTime")}
            name="carCollectionTime"
            value={value.carCollectionTime}
            onChange={onChange}
            required={required}
          >
            <option value="">Select time</option>
            {TIME_OPTIONS.map((time) => (
              <option key={time} value={time}>{formatTimeLabel(time)}</option>
            ))}
          </select>
        </div>
      </div>
    </>
  );
};

export default BookingDateFields;
