'use client';

import React, { useState, useEffect } from 'react';
import { 
  Key, 
  Loader2, 
  Check, 
  X,
  LogOut,
  User,
  Mail
} from 'lucide-react';

// Define all required interfaces
interface GoogleUser {
  email: string;
  name: string;
  picture?: string;
}

interface SwayamResult {
  name: string;
  email: string;
  status: 'success' | 'failed';
  password?: string;
  error?: string;
  timestamp: string;
}

interface AccountSwitcherProps {
  currentUser: GoogleUser | null;
  onLogout: () => void;
  onLogin: () => void;
}

interface SwayamSectionProps {
  isGoogleLoggedIn: boolean;
  currentUser: GoogleUser | null;
  handleGoogleLogin: () => Promise<void>;
  handleLogout: () => void;
}

// AccountSwitcher Component
const AccountSwitcher = ({
  currentUser,
  onLogout,
  onLogin,
}: AccountSwitcherProps) => {
  return (
    <div className="bg-[#282a36] rounded-lg p-4 flex items-center justify-between">
      {currentUser ? (
        <>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center">
              {currentUser.picture ? (
                <img src={currentUser.picture} alt="" className="w-10 h-10 rounded-full" />
              ) : (
                <User className="w-6 h-6 text-white" />
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-200">{currentUser.name}</p>
              <p className="text-xs text-gray-400">{currentUser.email}</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="p-2 text-gray-400 hover:text-gray-300 rounded-lg hover:bg-gray-700"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </>
      ) : (
        <button
          onClick={onLogin}
          className="w-full btn-secondary px-4 py-2 rounded-lg flex items-center justify-center gap-2"
        >
          <Mail className="w-4 h-4" />
          Login with Google
        </button>
      )}
    </div>
  );
};

// Main SwayamSection Component
const SwayamSection = ({ 
  isGoogleLoggedIn, 
  currentUser, 
  handleGoogleLogin, 
  handleLogout 
}: SwayamSectionProps) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [results, setResults] = useState<SwayamResult[]>([]);

  // Load results from localStorage
  useEffect(() => {
    const savedResults = localStorage.getItem('swayamResults');
    if (savedResults) {
      setResults(JSON.parse(savedResults));
    }
  }, []);

  // Save results to localStorage
  useEffect(() => {
    localStorage.setItem('swayamResults', JSON.stringify(results));
  }, [results]);

  const generateCredentials = async () => {
    if (!name || !email || !phone) {
      setError('Please fill all fields');
      return;
    }

    if (!isValidEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    if (!isValidPhone(phone)) {
      setError('Please enter a valid 10-digit phone number');
      return;
    }

    if (!isGoogleLoggedIn) {
      setError('Please login with Google to send credentials via email');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const response = await fetch('https://singupapi-ffnfpldenq-uc.a.run.app/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, phone, name })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      const result: SwayamResult = {
        name,
        email,
        timestamp: new Date().toISOString(),
        status: data.error ? 'failed' : 'success',
        ...(data.error ? { error: data.error.message } : { password: data.password })
      };

      if (result.status === 'success' && result.password) {
        const tokens = localStorage.getItem('googleTokens');
        if (tokens) {
          try {
            const emailResponse = await fetch('/api/send-email', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                to: email,
                subject: 'Your Swayam Credentials',
                body: `Dear ${name},\n\nHere are your Swayam login credentials:\n\nEmail: ${email}\nPassword: ${result.password}\n\nBest regards`,
                tokens: JSON.parse(tokens),
                type: 'credentials'
              }),
            });

            if (!emailResponse.ok) {
              const errorData = await emailResponse.json();
              throw new Error(errorData.error || 'Failed to send email');
            }

            setSuccess('Credentials generated and sent successfully!');
          } catch (emailError) {
            console.error('Failed to send email:', emailError);
            setError('Credentials generated but failed to send email');
          }
        }
      } else {
        setError(result.error || 'Failed to generate credentials');
      }

      setResults(prev => [result, ...prev].slice(0, 10));
      
      if (result.status === 'success') {
        setName('');
        setEmail('');
        setPhone('');
      }
    } catch (err) {
      console.error('Error:', err);
      setError('Failed to generate credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const isValidPhone = (phone: string): boolean => {
    const phoneRegex = /^\d{10}$/;
    return phoneRegex.test(phone);
  };

  return (
    <div className="card-gradient rounded-xl p-6 space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <Key className="w-5 h-5 text-indigo-400" />
        <h2 className="text-xl font-semibold">Generate Swayam Credentials</h2>
      </div>

      <div className="space-y-4">
        <AccountSwitcher
          currentUser={currentUser}
          onLogout={handleLogout}
          onLogin={handleGoogleLogin}
        />

        <input
          type="text"
          placeholder="Enter name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-4 py-2 rounded-lg input-style"
        />

        <input
          type="email"
          placeholder="Enter email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-2 rounded-lg input-style"
        />

        <input
          type="tel"
          placeholder="Enter phone number"
          value={phone}
          onChange={(e) => {
            const value = e.target.value.replace(/\D/g, '');
            if (value.length <= 10) {
              setPhone(value);
            }
          }}
          maxLength={10}
          className="w-full px-4 py-2 rounded-lg input-style"
        />

        <button
          onClick={generateCredentials}
          disabled={loading}
          className="btn-primary w-full px-4 py-2 rounded-lg flex items-center justify-center gap-2"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Key className="w-4 h-4" />
          )}
          {loading ? 'Generating...' : 'Generate Credentials'}
        </button>

        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-200 px-4 py-3 rounded-lg">
            <div className="flex items-center gap-2">
              <X className="w-4 h-4" />
              {error}
            </div>
          </div>
        )}
        {success && (
          <div className="bg-green-500/20 border border-green-500 text-green-200 px-4 py-3 rounded-lg">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4" />
              {success}
            </div>
          </div>
        )}

        {results.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-medium text-gray-200 mb-3">Recent Results</h3>
            <div className="space-y-3">
              {results.map((result, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border ${
                    result.status === 'success' 
                      ? 'border-green-500/50 bg-green-500/10' 
                      : 'border-red-500/50 bg-red-500/10'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-gray-200">{result.name}</p>
                      <p className="text-sm text-gray-400">{result.email}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(result.timestamp).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-sm font-medium">
                      {result.status === 'success' ? (
                        <span className="text-green-400">Success</span>
                      ) : (
                        <span className="text-red-400">Failed</span>
                      )}
                    </div>
                  </div>
                  {result.error && (
                    <p className="text-sm text-red-400 mt-2">{result.error}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SwayamSection;