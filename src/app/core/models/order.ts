export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'out_for_delivery' | 'completed';
export type Fulfillment = 'delivery' | 'pickup';

export interface OrderItem {
  id: string;
  name: string;
  price: number;
  qty: number;
  size?: string;
  options?: any;
  optionsSummary?: string;
}

export interface OrderTotals { subtotal: number; deliveryFee: number; total: number; }

export interface OrderCustomer {
  name: string;
  phone: string;
  email: string;
  address?: string;
  lat?: number;
  lng?: number;
}

export interface Order {
  id: string;
  items: OrderItem[];
  totals: OrderTotals;
  fulfillment: Fulfillment;
  customer: OrderCustomer;
  paymentMethod: string;                 // 'qrph' | 'card'
  paymentStatus?: 'pending' | 'paid';    // written by /api only
  paymentProvider?: 'paymongo_qrph' | 'paymongo_card';
  paymongoCheckoutSessionId?: string;
  userId: string | null;
  status: OrderStatus;
  riderId: string | null;
  deliveryProof?: string;
  createdAt?: any;                       // Firestore Timestamp
}

/* What the checkout page passes in. Everything else is set by createOrder. */
export type NewOrderInput = Pick<Order, 'items' | 'totals' | 'fulfillment' | 'customer' | 'paymentMethod'>;

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Pending',
  preparing: 'Preparing',
  ready: 'Ready',
  out_for_delivery: 'Out for delivery',
  completed: 'Completed'
};

/* The website tracker shows 4 steps and skips out_for_delivery, which riders
   do set. For the app, delivery orders get the extra step; pickup stays at 4. */
export function trackerSteps(fulfillment: Fulfillment): OrderStatus[] {
  return fulfillment === 'delivery'
    ? ['pending', 'preparing', 'ready', 'out_for_delivery', 'completed']
    : ['pending', 'preparing', 'ready', 'completed'];
}
