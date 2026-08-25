export function calculateServicePrice(service, paymentDetails) {
  const noOfDays = Number(paymentDetails?.noOfDays);
  if (!Number.isFinite(noOfDays) || noOfDays <= 0) {
    return {
      hasPrice: false,
      price: 0,
      amountSaved: 0,
      discountPercentage: 0,
    };
  }

  const basePrice = Number(service?.base_price) || 0;
  const perDayPrice = Number(service?.per_day_price) || 0;
  const discountPercentage = Number(paymentDetails?.discount) || 0;
  const subtotal = basePrice + perDayPrice * noOfDays;
  const amountSaved = discountPercentage > 0
    ? subtotal * (discountPercentage / 100)
    : 0;

  return {
    hasPrice: true,
    price: subtotal - amountSaved,
    amountSaved,
    discountPercentage,
  };
}
