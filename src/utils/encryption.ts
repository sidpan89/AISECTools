// src/utils/encryption.ts

// In many cases, you won't do heavy encryption in frontend.
// This is a placeholder if you want to do something like 
// local encryption of sensitive fields before sending them.

export const encryptValue = (value: string): string => {
  // Placeholder: no real encryption here. You can implement
  // something with a library like crypto-js if desired.
  return btoa(value);
};

export const decryptValue = (encrypted: string): string => {
  return atob(encrypted);
};
