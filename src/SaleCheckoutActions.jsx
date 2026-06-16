import { apiFetch, getSession } from './phase2Api';
import { clearSaleDraft } from './pos/posHelpers';
import { checkoutBody, validateSale } from './connectedSaleCheckout';

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

  const completeSale = async () => {
    sale.setCheckoutBusy(true);
    sale.setCheckoutError('');
    try {
      const response = await apiFetch('/api/sales/v2', {
        method: 'POST',
        body: checkoutBody({
          cart: sale.cart,
          customer: sale.customer,
          payment: sale.payment,
          safeDiscount: sale.safeDiscount,
          cashReceived: sale.cashReceived,
        }),
      });
      clearSaleDraft(getSession());
      sale.setReviewOpen(false);
      sale.setCompletedSale(response.sale);
    } catch (error) {
      sale.setCheckoutError(error?.message || 'အရောင်းသိမ်းမရပါ။');
    } finally {
      sale.setCheckoutBusy(false);
    }
  };

  return { openReview, completeSale };
}
