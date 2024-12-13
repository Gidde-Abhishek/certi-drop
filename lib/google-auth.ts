import { OAuth2Client } from 'google-auth-library';

const credentials = {
  client_id: "338129749542-mecqgddsvig0ark5l40cq6erhdrmlvj0.apps.googleusercontent.com",
  client_secret: "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",
  redirect_uri: "http://localhost:3000/auth/callback"
};

export const oauth2Client = new OAuth2Client(
  credentials.client_id,
  credentials.client_secret,
  credentials.redirect_uri
);

export const getAuthUrl = () => {
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/gmail.compose',
      'profile',
      'email'
    ]
  });
};

export const getTokens = async (code: string) => {
  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);
  return tokens;
};