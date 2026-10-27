export const catalogDefaults = {
  services: { name: "", slug: "", description: "", long_description: "", is_featured: false, base_price: "0.00", per_day_price: "0.00", order: 1, enabled: true, website: "both" },
  addons: { name: "", price: "0.00", description: "", active: true },
  coupons: { code: "", discount_percent: 10, active: true, valid_from: "", valid_to: "", lifetime: false, max_uses: 1, minimum_order_value: "0.00" },
  statuses: { name: "", type: "booking" },
};

export const bookingSettingDefaults = { min_hours_before_booking: 4, manager_emails: "", dublin_manager_emails: "", promotional_email_content: "", pending_bookings_email_content: "", dublin_promotional_email_content: "", dublin_pending_bookings_email_content: "", social_media_email_content: "" };
export const catalogTabs = ["services", "addons", "coupons", "statuses"];
export const label = (key) => key.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
export const toLocalInput = (value) => value ? String(value).slice(0, 16) : "";
export const formValuesFor = (tab, item = {}) => ({ ...(tab === "settings" ? bookingSettingDefaults : catalogDefaults[tab]), ...item, valid_from: toLocalInput(item.valid_from), valid_to: toLocalInput(item.valid_to) });
export function normalizeCatalogValues(tab, values) { const data = { ...values }; if (tab === "coupons") { data.valid_from = data.valid_from ? new Date(data.valid_from).toISOString() : data.valid_from; data.valid_to = data.valid_to ? new Date(data.valid_to).toISOString() : null; } return data; }
