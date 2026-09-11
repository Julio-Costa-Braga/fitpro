export const MONTHLY_FEE = 22;
export const REFERRAL_DISCOUNT = 5;
export const REFERRAL_DISCOUNT_MONTHS = 12;
export const TRIAL_DAYS = 7;
export const PIX_KEY = "78a0ca48-2d83-42e4-a57c-ef7800a77300";

export function trialUntil(date = new Date()): Date {
  return new Date(date.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
}