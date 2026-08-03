// backend/src/services/email.service.js
// ✅ FIXED - Gmail SMTP compatible

import nodemailer from 'nodemailer';
import EmailQueue from '../queues/email.queue.js';

let transporter = null;
let isTransporterVerified = false;

class EmailService {
  static async getTransporter() {
    if (transporter && isTransporterVerified) return transporter;

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      console.warn('⚠️ [EmailService] Email credentials not configured');
      console.warn('   📧 Please set EMAIL_USER and EMAIL_PASSWORD in .env');
      return null;
    }

    const config = {
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.EMAIL_PORT) || 587,
      secure: process.env.EMAIL_SECURE === 'true' || process.env.EMAIL_PORT === '465',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      },
      tls: {
        rejectUnauthorized: false
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 20000,
    };

    // ✅ Use service if provided (gmail)
    if (process.env.EMAIL_SERVICE) {
      config.service = process.env.EMAIL_SERVICE;
    }

    console.log('📧 [EmailService] Creating Gmail SMTP transporter...');
    console.log(`   📧 Host: ${config.host}`);
    console.log(`   📧 User: ${config.auth.user}`);
    console.log(`   📧 Service: ${config.service || 'custom'}`);

    try {
      transporter = nodemailer.createTransport(config);
      
      console.log('📧 [EmailService] Verifying Gmail SMTP connection...');
      await transporter.verify();
      isTransporterVerified = true;
      console.log('✅ [EmailService] Gmail SMTP verified successfully!');
      console.log(`   📧 Ready to send emails from: ${process.env.EMAIL_FROM || 'aitourrwanda@gmail.com'}`);
      
      return transporter;
    } catch (error) {
      console.error('❌ [EmailService] Gmail SMTP connection failed:');
      console.error(`   📝 Reason: ${error.message}`);
      console.error('   📋 Troubleshooting:');
      console.error('   1. Check EMAIL_USER is correct');
      console.error('   2. Check EMAIL_PASSWORD is the App Password (not your Gmail password)');
      console.error('   3. Enable 2FA on your Google account');
      console.error('   4. Generate App Password for "Mail" at https://myaccount.google.com/apppasswords');
      console.error('   5. Make sure "Less secure app access" is turned OFF (use App Password instead)');
      
      isTransporterVerified = false;
      transporter = null;
      return null;
    }
  }

  static async sendEmail(to, subject, html) {
    console.log(`📧 [EmailService] Queuing email...`);
    console.log(`   📧 To: ${to}`);
    console.log(`   📝 Subject: ${subject}`);
    
    try {
      const transporter = await this.getTransporter();
      if (!transporter) {
        console.error(`❌ [EmailService] No transporter available for: ${to}`);
        return { success: false, error: 'No transporter available' };
      }

      EmailQueue.add({
        to,
        subject,
        html,
        from: process.env.EMAIL_FROM || '"AI Tour Rwanda" <aitourrwanda@gmail.com>'
      });
      
      console.log(`✅ [EmailService] Email queued successfully for: ${to}`);
      console.log(`   📊 Queue size: ${EmailQueue.getQueueSize()}`);
      
      return { queued: true, message: 'Email queued successfully' };
    } catch (error) {
      console.error(`❌ [EmailService] Failed to queue email to ${to}:`, error.message);
      return { success: false, error: error.message };
    }
  }

  // ─── Email Templates ──────────────────────────────────────────────

  static async sendVerificationEmail(user, verificationUrl) {
    console.log(`📧 [EmailService] Creating verification email for: ${user.email}`);
    console.log(`   🔗 URL: ${verificationUrl}`);
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify Your Email</title>
      </head>
      <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 10px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <div style="text-align: center; border-bottom: 2px solid #0D9488; padding-bottom: 20px;">
            <h1 style="color: #0D9488; margin: 0;">🌍 AI Tour Rwanda</h1>
          </div>
          <div style="padding: 20px 0;">
            <h2 style="color: #374151;">Welcome to AI Tour Rwanda! 🎉</h2>
            <p style="color: #374151; line-height: 1.6;">Hi <strong>${user.name}</strong>,</p>
            <p style="color: #374151; line-height: 1.6;">Thank you for registering. Please verify your email address to get started.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationUrl}" style="
                display: inline-block;
                padding: 14px 40px;
                background: linear-gradient(135deg, #0D9488, #F59E0B);
                color: white;
                text-decoration: none;
                border-radius: 8px;
                font-weight: bold;
                font-size: 16px;
              ">
                Verify Email
              </a>
            </div>
            <p style="color: #6b7280; font-size: 14px;">This link expires in 24 hours.</p>
            <p style="color: #6b7280; font-size: 14px;">If you didn't create an account, please ignore this email.</p>
          </div>
          <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; text-align: center; color: #9ca3af; font-size: 14px;">
            <p>© ${new Date().getFullYear()} AI Tour Rwanda. All rights reserved.</p>
            <p>Kigali, Rwanda 🇷🇼</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail(user.email, 'AI Tour - Verify Your Email', html);
  }

  static async sendPasswordResetEmail(user, resetUrl) {
    console.log(`📧 [EmailService] Creating password reset email for: ${user.email}`);
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password</title>
      </head>
      <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 10px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <div style="text-align: center; border-bottom: 2px solid #0D9488; padding-bottom: 20px;">
            <h1 style="color: #0D9488; margin: 0;">🌍 AI Tour Rwanda</h1>
          </div>
          <div style="padding: 20px 0;">
            <h2 style="color: #374151;">Reset Your Password</h2>
            <p style="color: #374151; line-height: 1.6;">Hi <strong>${user.name}</strong>,</p>
            <p style="color: #374151; line-height: 1.6;">We received a request to reset your password.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" style="
                display: inline-block;
                padding: 14px 40px;
                background: linear-gradient(135deg, #0D9488, #F59E0B);
                color: white;
                text-decoration: none;
                border-radius: 8px;
                font-weight: bold;
                font-size: 16px;
              ">
                Reset Password
              </a>
            </div>
            <p style="color: #6b7280; font-size: 14px;">This link expires in 15 minutes.</p>
            <p style="color: #6b7280; font-size: 14px;">If you didn't request this, please ignore this email.</p>
          </div>
          <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; text-align: center; color: #9ca3af; font-size: 14px;">
            <p>© ${new Date().getFullYear()} AI Tour Rwanda. All rights reserved.</p>
            <p>Kigali, Rwanda 🇷🇼</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail(user.email, 'AI Tour - Password Reset', html);
  }

  static async sendPasswordChangedEmail(user) {
    console.log(`📧 [EmailService] Creating password changed notification for: ${user.email}`);
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Changed</title>
      </head>
      <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 10px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <div style="text-align: center; border-bottom: 2px solid #0D9488; padding-bottom: 20px;">
            <h1 style="color: #0D9488; margin: 0;">🌍 AI Tour Rwanda</h1>
          </div>
          <div style="padding: 20px 0;">
            <h2 style="color: #374151;">Password Changed</h2>
            <p style="color: #374151; line-height: 1.6;">Hi <strong>${user.name}</strong>,</p>
            <p style="color: #374151; line-height: 1.6;">Your password has been changed successfully.</p>
            <p style="color: #374151; line-height: 1.6;">If you didn't make this change, please contact us immediately.</p>
          </div>
          <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; text-align: center; color: #9ca3af; font-size: 14px;">
            <p>© ${new Date().getFullYear()} AI Tour Rwanda. All rights reserved.</p>
            <p>Kigali, Rwanda 🇷🇼</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail(user.email, 'AI Tour - Password Changed', html);
  }
}

export default EmailService;