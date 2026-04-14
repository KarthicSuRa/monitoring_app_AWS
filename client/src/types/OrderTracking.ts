
// types/OrderTracking.ts

/**
 * Box 1: Order Identity & Status
 */
export interface OrderHeroDetails {
  orderNumber: string;               // e.g., "E10007101"
  orderedDate: string;               // ISO Date String: "2026-04-09T06:57:22.000+0000"
  status: string;                    // e.g., "Approved"
  lastModifiedDate: string;          // ISO Date String for "Time in Status" calculation
}

/**
 * Box 2: Financial Health
 */
export interface PaymentDetails {
  grandTotalAmount: number;          // e.g., 40.00 (from GrandTotalAmountCopy__c)
  capturedAmount: number;            // e.g., 40.00 (from OrderPaymentSummaries)
  paymentType?: string;              // e.g., "iDEAL" (from PaymentType__c)
  invoiceStatus?: string;            // e.g., "Posted" (from Invoices)
}

/**
 * Box 3: Fulfillment Operations
 */
export interface FulfillmentDetails {
  fulfillmentOrderNumber: string;    // e.g., "FO-10567"
  status: string;                    // e.g., "Fulfilled" or "Allocated"
  locationName: string;              // e.g., "DE-INVENTORY-WAREHOUSE-7020"
  shippingMethod: string;            // e.g., "Normal Delivery"
}

/**
 * Box 5: Shipment & Tracking Details
 */
export interface ShipmentDetails {
  shipmentNumber: string;            // e.g., "SP-1710"
  trackingNumber: string;            // e.g., "00340434197561437519"
  provider?: string;                 // e.g., "DHL" (Optional, as it was blank in Sandbox)
}

/**
 * New: Order Lifecycle Timeline
 */
export interface LifecycleEvent {
    title: string;
    timestamp: string; // ISO Date String
    status: 'completed' | 'in_progress' | 'pending';
    details?: string;
}

export interface OrderLifecycle {
    events: LifecycleEvent[];
}


/**
 * Master Interface: The complete prop object passed to the Bento Box Dashboard
 */
export interface OrderBentoData {
  hero: OrderHeroDetails;
  payment: PaymentDetails;
  fulfillment: FulfillmentDetails;
  shipment?: ShipmentDetails;
  exceptionCount: number;            // Box 4: from ActiveProcessExceptionCount
  lifecycle: OrderLifecycle;
}
