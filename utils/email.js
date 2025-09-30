import nodemailer from 'nodemailer';

let testAccount;
(async () => {
  testAccount = await nodemailer.createTestAccount();
})();

class Email {
  transporter = nodemailer.createTransport({
    host: testAccount.smtp.host,
    port: testAccount.smtp.port,
    secure: testAccount.smtp.secure,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass
    }
  });

  constructor(emailTemplatePath, name, userEmail, subject) {
    this.emailTemplatePath = emailTemplatePath;
    this.name = name;
    this.to = userEmail;
    this.subject = subject;
  }
}

export default Email;
