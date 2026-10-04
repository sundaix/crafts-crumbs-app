import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  addDoc, collection, doc, getDoc, getDocs, onSnapshot, query, serverTimestamp, where
} from 'firebase/firestore';

import { db } from '../firebase';
import { NewOrderInput, Order } from '../models/order';
import { toSeconds } from '../utils/date';
import { AuthService } from './auth.service';

const ORDERS_COL = 'orders';

/* Customer-side port of orders-service.js. Admin/rider functions
   (fetchAllOrders, updateOrderStatus, claimDelivery, assignRider, ...) are
   intentionally NOT included: this app never calls them and firestore.rules
   would reject them for customers anyway. */
@Injectable({ providedIn: 'root' })
export class OrdersService {
  private auth = inject(AuthService);

  /* Resolve serverTimestamp() as a local estimate while the write is still pending,
     so a just-placed order doesn't briefly have createdAt = null. */
  private toOrder(d: { id: string; data: (o?: any) => any }): Order {
    return { id: d.id, ...d.data({ serverTimestamps: 'estimate' }) } as Order;
  }

  private newestFirst(orders: Order[]): Order[] {
    return orders.sort((a, b) => toSeconds(b.createdAt) - toSeconds(a.createdAt));
  }

  /* Field-for-field the same document the website writes. Notes:
     - riderId is EXPLICIT null (not omitted): the rider queue query and
       firestore.rules both rely on `riderId == null`, which only matches
       documents where the field exists and is null.
     - paymentStatus / paymentProvider / paymongoCheckoutSessionId are NOT written
       here; /api/paymongo/create-checkout-session sets them (as on the website). */
  async createOrder({ items, totals, fulfillment, customer, paymentMethod }: NewOrderInput): Promise<string> {
    const user = await this.auth.ensureSignedIn(); // rules require request.auth != null
    const ref = await addDoc(collection(db, ORDERS_COL), {
      items, totals, fulfillment, customer, paymentMethod,
      userId: user.uid,
      status: 'pending',
      riderId: null,
      createdAt: serverTimestamp()
    });
    return ref.id;
  }

  async fetchOrder(orderId: string): Promise<Order | null> {
    const snap = await getDoc(doc(db, ORDERS_COL, orderId));
    return snap.exists() ? this.toOrder(snap) : null;
  }

  /* Query shape matches the website (where userId == uid, no orderBy, so no
     composite index). Sorted client-side. */
  async fetchMyOrders(uid: string): Promise<Order[]> {
    const q = query(collection(db, ORDERS_COL), where('userId', '==', uid));
    const snap = await getDocs(q);
    return this.newestFirst(snap.docs.map(d => this.toOrder(d)));
  }

  /* ---- Realtime (new vs the website; possible because we use the full SDK) ---- */

  /** Live order history. Use with `toSignal()` or the async pipe. Unsubscribes automatically. */
  myOrders$(uid: string): Observable<Order[]> {
    return new Observable<Order[]>(sub => {
      const q = query(collection(db, ORDERS_COL), where('userId', '==', uid));
      return onSnapshot(
        q,
        snap => sub.next(this.newestFirst(snap.docs.map(d => this.toOrder(d)))),
        err => sub.error(err)
      );
    });
  }

  /** Live single order, e.g. for the status tracker and the post-payment screen. */
  order$(orderId: string): Observable<Order | null> {
    return new Observable<Order | null>(sub => {
      return onSnapshot(
        doc(db, ORDERS_COL, orderId),
        snap => sub.next(snap.exists() ? this.toOrder(snap) : null),
        err => sub.error(err)
      );
    });
  }
}
