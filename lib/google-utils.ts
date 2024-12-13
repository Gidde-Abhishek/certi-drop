interface GoogleUser {
    email: string;
    name: string;
    accessToken: string;
  }
  
  export const initializeGoogleAuth = (): Promise<void> => {
    return new Promise((resolve) => {
      if (typeof window !== 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.onload = () => resolve();
        document.head.appendChild(script);
      }
    });
  };
  
  export const loginWithGoogle = (): Promise<GoogleUser> => {
    return new Promise((resolve, reject) => {
      try {
        // Replace with your Google Client ID
        const client_id = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
        
        if (!client_id) {
          throw new Error('Google Client ID not configured');
        }
  
        // @ts-ignore - Google Identity Services types not available
        google.accounts.id.initialize({
          client_id,
          callback: async (response: any) => {
            try {
              // Verify the token with your backend
              const result = await fetch('/api/auth/google', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ token: response.credential }),
              });
  
              const data = await result.json();
              resolve(data);
            } catch (error) {
              reject(error);
            }
          },
        });
  
        // @ts-ignore
        google.accounts.id.prompt();
      } catch (error) {
        reject(error);
      }
    });
  };
  
  export const sendEmail = async (
    to: string,
    subject: string,
    body: string,
    attachmentUrl: string,
    accessToken: string
  ): Promise<void> => {
    // Implement email sending using Gmail API
    // This is a placeholder - you'll need to implement the actual Gmail API calls
    const response = await fetch('/api/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        to,
        subject,
        body,
        attachmentUrl,
      }),
    });
  
    if (!response.ok) {
      throw new Error('Failed to send email');
    }
  };