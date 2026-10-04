/* createdAt can be a Firestore Timestamp ({seconds}), a Date, or an ISO string
   (same defensive handling as the website's orders-service.js). */
export function toSeconds(val: any): number {
  if (!val) return 0;
  if (typeof val.seconds === 'number') return val.seconds;
  if (typeof val.toMillis === 'function') return val.toMillis() / 1000;
  const parsed = new Date(val).getTime();
  return isNaN(parsed) ? 0 : parsed / 1000;
}
