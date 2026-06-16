import { validateSale } from './connectedSaleCheckout';

export function useSaleCheckoutActions(sale) {
  const openReview = () => {
    const error = validateSale({
      cart: sale.cart,
      customer: sale.customer,
      payment: sale.payment,
      cashReceived: sale.cashReceived,
      total: sale.total,
    });
    if (error) {
      sale.setCheckoutError(error);
      return;
    }
    sale.setCheckoutError('');
    sale.setReviewOpen(true);
  };
  return { openReview };
}
