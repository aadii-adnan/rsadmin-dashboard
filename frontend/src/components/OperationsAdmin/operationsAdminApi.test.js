import assert from "node:assert/strict";
import test from "node:test";

import { resources } from "./operationsAdminApi.js";

test("operations administration uses dedicated staff-only resource paths", () => {
  assert.equal(resources.services.path, "/services/staff/services/");
  assert.equal(resources.addons.path, "/services/staff/addons/");
  assert.equal(resources.coupons.path, "/services/staff/coupons/");
  assert.equal(resources.statuses.path, "/core/staff/statuses/");
});
