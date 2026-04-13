declare module 'nodemailer' {
  type TransportConfig = {
    auth: {
      pass: string;
      user: string;
    };
    host: string;
    port: number;
    secure: boolean;
  };

  type SendMailInput = {
    from: string;
    subject: string;
    text: string;
    to: string;
  };

  type SendMailResult = {
    messageId: string;
  };

  type Transporter = {
    sendMail(input: SendMailInput): Promise<SendMailResult>;
  };

  const nodemailer: {
    createTransport(config: TransportConfig): Transporter;
  };

  export default nodemailer;
}
