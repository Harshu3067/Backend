const express = require('express');
const { PrismaClient } = require('@prisma/client');
const nodemailer = require('nodemailer');
const { google } = require('googleapis');
const bodyParser = require('body-parser');
require('dotenv').config();

const prisma = new PrismaClient();
const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());

// Routes
app.post('/api/referral', async (req, res) => {
  const { referrerName, referrerEmail, friendName, friendEmail } = req.body;

  // Simple validation
  if (!referrerName || !referrerEmail || !friendName || !friendEmail) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    // Save referral data to database
    const referral = await prisma.referral.create({
      data: {
        referrerName,
        referrerEmail,
        friendName,
        friendEmail,
      },
    });

    // Send email notification
    await sendEmail(referrerName, referrerEmail, friendName, friendEmail);

    return res.status(201).json(referral);
  } catch (error) {
    console.error('Error saving referral:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Function to send email notification
async function sendEmail(referrerName, referrerEmail, friendName, friendEmail) {
  const OAuth2 = google.auth.OAuth2;
  const oauth2Client = new OAuth2(
    process.env.CLIENT_ID,
    process.env.CLIENT_SECRET,
    'https://developers.google.com/oauthplayground' // Redirect URL
  );

  oauth2Client.setCredentials({
    refresh_token: process.env.REFRESH_TOKEN,
  });

  const accessToken = await oauth2Client.getAccessToken();

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      type: 'OAuth2',
      user: process.env.SMTP_EMAIL,
      clientId: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      refreshToken: process.env.REFRESH_TOKEN,
      accessToken,
    },
  });

  const mailOptions = {
    from: process.env.SMTP_EMAIL,
    to: referrerEmail,
    subject: 'You have successfully referred a friend!',
    html: `
      <p>Dear ${referrerName},</p>
      <p>Your friend ${friendName} (${friendEmail}) has been referred successfully.</p>
      <p>Thank you for using our referral program!</p>
    `,
  };

  await transporter.sendMail(mailOptions);
  console.log('Email sent:', mailOptions);
}

// Start server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
