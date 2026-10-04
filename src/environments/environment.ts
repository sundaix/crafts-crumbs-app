/* DEV config. WARNING: this currently points at the LIVE Firebase project,
   so test orders/registrations made while developing will show up in the real
   admin dashboard and rider queue. Create a separate test Firebase project
   (copy firestore.rules + a few sample products) and swap these values in
   before doing serious testing. Firebase web config is public by design;
   security is enforced by firestore.rules. Never put PayMongo / service-account
   secrets here. */
export const environment = {
  production: false,
  firebase: {
    apiKey: 'AIzaSyDME5Wz8caqS_DOJuZDvmifAmcsUU0dfJc',
    authDomain: 'crafts-and-crumbs.firebaseapp.com',
    projectId: 'crafts-and-crumbs',
    storageBucket: 'crafts-and-crumbs.firebasestorage.app',
    messagingSenderId: '719436447556',
    appId: '1:719436447556:web:ab7f997c379fbccd73a111'
  },
  /* Base URL for the Vercel /api functions (relative URLs don't work in a native app). */
  apiBaseUrl: 'https://craftsandcrumbscafe.vercel.app',
  /* Customer-only app: admin/rider accounts are signed out with a message
     pointing them to the web dashboards. Set false to let staff test the app. */
  blockStaffAccounts: true
};
