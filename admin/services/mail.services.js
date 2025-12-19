import { transporter } from "../config/mail.config.js";

export const sendMail = async (to,otp)=>{
    await transporter.sendMail({
        from:`Akamify Support <no-reply${process.env.GMAIL}>`,
        to:to.trim(),
        subject:'One Time Login OTP',
        html:`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Login OTP</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
</head>
<body style="margin:0; padding:0; background-color:#f4f6f8; font-family:Arial, Helvetica, sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f8; padding:20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:500px; background:#ffffff; border-radius:8px; overflow:hidden;">
          
          <!-- Header -->
          <tr>
            <td style="background:#0d6efd; padding:16px; text-align:center;">
              <h2 style="margin:0; color:#ffffff;">Your Login OTP</h2>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:24px; color:#333333;">
              <p style="font-size:15px; margin:0 0 12px;">
                Hello,
              </p>

              <p style="font-size:15px; margin:0 0 16px;">
                Use the OTP below to securely log in to your account.
              </p>

              <!-- OTP Box -->
              <div style="text-align:center; margin:24px 0;">
                <span style="
                  display:inline-block;
                  background:#f1f3f5;
                  padding:14px 24px;
                  font-size:26px;
                  letter-spacing:4px;
                  font-weight:bold;
                  color:#0d6efd;
                  border-radius:6px;
                ">
                  ${otp}
                </span>
              </div>

              <p style="font-size:14px; color:#555;">
                This OTP is valid for <b>5 minutes</b>.  
                Do not share this code with anyone.
              </p>

              <p style="font-size:14px; color:#999; margin-top:24px;">
                If you did not request this login, please ignore this email.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f1f3f5; padding:12px; text-align:center; font-size:12px; color:#777;">
              © 2025 Your Company Name
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>
`
    })
}