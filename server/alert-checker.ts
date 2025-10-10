import { storage } from "./storage";

/**
 * Check for orders that need payment overdue alerts
 * Alerts are created when payment is outstanding and ship date is approaching/past
 */
export async function checkPaymentOverdueAlerts() {
  console.log('🔍 Checking for payment overdue alerts...');

  try {
    // Get all orders that are not delivered and not fully paid
    const allOrders = await storage.getAllOrders();
    const unpaidOrders = allOrders.items.filter(order =>
      order.status !== 'delivered' &&
      order.paymentStatus !== 'fullyPaid' &&
      order.estimatedDelivery
    );

    let alertsCreated = 0;

    for (const order of unpaidOrders) {
      // Check if ship date is within 7 days or has passed
      const shipDate = new Date(order.estimatedDelivery!);
      const now = new Date();
      const daysUntilShip = Math.ceil((shipDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      // Only create alert if ship date is within 7 days or past
      if (daysUntilShip <= 7) {
        // Check for existing unresolved payment alert for this order
        const existingAlerts = await storage.getAllAlerts(false); // Get unresolved alerts
        const existingPaymentAlert = existingAlerts.items.find(alert =>
          alert.relatedOrderId === order.id &&
          alert.type === 'critical' &&
          !alert.resolved
        );

        if (!existingPaymentAlert) {
          // Determine priority based on urgency
          let priority: 'low' | 'medium' | 'high' = 'low';
          let title = 'Payment Required Before Shipping';
          let message = '';

          if (daysUntilShip <= 0) {
            // Ship date has passed
            priority = 'high';
            message = `URGENT: Payment of ¥${order.totalValue} required for order ${order.orderNumber}. Ship date ${shipDate.toLocaleDateString('en-US')} has passed!`;
          } else if (daysUntilShip <= 3) {
            // Within 3 days
            priority = 'medium';
            message = `Payment of ¥${order.totalValue} needed for order ${order.orderNumber} within ${daysUntilShip} day${daysUntilShip === 1 ? '' : 's'} (ships ${shipDate.toLocaleDateString('en-US')})`;
          } else {
            // Within 7 days
            priority = 'low';
            message = `Payment of ¥${order.totalValue} due soon for order ${order.orderNumber} (ships ${shipDate.toLocaleDateString('en-US')})`;
          }

          // Create the alert
          await storage.createAlert({
            type: 'critical',
            title,
            message,
            priority,
            relatedOrderId: order.id
          });

          alertsCreated++;
          console.log(`📢 Created payment alert for order ${order.orderNumber}`);
        }
      }
    }

    console.log(`✅ Payment overdue check complete. Created ${alertsCreated} alerts.`);
    return { alertsCreated };

  } catch (error) {
    console.error('❌ Error checking payment overdue alerts:', error);
    throw error;
  }
}

/**
 * Check for orders that need overdue alerts
 * Creates tiered alerts: urgent warning (3 days out) and overdue alerts
 */
export async function checkOverdueOrdersAlerts() {
  console.log('🔍 Checking for overdue orders alerts...');

  try {
    // Get all orders that are not delivered and have estimated delivery dates
    const allOrders = await storage.getAllOrders();
    const activeOrders = allOrders.items.filter(order =>
      order.status !== 'delivered' &&
      order.estimatedDelivery
    );

    let alertsCreated = 0;

    for (const order of activeOrders) {
      const shipDate = new Date(order.estimatedDelivery!);
      const now = new Date();
      const daysUntilShip = Math.ceil((shipDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      // Check for existing overdue alerts for this order
      const existingAlerts = await storage.getAllAlerts(false);
      const existingOverdueAlerts = existingAlerts.items.filter(alert =>
        alert.relatedOrderId === order.id &&
        alert.type === 'delay' &&
        !alert.resolved
      );

      // Tier 1: Urgent Warning (ships within 3 days)
      if (daysUntilShip <= 3 && daysUntilShip > 0) {
        const existingWarning = existingOverdueAlerts.find(alert =>
          alert.title === 'Order Due Very Soon'
        );

        if (!existingWarning) {
          await storage.createAlert({
            type: 'delay',
            title: 'Order Due Very Soon',
            message: `URGENT: Order ${order.orderNumber} ships in ${daysUntilShip} day${daysUntilShip === 1 ? '' : 's'} (${shipDate.toLocaleDateString('en-US')}). Final check required!`,
            priority: 'medium',
            relatedOrderId: order.id
          });
          alertsCreated++;
          console.log(`📢 Created urgent warning for order ${order.orderNumber}`);
        }
      }

      // Tier 2: Overdue Alert (ship date has passed)
      else if (daysUntilShip < 0) {
        const daysOverdue = Math.abs(daysUntilShip);
        const existingOverdue = existingOverdueAlerts.find(alert =>
          alert.title === 'Order Overdue'
        );

        if (!existingOverdue) {
          await storage.createAlert({
            type: 'delay',
            title: 'Order Overdue',
            message: `CRITICAL: Order ${order.orderNumber} is overdue by ${daysOverdue} days (Expected: ${shipDate.toLocaleDateString('en-US')})`,
            priority: 'high',
            relatedOrderId: order.id
          });
          alertsCreated++;
          console.log(`🚨 Created overdue alert for order ${order.orderNumber}`);
        }
      }
    }

    console.log(`✅ Overdue orders check complete. Created ${alertsCreated} alerts.`);
    return { alertsCreated };

  } catch (error) {
    console.error('❌ Error checking overdue orders alerts:', error);
    throw error;
  }
}

/**
 * Auto-resolve payment alerts when payment is completed
 */
export async function resolveCompletedPaymentAlerts() {
  console.log('🔄 Resolving completed payment alerts...');

  try {
    // Get all unresolved critical alerts (payment alerts)
    const unresolvedAlerts = await storage.getAllAlerts(false);
    const paymentAlerts = unresolvedAlerts.items.filter(alert =>
      alert.type === 'critical' && alert.relatedOrderId
    );

    let alertsResolved = 0;

    for (const alert of paymentAlerts) {
      // Check if the related order is now fully paid or delivered
      const order = await storage.getOrderById(alert.relatedOrderId!);
      if (order && (order.paymentStatus === 'fullyPaid' || order.status === 'delivered')) {
        await storage.resolveAlert(alert.id);
        alertsResolved++;
        console.log(`✅ Resolved payment alert for order ${order.orderNumber}`);
      }
    }

    console.log(`✅ Payment alert resolution complete. Resolved ${alertsResolved} alerts.`);
    return { alertsResolved };

  } catch (error) {
    console.error('❌ Error resolving payment alerts:', error);
    throw error;
  }
}

/**
 * Check for orders that are stuck in workflow stages
 * Creates alerts when orders remain in the same status for too long
 */
export async function checkStuckOrdersAlerts() {
  console.log('🔍 Checking for stuck orders alerts...');

  try {
    // Get all orders that are not delivered
    const allOrders = await storage.getAllOrders();
    const activeOrders = allOrders.items.filter(order =>
      order.status !== 'delivered' &&
      order.updatedAt // Only check orders that have been updated
    );

    let alertsCreated = 0;

    for (const order of activeOrders) {
      const updatedAt = new Date(order.updatedAt);
      const now = new Date();
      const daysSinceUpdate = Math.floor((now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24));

      // Define stuck thresholds based on status
      let thresholdDays = 0;
      let shouldAlert = false;

      switch (order.status) {
        case 'received':
          thresholdDays = 7;
          shouldAlert = daysSinceUpdate >= thresholdDays;
          break;
        case 'sentToFactory':
          thresholdDays = 14;
          shouldAlert = daysSinceUpdate >= thresholdDays;
          break;
        case 'inProduction':
          thresholdDays = 21;
          shouldAlert = daysSinceUpdate >= thresholdDays;
          break;
      }

      if (shouldAlert) {
        // Check for existing unresolved stuck alert for this order
        const existingAlerts = await storage.getAllAlerts(false);
        const existingStuckAlert = existingAlerts.items.find(alert =>
          alert.relatedOrderId === order.id &&
          alert.type === 'delay' &&
          alert.title === 'Order Stuck in Production' &&
          !alert.resolved
        );

        if (!existingStuckAlert) {
          await storage.createAlert({
            type: 'delay',
            title: 'Order Stuck in Production',
            message: `Order ${order.orderNumber} has been in ${order.status} status for ${daysSinceUpdate} days`,
            priority: 'medium',
            relatedOrderId: order.id
          });

          alertsCreated++;
          console.log(`📢 Created stuck order alert for order ${order.orderNumber} (${order.status} for ${daysSinceUpdate} days)`);
        }
      }
    }

    console.log(`✅ Stuck orders check complete. Created ${alertsCreated} alerts.`);
    return { alertsCreated };

  } catch (error) {
    console.error('❌ Error checking stuck orders alerts:', error);
    throw error;
  }
}

/**
 * Auto-resolve overdue alerts when orders are delivered or dates updated
 */
export async function resolveCompletedOverdueAlerts() {
  console.log('🔄 Resolving completed overdue alerts...');

  try {
    // Get all unresolved delay alerts (overdue alerts)
    const unresolvedAlerts = await storage.getAllAlerts(false);
    const overdueAlerts = unresolvedAlerts.items.filter(alert =>
      alert.type === 'delay' && alert.relatedOrderId
    );

    let alertsResolved = 0;

    for (const alert of overdueAlerts) {
      const order = await storage.getOrderById(alert.relatedOrderId!);
      if (order) {
        let shouldResolve = false;

        // Resolve if order is delivered
        if (order.status === 'delivered') {
          shouldResolve = true;
        }
        // Resolve warning alerts if ship date moved beyond 3 days
        else if (alert.title === 'Order Due Very Soon') {
          const shipDate = new Date(order.estimatedDelivery!);
          const now = new Date();
          const daysUntilShip = Math.ceil((shipDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          if (daysUntilShip > 3) {
            shouldResolve = true;
          }
        }
        // Resolve overdue alerts if ship date moved to future
        else if (alert.title === 'Order Overdue') {
          const shipDate = new Date(order.estimatedDelivery!);
          const now = new Date();
          if (shipDate > now) {
            shouldResolve = true;
          }
        }
        // Resolve stuck alerts if order status changed
        else if (alert.title === 'Order Stuck in Production') {
          // Check if the order has moved to a different status since the alert was created
          const alertCreatedAt = new Date(alert.createdAt);
          const orderUpdatedAt = new Date(order.updatedAt);
          if (orderUpdatedAt > alertCreatedAt) {
            shouldResolve = true;
          }
        }

        if (shouldResolve) {
          await storage.resolveAlert(alert.id);
          alertsResolved++;
          console.log(`✅ Resolved overdue alert for order ${order.orderNumber}`);
        }
      }
    }

    console.log(`✅ Overdue alert resolution complete. Resolved ${alertsResolved} alerts.`);
    return { alertsResolved };

  } catch (error) {
    console.error('❌ Error resolving overdue alerts:', error);
    throw error;
  }
}