import { NextRequest, NextResponse } from 'next/server';
import { oauth2Client } from '@/lib/google-auth';

export async function GET() {
  try {
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/gmail.send',
        'https://www.googleapis.com/auth/gmail.compose',
        'profile',
        'email'
      ],
      redirect_uri: 'http://localhost:3000/auth/callback'
    });

    return NextResponse.json({ url: authUrl });
  } catch (error) {
    console.error('Auth URL generation error:', error);
    return NextResponse.json(
      { error: "Failed to generate auth URL" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();
    
    if (!code) {
      return NextResponse.json(
        { error: "No authorization code provided" },
        { status: 400 }
      );
    }

    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    
    return NextResponse.json({ tokens });
  } catch (error) {
    console.error('Token generation error:', error);
    return NextResponse.json(
      { error: "Failed to generate tokens" },
      { status: 500 }
    );
  }
}