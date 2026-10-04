import { Injectable, computed, inject, signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { filter, firstValueFrom } from 'rxjs';
import {
  User,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInAnonymously,
  signInWithEmailAndPassword,
  signOut,
  updateProfile
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

import { auth, db } from '../firebase';
import { environment } from '../../../environments/environment';
import { OtpResult, UserRecord, UserRole } from '../models/user-profile';
import { sleep, withTimeout } from '../utils/async';
import { EmailService } from './email.service';

const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
const OTP_MAX_ATTEMPTS = 5;

/* Port of the website's auth.js. Same Firestore shape (users/{uid}), same OTP
   flow, same retry/last-known-role logic. The window.CC* globals and the
   authStateReady / authRoleReady DOM events become signals. */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private emailSvc = inject(EmailService);

  /* ---- State (replaces window.currentUser / currentRole + the events) ---- */
  readonly user = signal<User | null>(null);
  readonly role = signal<UserRole | null>(null);
  readonly otpVerified = signal(false);
  /** First Auth determination has happened (was: authStateReady). */
  readonly authResolved = signal(false);
  /** Role lookup finished for the current user (was: authRoleReady). */
  readonly roleResolved = signal(false);
  /** Role could not be confirmed (no cache + all retries failed). Treated as customer. */
  readonly roleUnknown = signal(false);
  /** Set when we signed the person out; the UI shows a message. Cleared on next login/register. */
  readonly blocked = signal<'disabled' | 'staff' | null>(null);

  /** Signed in with a real account (not a guest/anonymous session). */
  readonly isRegistered = computed(() => {
    const u = this.user();
    return !!u && !u.isAnonymous;
  });

  /* Caches the last successfully fetched record per uid so a transient fetch
     failure (e.g. app resumed from background on a slow connection) keeps the
     status quo instead of defaulting the role. Same reasoning as auth.js. */
  private lastKnown = new Map<string, UserRecord>();
  /* Guards against out-of-order results when auth state changes quickly. */
  private authSeq = 0;

  constructor() {
    onAuthStateChanged(auth, user => { void this.handleAuthChange(user); });
  }

  /* ================= AUTH STATE ================= */

  private async handleAuthChange(user: User | null) {
    const seq = ++this.authSeq;

    // Everything that only needs the Auth user can render right away.
    this.user.set(user);
    this.role.set(null);
    this.otpVerified.set(false);
    this.roleUnknown.set(false);
    this.roleResolved.set(false);
    this.authResolved.set(true);

    if (!user || user.isAnonymous) {
      this.roleResolved.set(true);
      return;
    }

    const rec = await this.fetchUserRecord(user.uid);
    if (seq !== this.authSeq) return; // a newer auth change superseded this one

    if (rec.disabled) {
      // Blocked from the admin dashboard's Accounts tab. Rules already stop
      // writes; sign out so they aren't left with a half-working UI.
      this.blocked.set('disabled');
      await signOut(auth);
      return;
    }

    if (environment.blockStaffAccounts && !rec.unknown && rec.role !== 'customer') {
      // Customer-only app: admin/rider use the web dashboards.
      this.blocked.set('staff');
      await signOut(auth);
      return;
    }

    this.role.set(rec.role);
    this.otpVerified.set(rec.otpVerified);
    this.roleUnknown.set(!!rec.unknown);
    this.roleResolved.set(true);
  }

  /** Resolves with the Auth user once the first auth determination is made. */
  async whenAuthResolved(): Promise<User | null> {
    if (auth.currentUser) return auth.currentUser;
    try { await auth.authStateReady(); } catch { /* fall through to the null check */ }
    return auth.currentUser;
  }

  /** Resolves once the role/verification lookup for the current user is done. */
  async whenRoleResolved(): Promise<void> {
    await this.whenAuthResolved();
    if (this.roleResolved()) return;
    await firstValueFrom(toObservable(this.roleResolved).pipe(filter(Boolean)));
  }

  /* ================= USER RECORD ================= */

  private async fetchUserRecordOnce(uid: string, timeoutMs: number): Promise<UserRecord> {
    const snap = await withTimeout(getDoc(doc(db, 'users', uid)), timeoutMs, 'timeout');
    const data: any = snap.exists() ? snap.data() : {};
    return {
      role: (data.role as UserRole) || 'customer',
      otpVerified: !!data.otpVerified,
      disabled: !!data.disabled
    };
  }

  private async fetchUserRecord(uid: string): Promise<UserRecord> {
    // Two retries with backoff: a slow reconnect right after the app wakes up
    // usually resolves within a few seconds.
    const attempts = [12000, 6000, 6000];
    let lastErr: unknown = null;
    for (let i = 0; i < attempts.length; i++) {
      try {
        const record = await this.fetchUserRecordOnce(uid, attempts[i]);
        this.lastKnown.set(uid, record);
        return record;
      } catch (err) {
        lastErr = err;
        if (i < attempts.length - 1) await sleep(1500 * (i + 1));
      }
    }
    console.warn('Could not fetch user record after retries.', lastErr);
    const cached = this.lastKnown.get(uid);
    if (cached) return cached;
    return { role: 'customer', otpVerified: false, disabled: false, unknown: true };
  }

  /** Re-checks the role for the current user (parity with CCAuth.recheckRole). */
  async recheckRole(): Promise<void> {
    const user = await this.whenAuthResolved();
    if (!user || user.isAnonymous) return;
    const rec = await this.fetchUserRecord(user.uid);
    this.role.set(rec.role);
    this.otpVerified.set(rec.otpVerified);
    this.roleUnknown.set(!!rec.unknown);
    this.roleResolved.set(true);
  }

  /* ================= REGISTER / LOGIN / LOGOUT ================= */

  /** Returns the new user plus whether the OTP email actually went out. */
  async registerUser(fullName: string, email: string, phone: string, password: string):
    Promise<{ user: User; otpEmailSent: boolean }> {
    this.blocked.set(null);
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: fullName });
    try {
      await withTimeout(
        setDoc(doc(db, 'users', cred.user.uid), {
          fullName, email, phone,
          role: 'customer',
          createdAt: new Date().toISOString(),
          otpVerified: false
        }),
        8000,
        'timeout'
      );
    } catch {
      // Auth account exists even though the profile write failed/timed out;
      // surface a specific error so the UI can explain instead of looking stuck.
      const blockErr: any = new Error('profile-write-failed');
      blockErr.code = 'profile-write-failed';
      throw blockErr;
    }
    // Best-effort: the Resend button on the verify screen retries if this fails.
    let otpEmailSent = false;
    try {
      ({ emailSent: otpEmailSent } = await this.issueOtp(cred.user.uid, email, fullName));
    } catch (err) {
      console.warn('Could not generate the verification code yet; Resend will retry.', err);
    }
    return { user: cred.user, otpEmailSent };
  }

  /** NOTE: staff/disabled accounts are signed out by handleAuthChange; watch `blocked()`. */
  async loginUser(email: string, password: string): Promise<User> {
    this.blocked.set(null);
    const cred = await signInWithEmailAndPassword(auth, email, password);
    return cred.user;
  }

  async logoutUser(): Promise<void> {
    await signOut(auth);
  }

  /** Always resolves the same way whether or not the email exists (no account enumeration). */
  async sendResetPasswordEmail(email: string): Promise<void> {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (err: any) {
      if (err?.code !== 'auth/user-not-found') throw err;
    }
  }

  /** Guest checkout: Firestore's order-create rule needs request.auth != null.
      Requires the Anonymous provider enabled in the Firebase console (already is for the website). */
  async ensureSignedIn(): Promise<User> {
    if (auth.currentUser) return auth.currentUser;
    const cred = await signInAnonymously(auth);
    return cred.user;
  }

  /* ================= EMAIL OTP (client-side; same documented limitation as the website) ================= */

  private generateOtp(): string {
    return String(Math.floor(100000 + Math.random() * 900000));
  }

  private async issueOtp(uid: string, email: string, fullName: string, extraFields?: Record<string, unknown>):
    Promise<{ emailSent: boolean }> {
    const otpCode = this.generateOtp();
    await setDoc(doc(db, 'users', uid), {
      ...extraFields,
      otpVerified: false,
      otpCode,
      otpExpiresAt: new Date(Date.now() + OTP_TTL_MS).toISOString(),
      otpAttempts: 0
    }, { merge: true });
    try {
      await this.emailSvc.sendOtpEmail(email, fullName, otpCode);
      return { emailSent: true };
    } catch (err) {
      console.warn('Could not send the verification email (code was still generated; Resend will retry).', err);
      return { emailSent: false };
    }
  }

  /** "Resend code" button. Rebuilds the baseline profile if the original write never landed. */
  async resendOtp(): Promise<{ emailSent: boolean }> {
    const user = await this.whenAuthResolved();
    if (!user) throw new Error('not-signed-in');
    const snap = await getDoc(doc(db, 'users', user.uid));
    const data: any = snap.exists() ? snap.data() : {};
    const extraFields = snap.exists() ? undefined : {
      email: user.email,
      fullName: user.displayName || '',
      role: 'customer',
      createdAt: new Date().toISOString()
    };
    return this.issueOtp(user.uid, data.email || user.email, data.fullName || user.displayName || '', extraFields);
  }

  /** Read-only check used right after login to decide whether to route to the verify screen. */
  async isOtpVerified(): Promise<boolean> {
    const user = await this.whenAuthResolved();
    if (!user) return false;
    const snap = await getDoc(doc(db, 'users', user.uid));
    return snap.exists() && !!(snap.data() as any).otpVerified;
  }

  async verifyOtp(enteredCode: string): Promise<OtpResult> {
    const user = await this.whenAuthResolved();
    if (!user) return { ok: false, reason: 'not-signed-in' };
    const ref = doc(db, 'users', user.uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) return { ok: false, reason: 'no-record' };
    const data: any = snap.data();

    if (data.otpVerified) return { ok: true };
    if (!data.otpCode) return { ok: false, reason: 'no-code' };
    if (new Date(data.otpExpiresAt).getTime() < Date.now()) return { ok: false, reason: 'expired' };
    if ((data.otpAttempts || 0) >= OTP_MAX_ATTEMPTS) return { ok: false, reason: 'too-many-attempts' };

    if (String(enteredCode) === String(data.otpCode)) {
      await updateDoc(ref, { otpVerified: true, otpCode: null, otpAttempts: 0 });
      this.otpVerified.set(true);
      return { ok: true };
    }
    const attempts = (data.otpAttempts || 0) + 1;
    await updateDoc(ref, { otpAttempts: attempts });
    return { ok: false, reason: 'incorrect', attemptsLeft: OTP_MAX_ATTEMPTS - attempts };
  }
}
