function createMemoryStorage() {
  const values = new Map();
  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
    removeItem(key) {
      values.delete(key);
    },
  };
}

function getStorage() {
  try {
    const probe = '__paraware_storage_probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch {
    // Private browsing and locked-down webviews can deny localStorage access.
    return createMemoryStorage();
  }
}

export const storage = getStorage();
