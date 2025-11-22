import nodemailer from "nodemailer";
import renderEmail from "./render_template_async.js";
import Email from "./email.js";

class ContactUsEmail extends Email {
  constructor(emailTemplatePath, name, userEmail, subject, message) {
    super(emailTemplatePath, name, userEmail, subject);
    this.message = message;
  }

  async sendEmail() {
    const html = await renderEmail(this.emailTemplatePath, {
      name: this.name,
      email: this.to,
      message: this.message,
    });

    const mailOptions = {
      from: this.userEmail,
      to: process.env.EMAIL_FROM,
      subject: this.subject,
      html,
    };

    const info = await this.transporter.sendMail(mailOptions);
    console.log("Admin Contact Alert Sent ✔");
    console.log("Preview URL:", nodemailer.getTestMessageUrl(info));
  }
}

export default ContactUsEmail;
