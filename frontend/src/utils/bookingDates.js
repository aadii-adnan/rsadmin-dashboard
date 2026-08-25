import { DateTime } from "luxon";

export const DUBLIN_TIME_ZONE = "Europe/Dublin";

export const EMPTY_BOOKING_DATES = Object.freeze({
  parkingFromDate: "",
  parkingFromTime: "",
  carCollectionDate: "",
  carCollectionTime: "",
});

export function normalizeBookingDates(value) {
  return {
    ...EMPTY_BOOKING_DATES,
    ...(value || {}),
  };
}

export function updateBookingDateField(previous, name, value) {
  const next = {
    ...previous,
    [name]: value,
  };

  if (
    name === "parkingFromDate" &&
    previous.carCollectionDate &&
    (!value || previous.carCollectionDate < value)
  ) {
    next.carCollectionDate = "";
  }

  return next;
}

export function calculateParkingDays({ parkingFromDate, carCollectionDate }) {
  const fromDate = DateTime.fromISO(parkingFromDate || "", { zone: DUBLIN_TIME_ZONE }).startOf("day");
  const collectionDate = DateTime.fromISO(carCollectionDate || "", { zone: DUBLIN_TIME_ZONE }).startOf("day");

  if (!fromDate.isValid || !collectionDate.isValid || collectionDate < fromDate) {
    return 0;
  }

  return Math.round(collectionDate.diff(fromDate, "days").days) + 1;
}

export function validateBookingDates(values, minHours = 4, now = DateTime.now()) {
  const dates = normalizeBookingDates(values);

  if (Object.values(dates).some((value) => !value)) {
    return {
      error: "Please select both drop-off and pickup dates and times.",
      noOfDays: 0,
    };
  }

  const dublinNow = DateTime.isDateTime(now)
    ? now.setZone(DUBLIN_TIME_ZONE)
    : DateTime.fromJSDate(now, { zone: DUBLIN_TIME_ZONE });
  const parkingFromDateTime = DateTime.fromISO(
    `${dates.parkingFromDate}T${dates.parkingFromTime}`,
    { zone: DUBLIN_TIME_ZONE },
  );
  const carCollectionDateTime = DateTime.fromISO(
    `${dates.carCollectionDate}T${dates.carCollectionTime}`,
    { zone: DUBLIN_TIME_ZONE },
  );

  if (!parkingFromDateTime.isValid || !carCollectionDateTime.isValid) {
    return { error: "Please enter valid drop-off and pickup dates and times.", noOfDays: 0 };
  }

  if (
    parkingFromDateTime.diff(dublinNow, "hours").hours < minHours ||
    carCollectionDateTime.diff(dublinNow, "hours").hours < minHours
  ) {
    return {
      error: `Drop-off date and time must be at least ${minHours} hours from the current Dublin time.`,
      noOfDays: 0,
    };
  }

  if (parkingFromDateTime >= carCollectionDateTime) {
    return {
      error: "Pickup date and time must be after drop-off date and time.",
      noOfDays: 0,
    };
  }

  return {
    error: "",
    noOfDays: calculateParkingDays(dates),
  };
}
