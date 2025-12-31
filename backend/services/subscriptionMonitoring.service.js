import VendorSubscription from '../models/VendorSubscription.model.js';
import Transaction from '../models/Transaction.model.js';

class SubscriptionMonitoringService {
  async checkSystemHealth() {
    const alerts = [];

    // 1. Check for failed payments in last 24h
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const failedPayments = await Transaction.find({
      type: 'payment',
      status: 'failed',
      transactionCode: /^SUB-/,
      createdAt: { $gte: last24h }
    });

    if (failedPayments.length > 0) {
      alerts.push({
        level: 'warning',
        message: `${failedPayments.length} subscription payments failed in the last 24 hours.`,
        type: 'PAYMENT_FAILURE'
      });
    }

    // 2. Check for expired subscriptions that should have renewed
    const stuckRenewals = await VendorSubscription.find({
      status: 'active',
      endDate: { $lt: new Date() },
      autoRenew: true
    });

    if (stuckRenewals.length > 0) {
      alerts.push({
        level: 'critical',
        message: `${stuckRenewals.length} subscriptions are past their end date but remain active/unprocessed.`,
        type: 'RENEWAL_STUCK'
      });
    }

    return alerts;
  }

  async sendAlert(alert) {
    // Mock for sending to Slack/Email/Admin Dashboard
    console.log(`[ALERT][${alert.level.toUpperCase()}] ${alert.message}`);
    
    // In a real system, you might use an email service or a webhook
    // emailService.sendAdminAlert(alert);
  }
}

export default new SubscriptionMonitoringService();
