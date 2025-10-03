import nodemailer from "nodemailer";
import renderEmail from "./render_template_async.js";
import Email from "./email.js";

class ResetEmail extends Email {
  constructor(emailTemplatePath, name, userEmail, subject, resetUrl) {
    super(emailTemplatePath, name, userEmail, subject);
    this.resetUrl = resetUrl;
  }

  async sendEmail() {
    const html = await renderEmail(this.emailTemplatePath, {
      name: this.name,
      link: this.resetUrl,
    });

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: this.to,
      subject: this.subject,
      html,
    };

    // we need await do not remove it vscode is being stupid
    const info = await this.transporter.sendMail(mailOptions);
    console.log("Preview URL:", nodemailer.getTestMessageUrl(info));
  }
}

export default ResetEmail;
