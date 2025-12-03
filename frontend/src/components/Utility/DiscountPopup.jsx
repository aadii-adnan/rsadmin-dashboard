import React, { useState, useEffect } from 'react';

const DiscountPopup = () => {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [code, setCode] = useState('');

  useEffect(() => {
    const already = localStorage.getItem('discount_popup_done');
    if (!already) {
      // Show after user interaction or 3s
      const timer = setTimeout(() => setOpen(true), 15000);
      return () => clearTimeout(timer);
    }
  }, []);

  const close = () => {
    setOpen(false);
    localStorage.setItem('discount_popup_done', '1');
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!email) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/core/discount-signup/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (res.ok) {
        setCode(data.discount_code);
        setSubmitted(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (!open) return null;

  return (
    <div style={styles.overlay} onClick={close}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button onClick={close} style={styles.closeBtn} aria-label="Close">×</button>
        
        {/* Replace dotlottie with simple emoji or CSS animation */}
        <div style={styles.emojiWrapper}>
          <div style={styles.emoji}>🚗💨</div>
        </div>

        <h2 style={styles.title}>Unlock a Special Discount!</h2>
        {!submitted && (
          <>
            <p style={styles.text}>
              Sign up now to receive a <strong>15% discount</strong> and be the first to receive exclusive offers.
            </p>
            <form onSubmit={submit} style={styles.form}>
              <input
                type="email"
                placeholder="Your Email Address"
                value={email}
                required
                onChange={(e) => setEmail(e.target.value)}
                style={styles.input}
              />
              <button type="submit" style={styles.button}>Claim My Discount</button>
            </form>
            <div style={styles.privacy}>We respect your privacy. No spam, ever.</div>
          </>
        )}
        {submitted && (
          <div style={styles.resultBox}>
            <p style={styles.successText}>Your 15% discount code:</p>
            <div style={styles.code}>{code}</div>
            <p style={styles.copyNote}>Use this coupon at checkout.</p>
            <button onClick={close} style={styles.doneBtn}>Got It</button>
          </div>
        )}
      </div>
    </div>
  );
};

const styles = {
  overlay: {
    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
    background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center',
    justifyContent: 'center', zIndex: 9999, animation: 'fadeIn 0.3s'
  },
  modal: {
    width: '100%', maxWidth: 420, background: '#fff', borderRadius: 18,
    padding: '42px 38px 32px', position: 'relative', fontFamily: 'Urbanist, sans-serif',
    boxShadow: '0 20px 40px rgba(0,0,0,0.15)', textAlign: 'center',
    animation: 'slideUp 0.3s'
  },
  closeBtn: {
    position: 'absolute', top: 12, right: 16, background: 'none', border: 'none',
    fontSize: 28, cursor: 'pointer', lineHeight: 1, color: '#666'
  },
  emojiWrapper: {
    marginBottom: 15
  },
  emoji: {
    fontSize: 64, animation: 'bounce 2s infinite'
  },
  title: {
    fontSize: 26, margin: '0 0 14px', fontWeight: 700, color: '#0d102f'
  },
  text: {
    fontSize: 14, color: '#4a4f67', lineHeight: 1.6, margin: '0 0 20px'
  },
  form: {
    display: 'flex', flexDirection: 'column', gap: 14
  },
  input: {
    padding: '14px 16px', borderRadius: 10, border: '1px solid #d9dce5',
    fontSize: 14, outline: 'none'
  },
  button: {
    background: '#14163d', color: '#fff', padding: '14px 16px',
    borderRadius: 10, border: 'none', fontSize: 15, fontWeight: 600,
    cursor: 'pointer', transition: 'transform 0.2s'
  },
  privacy: {
    marginTop: 14, fontSize: 11, color: '#6b6f82'
  },
  resultBox: {
    marginTop: 10
  },
  successText: {
    fontSize: 15, fontWeight: 600, color: '#14163d'
  },
  code: {
    margin: '14px auto', background: '#14163d', color: '#ffd233',
    padding: '12px 18px', fontSize: 20, fontWeight: 700, letterSpacing: 2,
    borderRadius: 12, display: 'inline-block'
  },
  copyNote: {
    fontSize: 12, color: '#4a4f67'
  },
  doneBtn: {
    marginTop: 18, background: '#ffd233', color: '#14163d',
    padding: '12px 16px', border: 'none', borderRadius: 10,
    fontSize: 14, fontWeight: 600, cursor: 'pointer'
  }
};

export default DiscountPopup;