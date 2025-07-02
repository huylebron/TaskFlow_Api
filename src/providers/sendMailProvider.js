import nodemailer from 'nodemailer'
import { env } from '~/config/environment'
require('dotenv').config();
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, 
  auth: {
    user: env.EMAIL_GMAIL,
    pass: env.EMAIL_PASSWORD 
  }
})

export const NodemailerProvider = {
    sendEmail: async (to, subject, html) => {
      try {
        const mailOptions = {
          from: env.EMAIL_GMAIL,
          to,
          subject,
          html
        }
        await transporter.sendMail(mailOptions)
      } catch (error) {
        console.error('Nodemailer error:', error)
        throw error
      }
    }
  }