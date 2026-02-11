import { Resend } from 'resend';

// Check if API key is available
if (!process.env.RESEND_API_KEY) {
  console.warn('RESEND_API_KEY environment variable is not set. Email functionality will be disabled.');
}

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function sendEmployeeOnboardingEmail({ employeeEmail, firstName, lastName, employeeCode }) {
  if (!employeeEmail) {
    console.log('No email address provided for employee onboarding');
    return { success: false, error: 'No email address provided' };
  }

  if (!resend) {
    console.log('Email service is not configured (missing RESEND_API_KEY)');
    return { success: false, error: 'Email service not configured' };
  }

  if (!process.env.SMTP_FROM) {
    console.log('SMTP_FROM environment variable is not set');
    return { success: false, error: 'Sender email not configured' };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: process.env.SMTP_FROM,
      to: [employeeEmail],
      subject: 'Welcome to JASIQ CoreOps - Your Account Has Been Created',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to JASIQ CoreOps</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background: #1e293b;
              color: white;
              padding: 30px;
              text-align: center;
              border-radius: 8px 8px 0 0;
            }
            .content {
              background: #f8fafc;
              padding: 30px;
              border-radius: 0 0 8px 8px;
            }
            .welcome-text {
              font-size: 24px;
              font-weight: 600;
              margin-bottom: 20px;
              color: #1e293b;
            }
            .info-box {
              background: white;
              padding: 20px;
              border-radius: 6px;
              margin: 20px 0;
              border-left: 4px solid #3b82f6;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #e2e8f0;
              color: #64748b;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Welcome to JASIQ CoreOps</h1>
          </div>
          
          <div class="content">
            <p class="welcome-text">Hello ${firstName} ${lastName},</p>
            
            <p>Your employee account has been successfully created in the JASIQ CoreOps system. We're excited to have you on board!</p>
            
            <div class="info-box">
              <h3>Your Employee Details:</h3>
              <p><strong>Employee Code:</strong> ${employeeCode}</p>
              <p><strong>Email:</strong> ${employeeEmail}</p>
            </div>
            
            <p>You will receive separate instructions about setting up your password and accessing the system.</p>
            
            <p>If you have any questions, please reach out to your HR representative or system administrator.</p>
            
            <div class="footer">
              <p>This is an automated message from JASIQ CoreOps HR Management System.</p>
              <p>© 2026 JASIQ CoreOps. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `
    });

    if (error) {
      console.error('Failed to send onboarding email:', error);
      return { success: false, error: error.message };
    }

    console.log('Onboarding email sent successfully:', data);
    return { success: true, data };
    
  } catch (error) {
    console.error('Error sending onboarding email:', error);
    return { success: false, error: error.message };
  }
}
