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
      email: this.to, // user email
      message: this.message,
    });

    const mailOptions = {
      from: `📩 Contact Form <${process.env.EMAIL_FROM}>`,
      to: process.env.CONTACT_ADMIN_EMAIL,
      replyTo: this.to,
      subject: `Message from ${this.name} (${this.to}) — ${this.subject}`,
      html,
    };

    const info = await this.transporter.sendMail(mailOptions);
    console.log("Contact email forwarded to staff ✔");
  }
}

export default ContactUsEmail;
