import { google } from 'googleapis';
import { oauth2Client } from './google-auth';

export const sendCertificateEmail = async (
  to: string,
  subject: string,
  body: string,
  attachmentUrl: string,
  tokens: any
) => {
  try {
    oauth2Client.setCredentials(tokens);
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    const pdfResponse = await fetch(attachmentUrl.toString());
    const pdfBuffer = await pdfResponse.arrayBuffer();
    const pdfBase64 = Buffer.from(pdfBuffer).toString('base64');

    const message = [
      'Content-Type: multipart/mixed; boundary="boundary"',
      'MIME-Version: 1.0',
      `To: ${to}`,
      `Subject: ${subject}`,
      '',
      '--boundary',
      'Content-Type: text/plain; charset="UTF-8"',
      'MIME-Version: 1.0',
      'Content-Transfer-Encoding: 7bit',
      '',
      body,
      '',
      '--boundary',
      'Content-Type: application/pdf',
      'MIME-Version: 1.0',
      'Content-Transfer-Encoding: base64',
      'Content-Disposition: attachment; filename="certificate.pdf"',
      '',
      pdfBase64,
      '',
      '--boundary--'
    ].join('\n');

    const encodedMessage = Buffer.from(message)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw: encodedMessage },
    });

    return true;
  } catch (error) {
    console.error('Failed to send certificate email:', error);
    throw error;
  }
};

export const sendCredentialsEmail = async (
  to: string,
  subject: string,
  body: string,
  tokens: any
) => {
  try {
    oauth2Client.setCredentials(tokens);
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    const message = [
      'Content-Type: text/plain; charset="UTF-8"',
      'MIME-Version: 1.0',
      `To: ${to}`,
      `Subject: ${subject}`,
      '',
      body
    ].join('\n');

    const encodedMessage = Buffer.from(message)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw: encodedMessage },
    });

    return true;
  } catch (error) {
    console.error('Failed to send credentials email:', error);
    throw error;
  }
};