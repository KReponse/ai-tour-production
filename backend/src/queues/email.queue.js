// backend/src/queues/email.queue.js
// ✅ FIXED - Gmail SMTP compatible

import nodemailer from 'nodemailer';

class EmailQueueClass {
  constructor() {
    this.queue = [];
    this.isProcessing = false;
    this.transporter = null;
    this.isTransporterVerified = false;
    this.maxRetries = 3;
    this.retryDelay = 5000;
    console.log('📧 EmailQueue initialized');
  }

  async getTransporter() {
    if (this.transporter && this.isTransporterVerified) return this.transporter;

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      console.warn('⚠️ [EmailQueue] Email credentials not configured');
      return null;
    }

    const config = {
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.EMAIL_PORT) || 587,
      secure: process.env.EMAIL_SECURE === 'true' || process.env.EMAIL_PORT === '465',
      auth: {
        user: process.env.EMAIL_USER,       // ✅ Fixed: Using EMAIL_USER
        pass: process.env.EMAIL_PASSWORD    // ✅ Fixed: Using EMAIL_PASSWORD
      },
      tls: {
        rejectUnauthorized: false
      }
    };

    // ✅ Remove service field for Gmail (let it use host/port)
    if (process.env.EMAIL_SERVICE) {
      config.service = process.env.EMAIL_SERVICE;
    }

    try {
      this.transporter = nodemailer.createTransport(config);
      await this.transporter.verify();
      this.isTransporterVerified = true;
      console.log('✅ [EmailQueue] Gmail SMTP verified successfully');
      console.log(`   📧 Host: ${process.env.EMAIL_HOST}`);
      console.log(`   📧 User: ${process.env.EMAIL_USER}`);
      console.log(`   📧 Service: ${process.env.EMAIL_SERVICE || 'gmail'}`);
      return this.transporter;
    } catch (error) {
      console.error('❌ [EmailQueue] Gmail SMTP verification failed:', error.message);
      console.error('   📧 Please check:');
      console.error('   - EMAIL_USER is correct');
      console.error('   - EMAIL_PASSWORD is the App Password (not your Gmail password)');
      console.error('   - 2FA is enabled on your Google account');
      console.error('   - App Password is generated for "Mail"');
      this.isTransporterVerified = false;
      this.transporter = null;
      return null;
    }
  }

  add(emailData) {
    this.queue.push({
      ...emailData,
      retries: 0,
      addedAt: Date.now()
    });

    console.log(`📧 [EmailQueue] Email queued for: ${emailData.to}`);
    console.log(`   📝 Subject: ${emailData.subject}`);
    console.log(`   📊 Queue size: ${this.queue.length}`);
    
    if (!this.isProcessing) {
      console.log('📧 [EmailQueue] Starting queue processing...');
      this.process();
    }
  }

  async process() {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    console.log(`📧 [EmailQueue] Processing ${this.queue.length} emails...`);
    this.isProcessing = true;

    while (this.queue.length > 0) {
      const email = this.queue.shift();
      console.log(`📧 [EmailQueue] Sending to: ${email.to} (attempt ${email.retries + 1}/${this.maxRetries})`);
      await this.sendEmail(email);
    }

    console.log('📧 [EmailQueue] Queue processing complete');
    this.isProcessing = false;
  }

  async sendEmail(email) {
    try {
      const transporter = await this.getTransporter();
      
      if (!transporter) {
        console.error(`❌ [EmailQueue] No transporter for: ${email.to}`);
        
        if (email.retries < this.maxRetries) {
          email.retries++;
          console.log(`🔄 [EmailQueue] Retrying ${email.to} (attempt ${email.retries + 1}/${this.maxRetries})`);
          setTimeout(() => {
            this.queue.unshift(email);
            if (!this.isProcessing) {
              this.process();
            }
          }, this.retryDelay * email.retries);
        } else {
          console.error(`❌ [EmailQueue] Permanently failed: ${email.to}`);
        }
        return { success: false, error: 'No transporter' };
      }

      const from = email.from || process.env.EMAIL_FROM || '"AI Tour Rwanda" <aitourrwanda@gmail.com>';

      console.log(`📤 [EmailQueue] Sending email...`);
      console.log(`   📧 From: ${from}`);
      console.log(`   📧 To: ${email.to}`);
      console.log(`   📝 Subject: ${email.subject}`);

      const info = await transporter.sendMail({
        from,
        to: email.to,
        subject: email.subject,
        html: email.html
      });

      console.log(`✅ [EmailQueue] Email sent successfully!`);
      console.log(`   📧 To: ${email.to}`);
      console.log(`   🆔 Message ID: ${info.messageId}`);
      console.log(`   🔗 Preview: ${nodemailer.getTestMessageUrl(info) || 'N/A'}`);
      
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error(`❌ [EmailQueue] Failed to send email to ${email.to}:`);
      console.error(`   📝 Error: ${error.message}`);
      console.error(`   📋 SMTP Code: ${error.responseCode || 'N/A'}`);
      
      if (error.response) {
        console.error(`   📋 SMTP Response: ${error.response}`);
      }

      if (email.retries < this.maxRetries) {
        email.retries++;
        console.log(`🔄 [EmailQueue] Retrying ${email.to} (attempt ${email.retries + 1}/${this.maxRetries})`);
        setTimeout(() => {
          this.queue.unshift(email);
          if (!this.isProcessing) {
            this.process();
          }
        }, this.retryDelay * email.retries);
      } else {
        console.error(`❌ [EmailQueue] Permanently failed for ${email.to} after ${this.maxRetries} attempts`);
      }

      return { success: false, error: error.message };
    }
  }

  getQueueSize() {
    return this.queue.length;
  }

  clear() {
    this.queue = [];
    console.log('📧 [EmailQueue] Queue cleared');
  }
}

const EmailQueue = new EmailQueueClass();
export { EmailQueue };
export default EmailQueue;