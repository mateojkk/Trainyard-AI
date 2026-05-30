export const PAYMENT_SYMBOL = "USDC";
export const USDC_COIN_TYPE =
  import.meta.env.VITE_USDC_COIN_TYPE ||
  "0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC";

export function formatPaymentAmount(amount) {
  return Number(amount || 0).toFixed(2);
}
