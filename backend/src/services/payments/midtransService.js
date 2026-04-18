import midtransClient from 'midtrans-client';

class MidtransService {
  constructor() {
    this.snap = new midtransClient.Snap({
      isProduction: process.env.MIDTRANS_IS_PRODUCTION === 'true',
      serverKey: process.env.MIDTRANS_SERVER_KEY,
      clientKey: process.env.MIDTRANS_CLIENT_KEY
    });

    this.coreApi = new midtransClient.CoreApi({
      isProduction: process.env.MIDTRANS_IS_PRODUCTION === 'true',
      serverKey: process.env.MIDTRANS_SERVER_KEY,
      clientKey: process.env.MIDTRANS_CLIENT_KEY
    });
  }

  /**
   * Creates a Snap transaction link
   * @param {Object} params
   * @param {string} params.orderId
   * @param {number} params.grossAmount
   * @param {Object} params.customerDetails
   * @param {Object} params.itemDetails
   * @returns {Promise<{snapToken: string, redirectUrl: string}>}
   */
  async createSnapTransaction({ orderId, grossAmount, customerDetails, itemDetails }) {
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
        item_details: itemDetails
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
