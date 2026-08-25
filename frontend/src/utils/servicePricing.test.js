import test from "node:test";
import assert from "node:assert/strict";
import { calculateServicePrice } from "./servicePricing.js";

const service = {
  base_price: "20.00",
  per_day_price: "8.50",
};

test("service price responds to the selected parking duration", () => {
  assert.deepEqual(calculateServicePrice(service, { noOfDays: 2 }), {
    hasPrice: true,
    price: 37,
    amountSaved: 0,
    discountPercentage: 0,
  });
  assert.equal(calculateServicePrice(service, { noOfDays: 5 }).price, 62.5);
});

test("service price and savings include the active coupon discount", () => {
  assert.deepEqual(calculateServicePrice(service, { noOfDays: 2, discount: 10 }), {
    hasPrice: true,
    price: 33.3,
    amountSaved: 3.7,
    discountPercentage: 10,
  });
});

test("service price is withheld until booking dates provide a duration", () => {
  assert.deepEqual(calculateServicePrice(service, {}), {
    hasPrice: false,
    price: 0,
    amountSaved: 0,
    discountPercentage: 0,
  });
});
