import { Injectable } from '@angular/core';
import emailjs from '@emailjs/browser';

/* Port of email-notifications.js. These EmailJS values are public (same ones the
   website ships in its browser code). Needs: npm i @emailjs/browser */
const EMAILJS_PUBLIC_KEY = 'p-vyE-kvRr1-26Bh0';
const EMAILJS_SERVICE_ID = 'service_tnzpjyg';
const EMAILJS_OTP_TEMPLATE_ID = 'template_2aj648z';
const EMAILJS_ORDER_TEMPLATE_ID = 'template_kd8m5qd';

@Injectable({ providedIn: 'root' })
export class EmailService {
  constructor() {
    emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });
  }

  /** Throws on failure; AuthService treats that as "code generated, email not sent" and Resend retries. */
  async sendOtpEmail(toEmail: string, toName: string, otpCode: string): Promise<void> {
    await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_OTP_TEMPLATE_ID, {
      to_email: toEmail,
      to_name: toName || 'there',
      otp_code: otpCode
    });
  }

  /** Never throws: returns false if the email could not be sent (same as the website). */
  async sendOrderConfirmationEmail(
    order: { customer: { name: string; email: string }; totals: { total: number }; fulfillment: string },
    orderId: string
  ): Promise<boolean> {
    try {
      await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_ORDER_TEMPLATE_ID, {
        to_email: order.customer.email,
        to_name: order.customer.name,
        order_id: '#CC-' + orderId.slice(0, 6).toUpperCase(),
        order_total: order.totals.total,
        fulfillment: order.fulfillment
      });
      return true;
    } catch (err) {
      console.warn('EmailJS: order confirmation email failed to send.', err);
      return false;
    }
  }
}
