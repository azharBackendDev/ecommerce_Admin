import dotenv from 'dotenv'
dotenv.config()
import nodemailer from 'nodemailer'



export const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.GMAIL,
    pass: process.env.APP_PASSWORD,
  },
});

transporter.verify((err) => {
  if (err) console.error(err);
  else console.log("Gmail transporter ready");
});
