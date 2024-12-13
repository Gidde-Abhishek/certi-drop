import { NextRequest, NextResponse } from 'next/server';
import { sendCertificateEmail, sendCredentialsEmail } from '@/lib/email-service';

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const { to, subject, body, attachmentUrl, tokens, type = 'certificate' } = data;

    // Validate common required fields
    if (!to || !subject || !body || !tokens) {
      return NextResponse.json(
        { error: 'Missing required fields: to, subject, body, or tokens' },
        { status: 400 }
      );
    }

    if (type === 'certificate') {
      if (!attachmentUrl) {
        return NextResponse.json(
          { error: 'Missing attachmentUrl for certificate email' },
          { status: 400 }
        );
      }
      await sendCertificateEmail(to, subject, body, attachmentUrl, tokens);
    } else if (type === 'credentials') {
      await sendCredentialsEmail(to, subject, body, tokens);
    } else {
      return NextResponse.json(
        { error: 'Invalid email type' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Email sending error:', error);
    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    );
  }
}