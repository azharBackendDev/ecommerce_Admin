// services/otpStore.js
const createOtpStore = () => {
  const store = new Map(); // private

  const set = (key, otp, ttl = 5 * 60 * 1000) => {
    store.set(key, {
      otp,
      expiresAt: Date.now() + ttl,
    });
  };

  const verify = (key, otp) => {
    const data = store.get(key);
    if (!data) return false;
    if (Date.now() > data.expiresAt) {
      store.delete(key);
      return false;
    }
    if (data.otp !== otp) return false;

    store.delete(key);
    return true;
  };

  

  return { set, verify };
};

export const otpStore = createOtpStore();
