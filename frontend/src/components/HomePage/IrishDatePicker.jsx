import { useEffect, useRef, useState } from "react";
import { DayPicker } from "react-day-picker";
import { enGB } from "react-day-picker/locale";
import "react-day-picker/style.css";
import {
  dateToIsoDate,
  formatIrishDate,
  isIsoDateOnOrAfter,
  isoDateToLocalDate,
  parseIrishDate,
} from "../../utils/irishDate";

const IrishDatePicker = ({
  id,
  name,
  label,
  value,
  minimum,
  onChange,
  analyticsId,
  required = false,
}) => {
  const [displayValue, setDisplayValue] = useState(() => formatIrishDate(value));
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState("");
  const wrapperRef = useRef(null);
  const lastEmittedValueRef = useRef(undefined);

  useEffect(() => {
    if (value === lastEmittedValueRef.current) {
      lastEmittedValueRef.current = undefined;
      return;
    }
    setDisplayValue(formatIrishDate(value));
    setError("");
  }, [value]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const closeOnOutsidePointer = (event) => {
      if (!wrapperRef.current?.contains(event.target)) setIsOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen]);

  const emitIsoValue = (isoValue) => {
    lastEmittedValueRef.current = isoValue;
    onChange({ target: { name, value: isoValue } });
  };

  const validateAndCommit = (rawValue) => {
    if (!rawValue.trim()) {
      setError(required ? `${label} is required.` : "");
      emitIsoValue("");
      return false;
    }

    const parsed = parseIrishDate(rawValue);
    if (!parsed) {
      setError("Enter a valid date in dd/mm/yyyy format.");
      return false;
    }
    if (minimum && !isIsoDateOnOrAfter(parsed, minimum)) {
      setError(`${label} cannot be before ${formatIrishDate(minimum)}.`);
      return false;
    }

    setDisplayValue(formatIrishDate(parsed));
    setError("");
    emitIsoValue(parsed);
    return true;
  };

  const handleTextChange = (event) => {
    const rawValue = event.target.value.replace(/[^\d/]/g, "").slice(0, 10);
    setDisplayValue(rawValue);
    setError("");

    if (rawValue.length === 10) {
      if (!validateAndCommit(rawValue)) emitIsoValue("");
    } else {
      emitIsoValue("");
    }
  };

  const handleSelect = (selectedDate) => {
    if (!selectedDate) return;
    const isoValue = dateToIsoDate(selectedDate);
    setDisplayValue(formatIrishDate(isoValue));
    setError("");
    emitIsoValue(isoValue);
    setIsOpen(false);
  };

  const handleOpenKeyDown = (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setIsOpen(true);
    }
  };

  const minimumDate = isoDateToLocalDate(minimum);
  const selectedDate = isoDateToLocalDate(value);
  const errorId = `${id}-error`;

  return (
    <div
      className="irish-date-picker"
      ref={wrapperRef}
      data-clarity-id={`${analyticsId}-wrapper`}
    >
      <label htmlFor={id}>{label}:</label>
      <div className="irish-date-input-wrap">
        <input
          type="text"
          id={id}
          name={name}
          value={displayValue}
          placeholder="dd/mm/yyyy"
          inputMode="numeric"
          autoComplete="off"
          required={required}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          data-clarity-id={analyticsId}
          onChange={handleTextChange}
          onBlur={() => validateAndCommit(displayValue)}
          onClick={() => setIsOpen(true)}
          onKeyDown={handleOpenKeyDown}
        />
        <button
          type="button"
          className="irish-date-trigger"
          aria-label={`Open ${label.toLowerCase()} calendar`}
          aria-controls={`${id}-calendar`}
          aria-expanded={isOpen}
          onClick={() => setIsOpen((current) => !current)}
        >
          <span aria-hidden="true">Calendar</span>
        </button>
      </div>
      {error ? (
        <div
          id={errorId}
          className="irish-date-error"
          role="alert"
          data-clarity-id={`${analyticsId}-error`}
        >
          {error}
        </div>
      ) : null}
      {isOpen ? (
        <div id={`${id}-calendar`} className="irish-date-popover">
          <DayPicker
            mode="single"
            selected={selectedDate}
            defaultMonth={selectedDate || minimumDate}
            onSelect={handleSelect}
            disabled={minimumDate ? { before: minimumDate } : undefined}
            locale={enGB}
            weekStartsOn={1}
            role="dialog"
            aria-label={`${label} calendar`}
            autoFocus
          />
        </div>
      ) : null}
    </div>
  );
};

export default IrishDatePicker;
