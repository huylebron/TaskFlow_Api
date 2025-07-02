export const emailTemplates = {
    verifyEmail: (verificationLink) => `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Verify Your Email</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .container {
            background-color: #f9f9f9;
            border-radius: 5px;
            padding: 20px;
            margin: 20px 0;
          }
          .header {
            text-align: center;
            padding: 20px 0;
            background-color: #4a90e2;
            color: white;
            border-radius: 5px 5px 0 0;
          }
          .content {
            padding: 20px;
            background-color: white;
            border-radius: 0 0 5px 5px;
          }
          .button {
            display: inline-block;
            padding: 12px 24px;
            background-color: #4a90e2;
            color: white;
            text-decoration: none;
            border-radius: 5px;
            margin: 20px 0;
          }
          .footer {
            text-align: center;
            margin-top: 20px;
            color: #666;
            font-size: 12px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to Taskflow!</h1>
          </div>
          <div class="content">
            <h2>Verify Your Email Address</h2>
            <p>Thank you for signing up! To complete your registration and start using Taskflow, please verify your email address by clicking the button below:</p>
            
            <div style="text-align: center;">
              <a href="${verificationLink}" class="button">Verify Email Address</a>
            </div>
            
            <p>If the button above doesn't work, you can also copy and paste this link into your browser:</p>
            <p style="word-break: break-all;">${verificationLink}</p>
            
            <p>This verification link will expire in 24 hours.</p>
            
            <p>If you didn't create an account with Taskflow, you can safely ignore this email.</p>
          </div>
          <div class="footer">
            <p>This email was sent by Taskflow. Please do not reply to this email.</p>
            <p>&copy; ${new Date().getFullYear()} Taskflow. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,

    forgotPasswordEmail: (resetPasswordLink, displayName) => `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Reset Your Password</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .container {
            background-color: #f9f9f9;
            border-radius: 5px;
            padding: 20px;
            margin: 20px 0;
          }
          .header {
            text-align: center;
            padding: 20px 0;
            background-color: #e74c3c;
            color: white;
            border-radius: 5px 5px 0 0;
          }
          .content {
            padding: 20px;
            background-color: white;
            border-radius: 0 0 5px 5px;
          }
          .button {
            display: inline-block;
            padding: 12px 24px;
            background-color: #e74c3c;
            color: white;
            text-decoration: none;
            border-radius: 5px;
            margin: 20px 0;
          }
          .warning {
            background-color: #fff3cd;
            border: 1px solid #ffeaa7;
            color: #856404;
            padding: 15px;
            border-radius: 5px;
            margin: 15px 0;
          }
          .footer {
            text-align: center;
            margin-top: 20px;
            color: #666;
            font-size: 12px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Reset Your Password</h1>
          </div>
          <div class="content">
            <h2>Hello ${displayName || 'User'}!</h2>
            <p>We received a request to reset your password for your Taskflow account.</p>
            
            <p>Click the button below to reset your password:</p>
            
            <div style="text-align: center;">
              <a href="${resetPasswordLink}" class="button">Reset Password</a>
            </div>
            
            <p>If the button above doesn't work, you can also copy and paste this link into your browser:</p>
            <p style="word-break: break-all;">${resetPasswordLink}</p>
            
            <div class="warning">
              <strong>Important:</strong>
              <ul>
                <li>This reset link will expire in 1 hour for security reasons.</li>
                <li>If you didn't request this password reset, you can safely ignore this email.</li>
                <li>Your password will remain unchanged until you create a new one.</li>
              </ul>
            </div>
            
            <p>For security reasons, please don't share this link with anyone.</p>
          </div>
          <div class="footer">
            <p>This email was sent by Taskflow. Please do not reply to this email.</p>
            <p>&copy; ${new Date().getFullYear()} Taskflow. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,

    passwordResetSuccessEmail: (displayName) => `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Password Reset Successful</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .container {
            background-color: #f9f9f9;
            border-radius: 5px;
            padding: 20px;
            margin: 20px 0;
          }
          .header {
            text-align: center;
            padding: 20px 0;
            background-color: #27ae60;
            color: white;
            border-radius: 5px 5px 0 0;
          }
          .content {
            padding: 20px;
            background-color: white;
            border-radius: 0 0 5px 5px;
          }
          .success {
            background-color: #d4edda;
            border: 1px solid #c3e6cb;
            color: #155724;
            padding: 15px;
            border-radius: 5px;
            margin: 15px 0;
          }
          .security-tips {
            background-color: #e2e3e5;
            border: 1px solid #d6d8db;
            color: #383d41;
            padding: 15px;
            border-radius: 5px;
            margin: 15px 0;
          }
          .footer {
            text-align: center;
            margin-top: 20px;
            color: #666;
            font-size: 12px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✓ Password Reset Successful</h1>
          </div>
          <div class="content">
            <h2>Hello ${displayName || 'User'}!</h2>
            
            <div class="success">
              <strong>Great news!</strong> Your password has been successfully reset.
            </div>
            
            <p>You can now log in to your Taskflow account using your new password.</p>
            
            <div class="security-tips">
              <strong>Security Tips:</strong>
              <ul>
                <li>Keep your password secure and don't share it with anyone</li>
                <li>Use a strong, unique password for your account</li>
                <li>Consider enabling two-factor authentication if available</li>
                <li>Log out from shared or public computers</li>
              </ul>
            </div>
            
            <p>If you didn't make this change or if you have any concerns about your account security, please contact our support team immediately.</p>
            
            <p>Thank you for using Taskflow!</p>
          </div>
          <div class="footer">
            <p>This email was sent by Taskflow. Please do not reply to this email.</p>
            <p>&copy; ${new Date().getFullYear()} Taskflow. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `
  }