import midtransClient from 'midtrans-client';

const MIDTRANS_MOCK_MODE = (process.env.MIDTRANS_MOCK_MODE || '').toLowerCase() === 'true';

class MidtransService {
  constructor() {
    if (!MIDTRANS_MOCK_MODE) {
      this.snap = new midtransClient.Snap({
        isProduction: process.env.MIDTRANS_IS_PRODUCTION === 'true',
        serverKey: process.env.MIDTRANS_SERVER_KEY || 'dummy',
        clientKey: process.env.MIDTRANS_CLIENT_KEY || 'dummy'
      });

      this.coreApi = new midtransClient.CoreApi({
        isProduction: process.env.MIDTRANS_IS_PRODUCTION === 'true',
        serverKey: process.env.MIDTRANS_SERVER_KEY || 'dummy',
        clientKey: process.env.MIDTRANS_CLIENT_KEY || 'dummy'
      });
    }
  }

  /**
   * Creates a Snap transaction link
   * @param {Object} params
   * @param {string} params.orderId
   * @param {number} params.grossAmount
   * @param {Object} params.customerDetails
   * @param {Object} params.itemDetails
   * @param {string[]} params.enabledPayments
   * @returns {Promise<{snapToken: string, redirectUrl: string}>}
   */
  async createSnapTransaction({ orderId, grossAmount, customerDetails, itemDetails, enabledPayments }) {
    if (MIDTRANS_MOCK_MODE) {
      return {
        snapToken: `mock-snap-token-${orderId}`,
        redirectUrl: `https://example.com/mock-redirect/${orderId}`,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000)
      };
    }
    try {
      const parameter = {
        transaction_details: {
          order_id: orderId,
          gross_amount: Math.round(grossAmount)
        },
        customer_details: {
          first_name: customerDetails.firstName,
          last_name: customerDetails.lastName || undefined,
          email: customerDetails.email,
          phone: customerDetails.phone
        },
        item_details: itemDetails,
        ...(enabledPayments?.length ? { enabled_payments: enabledPayments } : {})
      };

      const response = await this.snap.createTransaction(parameter);
      
      return {
        snapToken: response.token,
        redirectUrl: response.redirect_url
      };
    } catch (error) {
      throw {
        code: 'MIDTRANS_API_ERROR',
        message: error.message || 'Failed to create Midtrans Snap transaction',
        statusCode: error.httpStatusCode || 500
      };
    }
  }

  /**
   * Fetch live status from Midtrans core API
   * @param {string} orderId 
   * @returns {Promise<Object>}
   */
  async getTransactionStatus(orderId) {
    if (MIDTRANS_MOCK_MODE) {
      return {
        transaction_status: 'settlement',
        fraud_status: 'accept',
        transaction_id: `mock-txn-${orderId}`,
        order_id: orderId,
        gross_amount: '150000.00',
        payment_type: 'qris',
        transaction_time: new Date().toISOString()
      };
    }
    try {
      const statusResponse = await this.coreApi.transaction.status(orderId);
      return statusResponse;
    } catch (error) {
      throw {
        code: 'MIDTRANS_API_ERROR',
        message: error.message || 'Failed to fetch Midtrans transaction status',
        statusCode: error.httpStatusCode || 500
      };
    }
  }
}

export default new MidtransService();
