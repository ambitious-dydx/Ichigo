const PASSWORD_POLICY_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9\s])[^\s]{12,72}$/;

export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 72;
export const PASSWORD_PATTERN = PASSWORD_POLICY_REGEX.source;
export const PASSWORD_POLICY_SHORT_HINT =
  "Use 12+ characters with uppercase, lowercase, a number, and a symbol.";
export const PASSWORD_POLICY_FULL_HINT =
  "Use 12 to 72 characters with at least one uppercase letter, one lowercase letter, one number, and one symbol. Spaces are not allowed.";

export function isStrongPassword(value: string) {
  return PASSWORD_POLICY_REGEX.test(value);
}
