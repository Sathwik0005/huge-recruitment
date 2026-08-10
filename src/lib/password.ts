export const PASSWORD_REQUIREMENTS_HINT =
  "At least 8 characters, with an uppercase letter, a lowercase letter, a digit, and a special character.";

export function validatePassword(password: string): string[] {
  const errors: string[] = [];

  if (password.length < 8) errors.push("Password must be at least 8 characters long.");
  if (!/[A-Z]/.test(password)) errors.push("Password must include an uppercase letter.");
  if (!/[a-z]/.test(password)) errors.push("Password must include a lowercase letter.");
  if (!/[0-9]/.test(password)) errors.push("Password must include a digit.");
  if (!/[^A-Za-z0-9]/.test(password)) errors.push("Password must include a special character.");

  return errors;
}
