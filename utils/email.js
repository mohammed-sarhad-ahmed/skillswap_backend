import nodemailer from "nodemailer";

class Email {
  transporter;

  constructor(emailTemplatePath, name, userEmail, subject) {
    this.emailTemplatePath = emailTemplatePath;
    this.name = name;
    this.to = userEmail;
    this.subject = subject;

    this.transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: process.env.GMAIL_USER, // your Gmail address
        pass: process.env.APP_PASSWORD, // your Gmail App Password
      },
    });
  }
}

export default Email;
