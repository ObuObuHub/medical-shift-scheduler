// Password strength validation
export function validatePassword(password) {
  const errors = [];
  
  // Minimum length
  if (password.length < 8) {
    errors.push('Parola trebuie să aibă cel puțin 8 caractere');
  }
  
  // At least one uppercase letter
  if (!/[A-Z]/.test(password)) {
    errors.push('Parola trebuie să conțină cel puțin o literă mare');
  }
  
  // At least one lowercase letter
  if (!/[a-z]/.test(password)) {
    errors.push('Parola trebuie să conțină cel puțin o literă mică');
  }
  
  // At least one number
  if (!/\d/.test(password)) {
    errors.push('Parola trebuie să conțină cel puțin o cifră');
  }
  
  // At least one special character
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Parola trebuie să conțină cel puțin un caracter special (!@#$%^&*(),.?":{}|<>)');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    strength: calculatePasswordStrength(password)
  };
}

function calculatePasswordStrength(password) {
  let strength = 0;
  
  // Length
  if (password.length >= 8) strength++;
  if (password.length >= 12) strength++;
  if (password.length >= 16) strength++;
  
  // Character types
  if (/[a-z]/.test(password)) strength++;
  if (/[A-Z]/.test(password)) strength++;
  if (/\d/.test(password)) strength++;
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength++;
  
  // Complexity
  if (password.length >= 10 && /[a-z]/.test(password) && /[A-Z]/.test(password) && 
      /\d/.test(password) && /[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    strength += 2;
  }
  
  if (strength <= 3) return 'slabă';
  if (strength <= 6) return 'medie';
  return 'puternică';
}

// Check for common weak passwords
const commonWeakPasswords = [
  'password', 'parola', '12345678', '123456789', 'qwerty123', 
  'admin123', 'password123', 'parola123', 'welcome123'
];

export function isCommonPassword(password) {
  const lowerPassword = password.toLowerCase();
  return commonWeakPasswords.some(weak => lowerPassword.includes(weak));
}