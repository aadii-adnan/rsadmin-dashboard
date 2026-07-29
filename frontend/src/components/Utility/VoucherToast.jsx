import { useEffect, useState } from "react";

const PROMO_SESSION_KEY = "rse_dubrs5_promo_shown";

function VoucherToast() {
  const [visible, setVisible] = useState(() => {
    try {
      return sessionStorage.getItem(PROMO_SESSION_KEY) !== "1";
    } catch {
      return true;
    }
  });

  useEffect(() => {
    if (!visible) return undefined;
    try {
      sessionStorage.setItem(PROMO_SESSION_KEY, "1");
    } catch {
      // Session storage can be unavailable in privacy modes.
    }
    const timer = window.setTimeout(() => setVisible(false), 10000);
    return () => window.clearTimeout(timer);
  }, [visible]);

  if (!visible) return null;

  return (
    <aside
      className="voucher-toast"
      aria-label="Promotional offer"
      data-clarity-id="dubrs5-promo"
    >
      <span>
        Use promo code <strong>DUBRS5</strong>
      </span>
      <button
        type="button"
        onClick={() => setVisible(false)}
        aria-label="Dismiss promotional offer"
      >
        ×
      </button>
    </aside>
  );
}

export default VoucherToast;
