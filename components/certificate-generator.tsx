'use client';

import React, { useState, useEffect } from 'react';
import { 
  Award, 
  FileText, 
  Mail, 
  Download, 
  Loader2, 
  History,
  Check,
  X,
  AlertCircle,
  Archive,
  LogOut,
  User,
  Key
} from 'lucide-react';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';

// Common Interfaces
interface Certificate {
  name: string;
  url: string;
  timestamp: string;
  status: 'downloaded' | 'emailed' | 'both';
}

interface ExcelRow {
  name: string;
  email?: string;
}

interface GoogleUser {
  email: string;
  name: string;
  picture?: string;
}

interface SwayamCredential {
  email: string;
  password: string;
}

interface SwayamError {
  error: {
    code: string;
    message: string;
  }
}

interface SwayamResult {
  name: string;
  email: string;
  status: 'success' | 'failed';
  password?: string;
  error?: string;
  timestamp: string;
}

type GenerationMode = 'certificate' | 'swayam' | 'both';

interface BulkUploadModalProps {
  onClose: () => void;
  file: File;
  emailTemplate: string;
  isGoogleLoggedIn: boolean;
  onComplete: (certs: Certificate[]) => void;
  currentUser: GoogleUser | null;
  handleGoogleLogin: () => Promise<void>;
  processMode: 'email' | 'zip';
  setProcessMode: (mode: 'email' | 'zip') => void;
}

const parseJwt = (token: string) => {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch (e) {
    return null;
  }
};

// Account Switcher Component
const AccountSwitcher = ({
  currentUser,
  onLogout,
  onLogin,
}: {
  currentUser: GoogleUser | null;
  onLogout: () => void;
  onLogin: () => void;
}) => {
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

// Swayam Section Component
const SwayamSection = ({ 
  isGoogleLoggedIn, 
  currentUser, 
  handleGoogleLogin, 
  handleLogout 
}: {
  isGoogleLoggedIn: boolean;
  currentUser: GoogleUser | null;
  handleGoogleLogin: () => Promise<void>;
  handleLogout: () => void;
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [results, setResults] = useState<SwayamResult[]>([]);

  const generateCredentials = async () => {
    if (!name || !email || !phone) {
      setError('Please fill all fields');
      return;
    }

    if (!isGoogleLoggedIn) {
      setError('Please login with Google to send credentials via email');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('https://singupapi-ffnfpldenq-uc.a.run.app/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, phone, name })
      });

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
          await fetch('/api/send-email', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              to: email,
              subject: 'Your Swayam Credentials',
              body: `Dear ${name},\n\nHere are your Swayam login credentials:\n\nEmail: ${email}\nPassword: ${result.password}\n\nBest regards`,
              tokens: JSON.parse(tokens),
              type: 'credentials'  // Specify email type
            }),
          });
        }
        setSuccess('Credentials generated and sent successfully!');
      } else {
        setError(result.error || 'Failed to generate credentials');
      }

      setResults(prev => [result, ...prev].slice(0, 10));
    } catch (err) {
      setError('Failed to generate credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
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
        placeholder="Enter phone"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
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

      {/* Results History */}
      <div className="mt-4 space-y-2">
        <h3 className="text-lg font-medium text-gray-200 mb-2">Recent Results</h3>
        {results.map((result, index) => (
          <div
            key={index}
            className={`p-4 rounded-lg border ${
              result.status === 'success' 
                ? 'border-green-500/50 bg-green-500/10' 
                : 'border-red-500/50 bg-red-500/10'
            }`}
          >
            <div className="flex justify-between">
              <div>
                <p className="font-medium text-gray-200">{result.name}</p>
                <p className="text-sm text-gray-400">{result.email}</p>
              </div>
              <div className="text-sm">
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
            <p className="text-xs text-gray-500 mt-1">
              {new Date(result.timestamp).toLocaleString()}
            </p>
          </div>
        ))}
      </div>

      {/* Alerts */}
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
    </div>
  );
};

// SwayamBulkModal Component
const SwayamBulkModal = ({
  onClose,
  file,
  isGoogleLoggedIn,
  currentUser,
}: {
  onClose: () => void;
  file: File;
  isGoogleLoggedIn: boolean;
  currentUser: GoogleUser | null;
}) => {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<SwayamResult[]>([]);
  const [error, setError] = useState('');
  const [data, setData] = useState<{ name: string; email: string; phone: string; }[]>([]);

  useEffect(() => {
    parseExcelFile(file);
  }, [file]);

  const parseExcelFile = async (file: File) => {
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const rawData = XLSX.utils.sheet_to_json(worksheet, { raw: false });

      const validData = rawData.map((row: any) => ({
        name: row.name || row.Name || '',
        email: row.email || row.Email || '',
        phone: row.phone || row.Phone || ''
      })).filter(row => {
        return row.name && row.email && row.phone;
      });

      setData(validData);
    } catch (error) {
      setError('Failed to parse Excel file');
    }
  };

  const processAll = async () => {
    setLoading(true);
    const results: SwayamResult[] = [];

    for (let i = 0; i < data.length; i++) {
      const { name, email, phone } = data[i];
      try {
        const response = await fetch('https://singupapi-ffnfpldenq-uc.a.run.app/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, phone, name })
        });

        const responseData = await response.json();
        
        const result: SwayamResult = {
          name,
          email,
          timestamp: new Date().toISOString(),
          status: responseData.error ? 'failed' : 'success',
          ...(responseData.error ? { error: responseData.error.message } : { password: responseData.password })
        };

        if (result.status === 'success' && result.password && isGoogleLoggedIn) {
          const tokens = localStorage.getItem('googleTokens');
          if (tokens) {
            try {
              await fetch('/api/send-email', {
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
            } catch (emailError) {
              console.error('Failed to send email:', emailError);
            }
          }
        }

        results.push(result);
        setProgress(Math.round(((i + 1) / data.length) * 100));
      } catch (error) {
        results.push({
          name,
          email,
          timestamp: new Date().toISOString(),
          status: 'failed',
          error: 'Failed to generate credentials'
        });
      }
    }

    setResults(results);
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-[#282a36] rounded-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-100">Bulk Credential Generation</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-300">
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="space-y-4">
            <div className="w-full bg-gray-700 rounded-full h-4">
              <div 
                className="bg-indigo-500 h-4 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <p className="text-center text-gray-300">
              Processing... {progress}% complete
            </p>
          </div>
        ) : results.length > 0 ? (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-200">Results</h3>
            <div className="space-y-2">
              {results.map((result, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border ${
                    result.status === 'success' 
                      ? 'border-green-500/50 bg-green-500/10' 
                      : 'border-red-500/50 bg-red-500/10'
                  }`}
                >
                  <div className="flex justify-between">
                    <div>
                      <p className="font-medium text-gray-200">{result.name}</p>
                      <p className="text-sm text-gray-400">{result.email}</p>
                    </div>
                    <div className="text-sm">
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
            <div className="flex justify-end">
              <button
                onClick={onClose}
                className="bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="border border-gray-700 rounded-lg p-4">
              <h3 className="text-lg font-medium text-gray-200 mb-2">Preview</h3>
              <div className="max-h-64 overflow-y-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="text-left text-gray-400 p-2">Name</th>
                      <th className="text-left text-gray-400 p-2">Email</th>
                      <th className="text-left text-gray-400 p-2">Phone</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((row, index) => (
                      <tr key={index} className="border-t border-gray-700">
                        <td className="p-2 text-gray-300">{row.name}</td>
                        <td className="p-2 text-gray-300">{row.email}</td>
                        <td className="p-2 text-gray-300">{row.phone}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {!isGoogleLoggedIn && (
              <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-4">
                <div className="flex items-center gap-2 text-yellow-200">
                  <AlertCircle className="w-5 h-5" />
                  <p>Google login required for sending credentials via email</p>
                </div>
              </div>
            )}

            <button
              onClick={processAll}
              className="w-full bg-indigo-500 hover:bg-indigo-600 text-white py-2 px-4 rounded-lg flex items-center justify-center gap-2"
            >
              <Key className="w-4 h-4" />
              Process {data.length} Entries
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// BulkUploadModal Component
const BulkUploadModal = ({
  onClose,
  file,
  emailTemplate,
  isGoogleLoggedIn,
  onComplete,
  currentUser,
  handleGoogleLogin,
  processMode,
  setProcessMode
}: BulkUploadModalProps) => {
  const [excelData, setExcelData] = useState<ExcelRow[]>([]);
  const [processing, setProcessing] = useState(false);
  const [currentProgress, setCurrentProgress] = useState(0);
  const [status, setStatus] = useState<'preview' | 'processing' | 'complete'>('preview');
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  useEffect(() => {
    parseExcelFile(file);
  }, [file]);

  const parseExcelFile = async (file: File) => {
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const rawData = XLSX.utils.sheet_to_json(worksheet, { raw: false });

      const validData = rawData.map((row: any) => {
        const name = row['name'] || row['Name'] || row['NAME'] || Object.values(row)[0];
        const email = row['email'] || row['Email'] || row['EMAIL'] || Object.values(row)[1];

        return {
          name: name?.toString() || '',
          email: email?.toString() || ''
        };
      }).filter(row => {
        if (!row.name) {
          console.log('Filtering out row due to no name:', row);
          return false;
        }
        if (row.email && !isValidEmail(row.email)) {
          console.log('Filtering out row due to invalid email:', row);
          return false;
        }
        return true;
      });

      setExcelData(validData);
      
      if (validData.length === 0) {
        setError('No valid data found in Excel file. Please make sure your file has columns for name and email (optional).');
      }
    } catch (error) {
      console.error('Excel parsing error:', error);
      setError('Failed to parse Excel file. Please make sure it\'s a valid Excel file with proper columns.');
    }
  };

  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const downloadZip = async (urls: { name: string, url: string }[]) => {
    try {
      console.log('Starting zip creation with URLs:', urls);
      const zip = new JSZip();
      const certFolder = zip.folder("certificates");
      
      if (!certFolder) {
        throw new Error('Failed to create certificates folder in zip');
      }

      setCurrentProgress(0);

      for (let i = 0; i < urls.length; i++) {
        const { name, url } = urls[i];
        console.log(`Processing ${i + 1}/${urls.length}: ${name}`);

        try {
          const response = await fetch('/api/proxy-pdf', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ url })
          });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const blob = await response.blob();
          const fileName = `${name.replace(/[^a-z0-9]/gi, '_')}.pdf`;
          certFolder.file(fileName, blob);
          
          setCurrentProgress(Math.round(((i + 1) / urls.length) * 100));
        } catch (error) {
          console.error(`Failed to download certificate for ${name}:`, error);
        }
      }

      console.log('Generating final zip file...');
      const content = await zip.generateAsync({
        type: "blob",
        compression: "DEFLATE",
        compressionOptions: { level: 6 }
      });

      if (content.size === 0) {
        throw new Error('Generated zip file is empty');
      }

      const downloadUrl = URL.createObjectURL(content);
      const downloadLink = document.createElement('a');
      downloadLink.href = downloadUrl;
      downloadLink.download = `certificates-${new Date().toISOString().slice(0, 10)}.zip`;
      
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      
      setTimeout(() => {
        URL.revokeObjectURL(downloadUrl);
      }, 1000);

      return true;
    } catch (error) {
      console.error('Zip creation failed:', error);
      setError(`Failed to create zip file: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  };

  const processBulkGeneration = async () => {
    setStatus('processing');
    setProcessing(true);
    setError('');
    setSuccess('');
    
    const total = excelData.length;
    const generatedCertificates: Certificate[] = [];
    const certificateUrls: { name: string, url: string }[] = [];

    for (let i = 0; i < excelData.length; i++) {
      const row = excelData[i];
      try {
        const response = await fetch('https://choicecert.snipeit.ai/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: row.name })
        });

        if (!response.ok) {
          throw new Error(`Failed to generate certificate: ${response.statusText}`);
        }

        const data = await response.json();
        certificateUrls.push({ name: row.name, url: data.url });
        
        if (processMode === 'email' && row.email && isGoogleLoggedIn) {
          const tokens = localStorage.getItem('googleTokens');
          if (tokens) {
            try {
              const emailResponse = await fetch('/api/send-email', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  to: row.email,
                  subject: 'Your Certificate',
                  body: emailTemplate.replace('${name}', row.name),
                  attachmentUrl: data.url,
                  tokens: JSON.parse(tokens),
                }),
              });

              if (!emailResponse.ok) {
                throw new Error('Failed to send email');
              }
            } catch (emailError) {
              console.error(`Failed to send email to ${row.email}:`, emailError);
            }
          }
        }
        
        const newCert: Certificate = {
          name: row.name,
          url: data.url,
          timestamp: new Date().toISOString(),
          status: processMode === 'email' && row.email ? 'both' : 'downloaded'
        };
        
        generatedCertificates.push(newCert);
        setCurrentProgress(Math.round(((i + 1) / total) * 50));
      } catch (err) {
        console.error(`Error generating certificate for ${row.name}:`, err);
      }
    }

    if (certificateUrls.length === 0) {
      setError('Failed to generate any certificates');
      setStatus('complete');
      setProcessing(false);
      return;
    }

    if (processMode === 'zip') {
      const downloadSuccess = await downloadZip(certificateUrls);
      
      if (downloadSuccess) {
        setSuccess(`Successfully processed ${certificateUrls.length} certificates`);
      } else {
        setError('Failed to create zip file. Check console for details.');
      }
    } else if (processMode === 'email') {
      setSuccess(`Successfully processed and emailed ${certificateUrls.length} certificates`);
    }

    onComplete(generatedCertificates);
    setStatus('complete');
    setProcessing(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-[#282a36] rounded-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-100">Bulk Certificate Generation</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-300">
            <X className="w-5 h-5" />
          </button>
        </div>

        {status === 'preview' && (
          <>
            <div className="space-y-4">
              <div className="flex gap-4 mb-6">
                <button
                  onClick={() => setProcessMode('email')}
                  className={`flex-1 py-2 px-4 rounded-lg flex items-center justify-center gap-2 ${
                    processMode === 'email' 
                      ? 'bg-indigo-500 text-white' 
                      : 'bg-gray-700 text-gray-300'
                  }`}
                >
                  <Mail className="w-4 h-4" />
                  Generate & Email
                </button>
                <button
                  onClick={() => setProcessMode('zip')}
                  className={`flex-1 py-2 px-4 rounded-lg flex items-center justify-center gap-2 ${
                    processMode === 'zip' 
                      ? 'bg-indigo-500 text-white' 
                      : 'bg-gray-700 text-gray-300'
                  }`}
                >
                  <Archive className="w-4 h-4" />
                  Generate & Download Zip
                </button>
              </div>

              <div className="border border-gray-700 rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-200 mb-2">Preview</h3>
                <div className="max-h-64 overflow-y-auto">
                  <table className="w-full">
                    <thead>
                      <tr>
                        <th className="text-left text-gray-400 p-2">Name</th>
                        <th className="text-left text-gray-400 p-2">Email</th>
                      </tr>
                    </thead>
                    <tbody>
                      {excelData.map((row, index) => (
                        <tr key={index} className="border-t border-gray-700">
                          <td className="p-2 text-gray-300">{row.name}</td>
                          <td className="p-2 text-gray-300">{row.email || 'N/A'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {processMode === 'email' && !isGoogleLoggedIn && (
                <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-yellow-200">
                    <AlertCircle className="w-5 h-5" />
                    <p>Google login required for sending emails</p>
                  </div>
                </div>
              )}

              <button
                onClick={processBulkGeneration}
                className="w-full bg-indigo-500 hover:bg-indigo-600 text-white py-2 px-4 rounded-lg flex items-center justify-center gap-2"
              >
                {processMode === 'email' ? <Mail className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
                Process {excelData.length} Certificates
              </button>
            </div>
          </>
        )}

        {status === 'processing' && (
          <div className="space-y-4">
            <div className="w-full bg-gray-700 rounded-full h-4">
              <div 
                className="bg-indigo-500 h-4 rounded-full transition-all duration-300"
                style={{ width: `${currentProgress}%` }}
              ></div>
            </div>
            <p className="text-center text-gray-300">
              Processing... {currentProgress}% complete
            </p>
          </div>
        )}

        {status === 'complete' && (
          <div className="text-center space-y-4">
            {error ? (
              <div className="flex items-center justify-center gap-2 text-red-400">
                <AlertCircle className="w-6 h-6" />
                <p>{error}</p>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2 text-green-400">
                <Check className="w-6 h-6" />
                <p>{success || 'All certificates have been processed!'}</p>
              </div>
            )}
            <button
              onClick={onClose}
              className="bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-lg"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export const CertificateGenerator = () => {
  // State Management
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [processMode, setProcessMode] = useState<'email' | 'zip'>('email');
  const [emailTemplate, setEmailTemplate] = useState(
    'Dear ${name},\n\nPlease find your certificate attached.\n\nBest regards'
  );
  const [sendEmail, setSendEmail] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isGoogleLoggedIn, setIsGoogleLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<GoogleUser | null>(null);
  const [history, setHistory] = useState<Certificate[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showSwayamBulkUpload, setShowSwayamBulkUpload] = useState(false);
  const [selectedSwayamFile, setSelectedSwayamFile] = useState<File | null>(null);

  // // Effects
  // useEffect(() => {
  //   const tokens = localStorage.getItem('googleTokens');
  //   if (tokens) {
  //     const parsedTokens = JSON.parse(tokens);
  //     if (parsedTokens.id_token) {
  //       const userData = parseJwt(parsedTokens.id_token);
  //       if (userData) {
  //         setCurrentUser({
  //           email: userData.email,
  //           name: userData.name,
  //           picture: userData.picture
  //         });
  //         setIsGoogleLoggedIn(true);
  //       }
  //     }
  //   }

  //   const savedHistory = localStorage.getItem('certificateHistory');
  //   if (savedHistory) {
  //     setHistory(JSON.parse(savedHistory));
  //   }
  // }, []);
  // In the useEffect where tokens are checked
useEffect(() => {
  const tokens = localStorage.getItem('googleTokens');
  if (tokens) {
    try {
      const parsedTokens = JSON.parse(tokens);
      console.log('Current tokens:', {
        hasAccessToken: !!parsedTokens.access_token,
        hasRefreshToken: !!parsedTokens.refresh_token,
        tokenType: parsedTokens.token_type,
      });
      
      if (parsedTokens.id_token) {
        const userData = parseJwt(parsedTokens.id_token);
        if (userData) {
          setCurrentUser({
            email: userData.email,
            name: userData.name,
            picture: userData.picture
          });
          setIsGoogleLoggedIn(true);
        }
      }
    } catch (e) {
      console.error('Error parsing tokens:', e);
    }
  }
}, []);

  useEffect(() => {
    localStorage.setItem('certificateHistory', JSON.stringify(history));
  }, [history]);

  // Handlers
  const handleGoogleLogin = async () => {
    try {
      const response = await fetch('/api/auth');
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      setError('Failed to initialize Google login');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('googleTokens');
    setIsGoogleLoggedIn(false);
    setCurrentUser(null);
  };

  const generateSingleCertificate = async () => {
    if (!name) {
      setError('Please enter a name');
      return;
    }

    if (sendEmail) {
      if (!email) {
        setError('Please enter an email address');
        return;
      }
      if (!isGoogleLoggedIn) {
        setError('Please login with Google to send emails');
        return;
      }
    }

    setLoading(true);
    setError('');
    try {
      const response = await fetch('https://choicecert.snipeit.ai/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name }),
      });

      const data = await response.json();

// In generateSingleCertificate function
if (sendEmail) {
  const tokens = localStorage.getItem('googleTokens');
  if (!tokens) throw new Error('Not authenticated');

  const emailPayload = {
    to: email,
    subject: 'Your Certificate',
    body: emailTemplate.replace('${name}', name),
    attachmentUrl: data.url,
    tokens: JSON.parse(tokens),
  };

  console.log('Sending email with payload:', emailPayload);

  const emailResponse = await fetch('/api/send-email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(emailPayload),
  });

  if (!emailResponse.ok) {
    const errorData = await emailResponse.json();
    throw new Error(`Failed to send email: ${errorData.error}`);
  }
}

      // if (sendEmail) {
      //   const tokens = localStorage.getItem('googleTokens');
      //   if (!tokens) throw new Error('Not authenticated');

      //   const emailResponse = await fetch('/api/send-email', {
      //     method: 'POST',
      //     headers: {
      //       'Content-Type': 'application/json',
      //     },
      //     body: JSON.stringify({
      //       to: email,
      //       subject: 'Your Certificate',
      //       body: emailTemplate.replace('${name}', name),
      //       attachmentUrl: data.url,
      //       tokens: JSON.parse(tokens),
      //     }),
      //   });

      //   if (!emailResponse.ok) {
      //     throw new Error('Failed to send email');
      //   }
      // }

      const newCertificate: Certificate = {
        name,
        url: data.url,
        timestamp: new Date().toISOString(),
        status: sendEmail ? 'both' : 'downloaded',
      };

      setHistory(prev => [newCertificate, ...prev].slice(0, 10));
      setSuccess('Certificate generated successfully!');

      // Download the certificate
      const link = document.createElement('a');
      link.href = data.url;
      link.download = `certificate-${name}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

    } catch (error) {
      setError('Failed to generate certificate: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleBulkComplete = (newCertificates: Certificate[]) => {
    setHistory(prev => [...newCertificates, ...prev].slice(0, 10));
    setSuccess(`Successfully processed ${newCertificates.length} certificates`);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-white flex items-center justify-center gap-2">
          <Award className="w-8 h-8 text-indigo-400" />
          Certificate Generator
        </h1>
        <p className="text-gray-400">Generate and email certificates with ease</p>
      </div>

      {/* Sections Grid */}
      <div className="grid gap-8">
        {/* Certificates Section */}
        <div className="grid gap-8 md:grid-cols-2">
          {/* Single Certificate Generation */}
          <div className="card-gradient rounded-xl p-6 space-y-6">
            <div className="flex items-center gap-2 mb-4">
              <Award className="w-5 h-5 text-indigo-400" />
              <h2 className="text-xl font-semibold">Single Certificate</h2>
            </div>

            <div className="space-y-4">
              <input
                type="text"
                placeholder="Enter name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 rounded-lg input-style"
              />

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="sendEmail"
                  checked={sendEmail}
                  onChange={(e) => setSendEmail(e.target.checked)}
                  className="rounded border-gray-600"
                />
                <label htmlFor="sendEmail" className="text-gray-300">
                  Send via email
                </label>
              </div>

              {sendEmail && (
                <div className="space-y-4">
                  <AccountSwitcher
                    currentUser={currentUser}
                    onLogout={handleLogout}
                    onLogin={handleGoogleLogin}
                  />

                  <input
                    type="email"
                    placeholder="Enter email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg input-style"
                  />

                  <textarea
                    placeholder="Enter email template"
                    value={emailTemplate}
                    onChange={(e) => setEmailTemplate(e.target.value)}
                    rows={4}
                    className="w-full px-4 py-2 rounded-lg input-style"
                  />
                </div>
              )}

              <button
                onClick={generateSingleCertificate}
                disabled={loading}
                className="btn-primary w-full px-4 py-2 rounded-lg flex items-center justify-center gap-2"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                {loading ? 'Generating...' : 'Generate Certificate'}
              </button>
            </div>
          </div>

          {/* Bulk Certificate Generation */}
          <div className="card-gradient rounded-xl p-6 space-y-6">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5 text-indigo-400" />
              <h2 className="text-xl font-semibold">Bulk Generation</h2>
            </div>

            <div className="border-2 border-dashed border-gray-700 rounded-lg p-8 text-center space-y-4">
              <FileText className="w-12 h-12 mx-auto text-gray-500" />
              <div>
                <label className="btn-secondary px-6 py-2 rounded-lg cursor-pointer">
                  Upload Excel File
                  <input
                    type="file"
                    className="hidden"
                    accept=".xlsx,.xls"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setSelectedFile(file);
                        setShowBulkUpload(true);
                      }
                    }}
                    disabled={loading}
                  />
                </label>
              </div>
              <p className="text-gray-500 text-sm">
                Supports .xlsx and .xls files
              </p>
            </div>
          </div>
        </div>

        {/* Swayam Credentials Section */}
        <div className="card-gradient rounded-xl p-6 space-y-6">
          <div className="flex items-center gap-2 mb-4">
            <Key className="w-5 h-5 text-indigo-400" />
            <h2 className="text-xl font-semibold">Swayam Credentials</h2>
          </div>

          <div className="grid gap-8 md:grid-cols-2">
            {/* Single Generation */}
            <SwayamSection
              isGoogleLoggedIn={isGoogleLoggedIn}
              currentUser={currentUser}
              handleGoogleLogin={handleGoogleLogin}
              handleLogout={handleLogout}
            />

            {/* Bulk Generation */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-200">Bulk Generation</h3>
              <div className="border-2 border-dashed border-gray-700 rounded-lg p-8 text-center space-y-4">
                <FileText className="w-12 h-12 mx-auto text-gray-500" />
                <div>
                  <label className="btn-secondary px-6 py-2 rounded-lg cursor-pointer">
                    Upload Excel File
                    <input
                      type="file"
                      className="hidden"
                      accept=".xlsx,.xls"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setSelectedSwayamFile(file);
                          setShowSwayamBulkUpload(true);
                        }
                      }}
                      disabled={loading}
                    />
                  </label>
                </div>
                <p className="text-gray-500 text-sm">
                  Excel file should contain name, email, and phone columns
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* History Section */}
        <div className="card-gradient rounded-xl p-6">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="w-full btn-secondary px-4 py-2 rounded-lg flex items-center justify-center gap-2"
          >
            <History className="w-4 h-4" />
            {showHistory ? 'Hide History' : 'Show History'}
          </button>

          {showHistory && (
            <div className="mt-4 space-y-2">
              {history.length === 0 ? (
                <p className="text-center text-gray-500 py-4">
                  No certificates generated yet
                </p>
              ) : (
                history.map((cert, index) => (
                  <div
                    key={index}
                    className="bg-[#1f2128] rounded-lg p-4 flex justify-between items-center border border-gray-800"
                  >
                    <div>
                      <p className="font-medium text-gray-200">{cert.name}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(cert.timestamp).toLocaleString()}
                      </p>
                    </div>
                    <button
                      onClick={() => window.open(cert.url)}
                      className="btn-secondary p-2 rounded-lg"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Alerts */}
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

      {/* Modals */}
      {showBulkUpload && selectedFile && (
        <BulkUploadModal
          file={selectedFile}
          onClose={() => {
            setShowBulkUpload(false);
            setSelectedFile(null);
          }}
          emailTemplate={emailTemplate}
          isGoogleLoggedIn={isGoogleLoggedIn}
          onComplete={handleBulkComplete}
          currentUser={currentUser}
          handleGoogleLogin={handleGoogleLogin}
          processMode={processMode}
          setProcessMode={setProcessMode}
        />
      )}

      {showSwayamBulkUpload && selectedSwayamFile && (
        <SwayamBulkModal
          file={selectedSwayamFile}
          onClose={() => {
            setShowSwayamBulkUpload(false);
            setSelectedSwayamFile(null);
          }}
          isGoogleLoggedIn={isGoogleLoggedIn}
          currentUser={currentUser}
        />
      )}
    </div>
  );
};


// const SwayamBulkModal = ({
//   onClose,
//   file,
//   isGoogleLoggedIn,
//   currentUser,
// }: {
//   onClose: () => void;
//   file: File;
//   isGoogleLoggedIn: boolean;
//   currentUser: GoogleUser | null;
// }) => {
//   const [loading, setLoading] = useState(false);
//   const [progress, setProgress] = useState(0);
//   const [results, setResults] = useState<SwayamResult[]>([]);
//   const [error, setError] = useState('');
//   const [data, setData] = useState<{ name: string; email: string; phone: string; }[]>([]);

//   useEffect(() => {
//     parseExcelFile(file);
//   }, [file]);

//   const parseExcelFile = async (file: File) => {
//     try {
//       const data = await file.arrayBuffer();
//       const workbook = XLSX.read(data);
//       const worksheet = workbook.Sheets[workbook.SheetNames[0]];
//       const rawData = XLSX.utils.sheet_to_json(worksheet, { raw: false });

//       const validData = rawData.map((row: any) => ({
//         name: row.name || row.Name || '',
//         email: row.email || row.Email || '',
//         phone: row.phone || row.Phone || ''
//       })).filter(row => {
//         return row.name && row.email && row.phone;
//       });

//       setData(validData);
//     } catch (error) {
//       setError('Failed to parse Excel file');
//     }
//   };

//   const processAll = async () => {
//     setLoading(true);
//     const results: SwayamResult[] = [];

//     for (let i = 0; i < data.length; i++) {
//       const { name, email, phone } = data[i];
//       try {
//         const response = await fetch('https://singupapi-ffnfpldenq-uc.a.run.app/', {
//           method: 'POST',
//           headers: { 'Content-Type': 'application/json' },
//           body: JSON.stringify({ email, phone, name })
//         });

//         const responseData = await response.json();
        
//         const result: SwayamResult = {
//           name,
//           email,
//           timestamp: new Date().toISOString(),
//           status: responseData.error ? 'failed' : 'success',
//           ...(responseData.error ? { error: responseData.error.message } : { password: responseData.password })
//         };

//         if (result.status === 'success' && result.password && isGoogleLoggedIn) {
//           const tokens = localStorage.getItem('googleTokens');
//           if (tokens) {
//             try {
//               await fetch('/api/send-email', {
//                 method: 'POST',
//                 headers: {
//                   'Content-Type': 'application/json',
//                 },
//                 body: JSON.stringify({
//                   to: email,
//                   subject: 'Your Swayam Credentials',
//                   body: `Dear ${name},\n\nHere are your Swayam login credentials:\n\nEmail: ${email}\nPassword: ${result.password}\n\nBest regards`,
//                   tokens: JSON.parse(tokens),
//                 }),
//               });
//             } catch (emailError) {
//               console.error('Failed to send email:', emailError);
//             }
//           }
//         }

//         results.push(result);
//         setProgress(Math.round(((i + 1) / data.length) * 100));
//       } catch (error) {
//         results.push({
//           name,
//           email,
//           timestamp: new Date().toISOString(),
//           status: 'failed',
//           error: 'Failed to generate credentials'
//         });
//       }
//     }

//     setResults(results);
//     setLoading(false);
//   };

//   return (
//     <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
//       <div className="bg-[#282a36] rounded-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
//         <div className="flex justify-between items-center mb-4">
//           <h2 className="text-xl font-semibold text-gray-100">Bulk Credential Generation</h2>
//           <button onClick={onClose} className="text-gray-400 hover:text-gray-300">
//             <X className="w-5 h-5" />
//           </button>
//         </div>

//         {loading ? (
//           <div className="space-y-4">
//             <div className="w-full bg-gray-700 rounded-full h-4">
//               <div 
//                 className="bg-indigo-500 h-4 rounded-full transition-all duration-300"
//                 style={{ width: `${progress}%` }}
//               ></div>
//             </div>
//             <p className="text-center text-gray-300">
//               Processing... {progress}% complete
//             </p>
//           </div>
//         ) : results.length > 0 ? (
//           <div className="space-y-4">
//             <h3 className="text-lg font-medium text-gray-200">Results</h3>
//             <div className="space-y-2">
//               {results.map((result, index) => (
//                 <div
//                   key={index}
//                   className={`p-4 rounded-lg border ${
//                     result.status === 'success' 
//                       ? 'border-green-500/50 bg-green-500/10' 
//                       : 'border-red-500/50 bg-red-500/10'
//                   }`}
//                 >
//                   <div className="flex justify-between">
//                     <div>
//                       <p className="font-medium text-gray-200">{result.name}</p>
//                       <p className="text-sm text-gray-400">{result.email}</p>
//                     </div>
//                     <div className="text-sm">
//                       {result.status === 'success' ? (
//                         <span className="text-green-400">Success</span>
//                       ) : (
//                         <span className="text-red-400">Failed</span>
//                       )}
//                     </div>
//                   </div>
//                   {result.error && (
//                     <p className="text-sm text-red-400 mt-2">{result.error}</p>
//                   )}
//                 </div>
//               ))}
//             </div>
//             <div className="flex justify-end">
//               <button
//                 onClick={onClose}
//                 className="bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-lg"
//               >
//                 Close
//               </button>
//             </div>
//           </div>
//         ) : (
//           <div className="space-y-4">
//             <div className="border border-gray-700 rounded-lg p-4">
//               <h3 className="text-lg font-medium text-gray-200 mb-2">Preview</h3>
//               <div className="max-h-64 overflow-y-auto">
//                 <table className="w-full">
//                   <thead>
//                     <tr>
//                       <th className="text-left text-gray-400 p-2">Name</th>
//                       <th className="text-left text-gray-400 p-2">Email</th>
//                       <th className="text-left text-gray-400 p-2">Phone</th>
//                     </tr>
//                   </thead>
//                   <tbody>
//                     {data.map((row, index) => (
//                       <tr key={index} className="border-t border-gray-700">
//                         <td className="p-2 text-gray-300">{row.name}</td>
//                         <td className="p-2 text-gray-300">{row.email}</td>
//                         <td className="p-2 text-gray-300">{row.phone}</td>
//                       </tr>
//                     ))}
//                   </tbody>
//                 </table>
//               </div>
//             </div>

//             {!isGoogleLoggedIn && (
//               <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-4">
//                 <div className="flex items-center gap-2 text-yellow-200">
//                   <AlertCircle className="w-5 h-5" />
//                   <p>Google login required for sending credentials via email</p>
//                   </div>
//               </div>
//             )}

//             <button
//               onClick={processAll}
//               className="w-full bg-indigo-500 hover:bg-indigo-600 text-white py-2 px-4 rounded-lg flex items-center justify-center gap-2"
//             >
//               <Key className="w-4 h-4" />
//               Process {data.length} Entries
//             </button>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// };

// const AccountSwitcher = ({
//   currentUser,
//   onLogout,
//   onLogin,
// }: {
//   currentUser: GoogleUser | null;
//   onLogout: () => void;
//   onLogin: () => void;
// }) => {
//   return (
//     <div className="bg-[#282a36] rounded-lg p-4 flex items-center justify-between">
//       {currentUser ? (
//         <>
//           <div className="flex items-center gap-3">
//             <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center">
//               {currentUser.picture ? (
//                 <img src={currentUser.picture} alt="" className="w-10 h-10 rounded-full" />
//               ) : (
//                 <User className="w-6 h-6 text-white" />
//               )}
//             </div>
//             <div>
//               <p className="text-sm font-medium text-gray-200">{currentUser.name}</p>
//               <p className="text-xs text-gray-400">{currentUser.email}</p>
//             </div>
//           </div>
//           <button
//             onClick={onLogout}
//             className="p-2 text-gray-400 hover:text-gray-300 rounded-lg hover:bg-gray-700"
//           >
//             <LogOut className="w-5 h-5" />
//           </button>
//         </>
//       ) : (
//         <button
//           onClick={onLogin}
//           className="w-full btn-secondary px-4 py-2 rounded-lg flex items-center justify-center gap-2"
//         >
//           <Mail className="w-4 h-4" />
//           Login with Google
//         </button>
//       )}
//     </div>
//   );
// };

// interface Certificate {
//     name: string;
//     url: string;
//     timestamp: string;
//     status: 'downloaded' | 'emailed' | 'both';
//   }
  
//   interface ExcelRow {
//     name: string;
//     email?: string;
//   }
  
//   interface BulkUploadModalProps {
//     onClose: () => void;
//     file: File;
//     emailTemplate: string;
//     isGoogleLoggedIn: boolean;
//     onComplete: (certs: Certificate[]) => void;
//   }
  
//   const BulkUploadModal = ({
//     onClose,
//     file,
//     emailTemplate,
//     isGoogleLoggedIn,
//     onComplete,
//     currentUser,
//     handleGoogleLogin
//   }: BulkUploadModalProps) => {
//     const [excelData, setExcelData] = useState<ExcelRow[]>([]);
//     const [processing, setProcessing] = useState(false);
//     const [currentProgress, setCurrentProgress] = useState(0);
//     const [status, setStatus] = useState<'preview' | 'processing' | 'complete'>('preview');
//     const [error, setError] = useState<string>('');
//     const [success, setSuccess] = useState<string>('');
//     const [processMode, setProcessMode] = useState<'email' | 'zip'>('email');
//     const [showSwayamBulkUpload, setShowSwayamBulkUpload] = useState(false);
// const [selectedSwayamFile, setSelectedSwayamFile] = useState<File | null>(null);

//   useEffect(() => {
//     parseExcelFile(file);
//   }, [file]);

//   const parseExcelFile = async (file: File) => {
//     try {
//       const data = await file.arrayBuffer();
//       const workbook = XLSX.read(data);
//       const worksheet = workbook.Sheets[workbook.SheetNames[0]];
//       const rawData = XLSX.utils.sheet_to_json(worksheet, { raw: false });

//       console.log('Raw Excel Data:', rawData);

//       const validData = rawData.map((row: any) => {
//         const name = row['name'] || row['Name'] || row['NAME'] || Object.values(row)[0];
//         const email = row['email'] || row['Email'] || row['EMAIL'] || Object.values(row)[1];

//         return {
//           name: name?.toString() || '',
//           email: email?.toString() || ''
//         };
//       }).filter(row => {
//         if (!row.name) {
//           console.log('Filtering out row due to no name:', row);
//           return false;
//         }
//         if (row.email && !isValidEmail(row.email)) {
//           console.log('Filtering out row due to invalid email:', row);
//           return false;
//         }
//         return true;
//       });

//       console.log('Processed Data:', validData);
//       setExcelData(validData);
      
//       if (validData.length === 0) {
//         setError('No valid data found in Excel file. Please make sure your file has columns for name and email (optional).');
//       }
//     } catch (error) {
//       console.error('Excel parsing error:', error);
//       setError('Failed to parse Excel file. Please make sure it\'s a valid Excel file with proper columns.');
//     }
//   };

//   const isValidEmail = (email: string): boolean => {
//     const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
//     return emailRegex.test(email);
//   };

// //   const downloadZip = async (urls: { name: string, url: string }[]) => {
// //     const zip = new JSZip();
// //     const certFolder = zip.folder("certificates");
// //     if (!certFolder) return;

// //     for (const { name, url } of urls) {
// //       try {
// //         const response = await fetch(url);
// //         const blob = await response.blob();
// //         certFolder.file(`${name.replace(/[^a-z0-9]/gi, '_')}.pdf`, blob);
// //       } catch (error) {
// //         console.error(`Failed to download certificate for ${name}:`, error);
// //       }
// //     }

// //     const content = await zip.generateAsync({ type: "blob" });
    
// //     const downloadLink = document.createElement('a');
// //     downloadLink.href = URL.createObjectURL(content);
// //     downloadLink.download = "certificates.zip";
// //     document.body.appendChild(downloadLink);
// //     downloadLink.click();
// //     document.body.removeChild(downloadLink);
// //   };

// // const downloadZip = async (urls: { name: string, url: string }[]) => {
// //     const zip = new JSZip();
// //     const certFolder = zip.folder("certificates");
// //     if (!certFolder) return;
  
// //     let failedDownloads = 0;
// //     setError(''); // Clear any previous errors
  
// //     for (const { name, url } of urls) {
// //       try {
// //         // Use a proxy route to handle CORS
// //         const response = await fetch('/api/proxy-pdf', {
// //           method: 'POST',
// //           headers: {
// //             'Content-Type': 'application/json',
// //           },
// //           body: JSON.stringify({ url })
// //         });
  
// //         if (!response.ok) {
// //           throw new Error(`Failed to fetch PDF: ${response.statusText}`);
// //         }
  
// //         const blob = await response.blob();
// //         const fileName = `${name.replace(/[^a-z0-9]/gi, '_')}.pdf`;
// //         certFolder.file(fileName, blob);
        
// //         console.log(`Successfully added ${fileName} to zip`);
// //       } catch (error) {
// //         console.error(`Failed to download certificate for ${name}:`, error);
// //         failedDownloads++;
// //       }
// //     }
  
// //     if (failedDownloads === urls.length) {
// //       throw new Error('Failed to download any certificates');
// //     }
  
// //     if (failedDownloads > 0) {
// //       setError(`Warning: Failed to download ${failedDownloads} certificate(s)`);
// //     }
  
// //     try {
// //       const content = await zip.generateAsync({ 
// //         type: "blob",
// //         compression: "DEFLATE",
// //         compressionOptions: {
// //           level: 6
// //         }
// //       });
      
// //       const downloadLink = document.createElement('a');
// //       downloadLink.href = URL.createObjectURL(content);
// //       downloadLink.download = `certificates-${new Date().toISOString().slice(0, 10)}.zip`;
// //       document.body.appendChild(downloadLink);
// //       downloadLink.click();
// //       document.body.removeChild(downloadLink);
// //       URL.revokeObjectURL(downloadLink.href);
// //     } catch (error) {
// //       console.error('Failed to generate zip:', error);
// //       throw new Error('Failed to generate zip file');
// //     }
// //   };
// // const downloadZip = async (urls: { name: string, url: string }[]) => {
// //     try {
// //       console.log('Starting zip creation with URLs:', urls);
// //       const zip = new JSZip();
// //       const certFolder = zip.folder("certificates");
      
// //       if (!certFolder) {
// //         throw new Error('Failed to create certificates folder in zip');
// //       }
  
// //       // Show processing state
// //       setStatus('processing');
// //       setCurrentProgress(0);
  
// //       for (let i = 0; i < urls.length; i++) {
// //         const { name, url } = urls[i];
// //         console.log(`Processing ${i + 1}/${urls.length}: ${name}`);
  
// //         try {
// //           // Direct download attempt
// //           const response = await fetch(url, {
// //             method: 'GET',
// //             mode: 'cors',  // Try with CORS
// //           });
  
// //           if (!response.ok) {
// //             throw new Error(`HTTP error! status: ${response.status}`);
// //           }
  
// //           const blob = await response.blob();
// //           console.log(`Successfully downloaded PDF for ${name}, size: ${blob.size} bytes`);
  
// //           const fileName = `${name.replace(/[^a-z0-9]/gi, '_')}.pdf`;
// //           certFolder.file(fileName, blob);
          
// //           // Update progress
// //           setCurrentProgress(Math.round(((i + 1) / urls.length) * 100));
  
// //         } catch (error) {
// //           console.error(`Failed to download certificate for ${name}:`, error);
// //           // Continue with next file instead of stopping completely
// //         }
// //       }
  
// //       console.log('Generating final zip file...');
// //       const content = await zip.generateAsync({
// //         type: "blob",
// //         compression: "DEFLATE",
// //         compressionOptions: { level: 6 }
// //       });
  
// //       console.log('Zip file generated, size:', content.size);
  
// //       if (content.size === 0) {
// //         throw new Error('Generated zip file is empty');
// //       }
  
// //       // Create and trigger download
// //       const downloadUrl = URL.createObjectURL(content);
// //       const downloadLink = document.createElement('a');
// //       downloadLink.href = downloadUrl;
// //       downloadLink.download = `certificates-${new Date().toISOString().slice(0, 10)}.zip`;
// //       console.log('Triggering download:', downloadLink.download);
      
// //       document.body.appendChild(downloadLink);
// //       downloadLink.click();
// //       document.body.removeChild(downloadLink);
      
// //       // Cleanup
// //       setTimeout(() => {
// //         URL.revokeObjectURL(downloadUrl);
// //       }, 1000);
  
// //       return true;
  
// //     } catch (error) {
// //       console.error('Zip creation failed:', error);
// //       setError(`Failed to create zip file: ${error.message}`);
// //       return false;
// //     }
// //   };
  

// const downloadZip = async (urls: { name: string, url: string }[]) => {
//     try {
//       console.log('Starting zip creation with URLs:', urls);
//       const zip = new JSZip();
//       const certFolder = zip.folder("certificates");
      
//       if (!certFolder) {
//         throw new Error('Failed to create certificates folder in zip');
//       }
  
//       setCurrentProgress(0);
  
//       for (let i = 0; i < urls.length; i++) {
//         const { name, url } = urls[i];
//         console.log(`Processing ${i + 1}/${urls.length}: ${name}`);
  
//         try {
//           // Use our proxy endpoint instead of direct fetch
//           const response = await fetch('/api/proxy-pdf', {
//             method: 'POST',
//             headers: {
//               'Content-Type': 'application/json',
//             },
//             body: JSON.stringify({ url })
//           });
  
//           if (!response.ok) {
//             throw new Error(`HTTP error! status: ${response.status}`);
//           }
  
//           const blob = await response.blob();
//           console.log(`Successfully downloaded PDF for ${name}, size: ${blob.size} bytes`);
  
//           const fileName = `${name.replace(/[^a-z0-9]/gi, '_')}.pdf`;
//           certFolder.file(fileName, blob);
          
//           setCurrentProgress(Math.round(((i + 1) / urls.length) * 100));
  
//         } catch (error) {
//           console.error(`Failed to download certificate for ${name}:`, error);
//         }
//       }
  
//       console.log('Generating final zip file...');
//       const content = await zip.generateAsync({
//         type: "blob",
//         compression: "DEFLATE",
//         compressionOptions: { level: 6 }
//       });
  
//       console.log('Zip file generated, size:', content.size);
  
//       if (content.size === 0) {
//         throw new Error('Generated zip file is empty');
//       }
  
//       // Create and trigger download
//       const downloadUrl = URL.createObjectURL(content);
//       const downloadLink = document.createElement('a');
//       downloadLink.href = downloadUrl;
//       downloadLink.download = `certificates-${new Date().toISOString().slice(0, 10)}.zip`;
//       console.log('Triggering download:', downloadLink.download);
      
//       document.body.appendChild(downloadLink);
//       downloadLink.click();
//       document.body.removeChild(downloadLink);
      
//       // Cleanup
//       setTimeout(() => {
//         URL.revokeObjectURL(downloadUrl);
//       }, 1000);
  
//       return true;
//     } catch (error) {
//       console.error('Zip creation failed:', error);
//       setError(`Failed to create zip file: ${error instanceof Error ? error.message : 'Unknown error'}`);
//       return false;
//     }
//   };

//   // const processBulkGeneration = async () => {
//   //   setStatus('processing');
//   //   setProcessing(true);
//   //   setError('');
//   //   setSuccess('');
    
//   //   const total = excelData.length;
//   //   const generatedCertificates: Certificate[] = [];
//   //   const certificateUrls: { name: string, url: string }[] = [];

//   //   console.log(`Starting bulk generation for ${total} certificates`);

//   //   for (let i = 0; i < excelData.length; i++) {
//   //     const row = excelData[i];
//   //     try {
//   //       console.log(`Generating certificate for ${row.name}`);
        
//   //       const response = await fetch('https://choicecert.snipeit.ai/', {
//   //         method: 'POST',
//   //         headers: { 'Content-Type': 'application/json' },
//   //         body: JSON.stringify({ name: row.name })
//   //       });

//   //       if (!response.ok) {
//   //         throw new Error(`Failed to generate certificate: ${response.statusText}`);
//   //       }

//   //       const data = await response.json();
//   //       console.log(`Certificate URL received for ${row.name}:`, data.url);
        
//   //       certificateUrls.push({ name: row.name, url: data.url });
        
//   //       const newCert: Certificate = {
//   //         name: row.name,
//   //         url: data.url,
//   //         timestamp: new Date().toISOString(),
//   //         status: 'downloaded'
//   //       };
        
//   //       generatedCertificates.push(newCert);
//   //       setCurrentProgress(Math.round(((i + 1) / total) * 50));
//   //     } catch (err) {
//   //       const error = err as Error;
//   //       console.error(`Error generating certificate for ${row.name}:`, error);
//   //     }
//   //   }

//   //   if (certificateUrls.length === 0) {
//   //     setError('Failed to generate any certificates');
//   //     setStatus('complete');
//   //     setProcessing(false);
//   //     return;
//   //   }

//   //   if (processMode === 'zip') {
//   //     console.log('Starting zip download for', certificateUrls.length, 'certificates');
//   //     const downloadSuccess = await downloadZip(certificateUrls);
      
//   //     if (downloadSuccess) {
//   //       setSuccess(`Successfully processed ${certificateUrls.length} certificates`);
//   //     } else {
//   //       setError('Failed to create zip file. Check console for details.');
//   //     }
//   //   }

//   //   onComplete(generatedCertificates);
//   //   setStatus('complete');
//   //   setProcessing(false);
//   // };

//   const processBulkGeneration = async () => {
//     setStatus('processing');
//     setProcessing(true);
//     setError('');
//     setSuccess('');
    
//     const total = excelData.length;
//     const generatedCertificates: Certificate[] = [];
//     const certificateUrls: { name: string, url: string }[] = [];
  
//     console.log(`Starting bulk generation for ${total} certificates`);
  
//     for (let i = 0; i < excelData.length; i++) {
//       const row = excelData[i];
//       try {
//         console.log(`Generating certificate for ${row.name}`);
        
//         const response = await fetch('https://choicecert.snipeit.ai/', {
//           method: 'POST',
//           headers: { 'Content-Type': 'application/json' },
//           body: JSON.stringify({ name: row.name })
//         });
  
//         if (!response.ok) {
//           throw new Error(`Failed to generate certificate: ${response.statusText}`);
//         }
  
//         const data = await response.json();
//         console.log(`Certificate URL received for ${row.name}:`, data.url);
        
//         certificateUrls.push({ name: row.name, url: data.url });
        
//         // Handle email sending if in email mode
//         if (processMode === 'email' && row.email && isGoogleLoggedIn) {
//           const tokens = localStorage.getItem('googleTokens');
//           if (tokens) {
//             try {
//               const emailResponse = await fetch('/api/send-email', {
//                 method: 'POST',
//                 headers: {
//                   'Content-Type': 'application/json',
//                 },
//                 body: JSON.stringify({
//                   to: row.email,
//                   subject: 'Your Certificate',
//                   body: emailTemplate.replace('${name}', row.name),
//                   attachmentUrl: data.url,
//                   tokens: JSON.parse(tokens),
//                 }),
//               });
  
//               if (!emailResponse.ok) {
//                 throw new Error('Failed to send email');
//               }
  
//               console.log(`Email sent successfully to ${row.email}`);
//             } catch (emailError) {
//               console.error(`Failed to send email to ${row.email}:`, emailError);
//             }
//           }
//         }
        
//         const newCert: Certificate = {
//           name: row.name,
//           url: data.url,
//           timestamp: new Date().toISOString(),
//           status: processMode === 'email' && row.email ? 'both' : 'downloaded'
//         };
        
//         generatedCertificates.push(newCert);
//         setCurrentProgress(Math.round(((i + 1) / total) * 50));
//       } catch (err) {
//         const error = err as Error;
//         console.error(`Error generating certificate for ${row.name}:`, error);
//       }
//     }
  
//     if (certificateUrls.length === 0) {
//       setError('Failed to generate any certificates');
//       setStatus('complete');
//       setProcessing(false);
//       return;
//     }
  
//     if (processMode === 'zip') {
//       console.log('Starting zip download for', certificateUrls.length, 'certificates');
//       const downloadSuccess = await downloadZip(certificateUrls);
      
//       if (downloadSuccess) {
//         setSuccess(`Successfully processed ${certificateUrls.length} certificates`);
//       } else {
//         setError('Failed to create zip file. Check console for details.');
//       }
//     } else if (processMode === 'email') {
//       setSuccess(`Successfully processed and emailed ${certificateUrls.length} certificates`);
//     }
  
//     onComplete(generatedCertificates);
//     setStatus('complete');
//     setProcessing(false);
//   };

//   return (
//     <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
//       <div className="bg-[#282a36] rounded-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
//         <div className="flex justify-between items-center mb-4">
//           <h2 className="text-xl font-semibold text-gray-100">Bulk Certificate Generation</h2>
//           <button onClick={onClose} className="text-gray-400 hover:text-gray-300">
//             <X className="w-5 h-5" />
//           </button>
//         </div>

//         {status === 'preview' && (
//           <>
//             <div className="space-y-4">
//               <div className="flex gap-4 mb-6">
//                 <button
//                   onClick={() => setProcessMode('email')}
//                   className={`flex-1 py-2 px-4 rounded-lg flex items-center justify-center gap-2 ${
//                     processMode === 'email' 
//                       ? 'bg-indigo-500 text-white' 
//                       : 'bg-gray-700 text-gray-300'
//                   }`}
//                 >
//                   <Mail className="w-4 h-4" />
//                   Generate & Email
//                 </button>
//                 <button
//                   onClick={() => setProcessMode('zip')}
//                   className={`flex-1 py-2 px-4 rounded-lg flex items-center justify-center gap-2 ${
//                     processMode === 'zip' 
//                       ? 'bg-indigo-500 text-white' 
//                       : 'bg-gray-700 text-gray-300'
//                   }`}
//                 >
//                   <Archive className="w-4 h-4" />
//                   Generate & Download Zip
//                 </button>
//               </div>

//               <div className="border border-gray-700 rounded-lg p-4">
//                 <h3 className="text-lg font-medium text-gray-200 mb-2">Preview</h3>
//                 <div className="max-h-64 overflow-y-auto">
//                   <table className="w-full">
//                     <thead>
//                       <tr>
//                         <th className="text-left text-gray-400 p-2">Name</th>
//                         <th className="text-left text-gray-400 p-2">Email</th>
//                       </tr>
//                     </thead>
//                     <tbody>
//                       {excelData.map((row, index) => (
//                         <tr key={index} className="border-t border-gray-700">
//                           <td className="p-2 text-gray-300">{row.name}</td>
//                           <td className="p-2 text-gray-300">{row.email || 'N/A'}</td>
//                         </tr>
//                       ))}
//                     </tbody>
//                   </table>
//                 </div>
//               </div>

//               {processMode === 'email' && !isGoogleLoggedIn && (
//                 <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-4">
//                   <div className="flex items-center gap-2 text-yellow-200">
//                     <AlertCircle className="w-5 h-5" />
//                     <p>Google login required for sending emails</p>
//                   </div>
//                 </div>
//               )}

//               <button
//                 onClick={processBulkGeneration}
//                 className="w-full bg-indigo-500 hover:bg-indigo-600 text-white py-2 px-4 rounded-lg flex items-center justify-center gap-2"
//               >
//                 {processMode === 'email' ? <Mail className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
//                 Process {excelData.length} Certificates
//               </button>
//             </div>
//           </>
//         )}

//         {status === 'processing' && (
//           <div className="space-y-4">
//             <div className="w-full bg-gray-700 rounded-full h-4">
//               <div 
//                 className="bg-indigo-500 h-4 rounded-full transition-all duration-300"
//                 style={{ width: `${currentProgress}%` }}
//               ></div>
//             </div>
//             <p className="text-center text-gray-300">
//               Processing... {currentProgress}% complete
//             </p>
//           </div>
//         )}

//         {status === 'complete' && (
//           <div className="text-center space-y-4">
//             {error ? (
//               <div className="flex items-center justify-center gap-2 text-red-400">
//                 <AlertCircle className="w-6 h-6" />
//                 <p>{error}</p>
//               </div>
//             ) : (
//               <div className="flex items-center justify-center gap-2 text-green-400">
//                 <Check className="w-6 h-6" />
//                 <p>{success || 'All certificates have been processed!'}</p>
//               </div>
//             )}
//             <button
//               onClick={onClose}
//               className="bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-lg"
//             >
//               Close
//             </button>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// };

// export const CertificateGenerator = () => {
//   const [name, setName] = useState('');
//   const [email, setEmail] = useState('');
//   const [processMode, setProcessMode] = useState<'email' | 'zip'>('email');
//   const [emailTemplate, setEmailTemplate] = useState(
//     'Dear ${name},\n\nPlease find your certificate attached.\n\nBest regards'
//   );
//   const [sendEmail, setSendEmail] = useState(false);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState('');
//   const [success, setSuccess] = useState('');
//   const [isGoogleLoggedIn, setIsGoogleLoggedIn] = useState(false);
//   const [currentUser, setCurrentUser] = useState<GoogleUser | null>(null);
//   const [history, setHistory] = useState<Certificate[]>([]);
//   const [showHistory, setShowHistory] = useState(false);
//   const [showBulkUpload, setShowBulkUpload] = useState(false);
//   const [selectedFile, setSelectedFile] = useState<File | null>(null);

//   useEffect(() => {
//     const tokens = localStorage.getItem('googleTokens');
//     if (tokens) {
//       const parsedTokens = JSON.parse(tokens);
//       if (parsedTokens.id_token) {
//         const userData = parseJwt(parsedTokens.id_token);
//         if (userData) {
//           setCurrentUser({
//             email: userData.email,
//             name: userData.name,
//             picture: userData.picture
//           });
//           setIsGoogleLoggedIn(true);
//         }
//       }
//     }

//     const savedHistory = localStorage.getItem('certificateHistory');
//     if (savedHistory) {
//       setHistory(JSON.parse(savedHistory));
//     }
//   }, []);

//   useEffect(() => {
//     localStorage.setItem('certificateHistory', JSON.stringify(history));
//   }, [history]);

//   const handleGoogleLogin = async () => {
//     try {
//       const response = await fetch('/api/auth');
//       const data = await response.json();
//       if (data.url) {
//         window.location.href = data.url;
//       }
//     } catch (error) {
//       setError('Failed to initialize Google login');
//     }
//   };

//   const handleLogout = () => {
//     localStorage.removeItem('googleTokens');
//     setIsGoogleLoggedIn(false);
//     setCurrentUser(null);
//   };

//   const generateSingleCertificate = async () => {
//     if (!name) {
//       setError('Please enter a name');
//       return;
//     }

//     if (sendEmail) {
//       if (!email) {
//         setError('Please enter an email address');
//         return;
//       }
//       if (!isGoogleLoggedIn) {
//         setError('Please login with Google to send emails');
//         return;
//       }
//     }

//     setLoading(true);
//     setError('');
//     try {
//       const response = await fetch('https://choicecert.snipeit.ai/', {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify({ name }),
//       });

//       const data = await response.json();

//       if (sendEmail) {
//         const tokens = localStorage.getItem('googleTokens');
//         if (!tokens) throw new Error('Not authenticated');

//         const emailResponse = await fetch('/api/send-email', {
//           method: 'POST',
//           headers: {
//             'Content-Type': 'application/json',
//           },
//           body: JSON.stringify({
//             to: email,
//             subject: 'Your Certificate',
//             body: emailTemplate.replace('${name}', name),
//             attachmentUrl: data.url,
//             tokens: JSON.parse(tokens),
//           }),
//         });

//         if (!emailResponse.ok) {
//           throw new Error('Failed to send email');
//         }
//       }

//       const newCertificate: Certificate = {
//         name,
//         url: data.url,
//         timestamp: new Date().toISOString(),
//         status: sendEmail ? 'both' : 'downloaded',
//       };

//       setHistory(prev => [newCertificate, ...prev].slice(0, 10));
//       setSuccess('Certificate generated successfully!');

//       const link = document.createElement('a');
//       link.href = data.url;
//       link.download = `certificate-${name}.pdf`;
//       document.body.appendChild(link);
//       link.click();
//       document.body.removeChild(link);

//     } catch (error) {
//       setError('Failed to generate certificate: ' + (error instanceof Error ? error.message : 'Unknown error'));
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleBulkComplete = (newCertificates: Certificate[]) => {
//     setHistory(prev => [...newCertificates, ...prev].slice(0, 10));
//     setSuccess(`Successfully processed ${newCertificates.length} certificates`);
//   };

//   return (
//     <div className="space-y-8">
//       {/* Header */}
//       <div className="text-center space-y-2">
//         <h1 className="text-3xl font-bold text-white flex items-center justify-center gap-2">
//           <Award className="w-8 h-8 text-indigo-400" />
//           Certificate Generator
//         </h1>
//         <p className="text-gray-400">Generate and email certificates with ease</p>
//       </div>

      
//       {/* Account Switcher for Email Mode */}
//       {processMode === 'email' && (
//         <div className="bg-[#282a36] rounded-lg p-4 mb-4">
//           {isGoogleLoggedIn ? (
//             <div className="flex items-center justify-between">
//               <div className="flex items-center gap-3">
//                 <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center">
//                   {currentUser?.picture ? (
//                     <img src={currentUser.picture} alt="" className="w-10 h-10 rounded-full" />
//                   ) : (
//                     <User className="w-6 h-6 text-white" />
//                   )}
//                 </div>
//                 <div>
//                   <p className="text-sm font-medium text-gray-200">{currentUser?.name}</p>
//                   <p className="text-xs text-gray-400">{currentUser?.email}</p>
//                 </div>
//               </div>
//               <button
//                 onClick={() => {
//                   localStorage.removeItem('googleTokens');
//                   window.location.reload();
//                 }}
//                 className="p-2 text-gray-400 hover:text-gray-300 rounded-lg hover:bg-gray-700"
//               >
//                 <LogOut className="w-5 h-5" />
//               </button>
//             </div>
//           ) : (
//             <button
//               onClick={handleGoogleLogin}
//               className="w-full btn-secondary px-4 py-2 rounded-lg flex items-center justify-center gap-2"
//             >
//               <Mail className="w-4 h-4" />
//               Login with Google to Send Emails
//             </button>
//           )}
//         </div>
//       )}

//       <div className="border border-gray-700 rounded-lg p-4"></div>

//       {/* Main Content */}
//       <div className="grid gap-8 md:grid-cols-2">
//         {/* Left Column - Single Certificate */}
//         <div className="card-gradient rounded-xl p-6 space-y-6">
//           <div className="flex items-center gap-2 mb-4">
//             <Award className="w-5 h-5 text-indigo-400" />
//             <h2 className="text-xl font-semibold">Single Certificate</h2>
//           </div>

//           <div className="space-y-4">
//             <input
//               type="text"
//               placeholder="Enter name"
//               value={name}
//               onChange={(e) => setName(e.target.value)}
//               className="w-full px-4 py-2 rounded-lg input-style"
//             />

//             <div className="flex items-center gap-2">
//               <input
//                 type="checkbox"
//                 id="sendEmail"
//                 checked={sendEmail}
//                 onChange={(e) => setSendEmail(e.target.checked)}
//                 className="rounded border-gray-600"
//               />
//               <label htmlFor="sendEmail" className="text-gray-300">
//                 Send via email
//               </label>
//             </div>

//             {sendEmail && (
//               <div className="space-y-4">
//                 <AccountSwitcher
//                   currentUser={currentUser}
//                   onLogout={handleLogout}
//                   onLogin={handleGoogleLogin}
//                 />

//                 <input
//                   type="email"
//                   placeholder="Enter email address"
//                   value={email}
//                   onChange={(e) => setEmail(e.target.value)}
//                   className="w-full px-4 py-2 rounded-lg input-style"
//                 />

//                 <textarea
//                   placeholder="Enter email template"
//                   value={emailTemplate}
//                   onChange={(e) => setEmailTemplate(e.target.value)}
//                   rows={4}
//                   className="w-full px-4 py-2 rounded-lg input-style"
//                 />
//               </div>
//             )}

//             <button
//               onClick={generateSingleCertificate}
//               disabled={loading}
//               className="btn-primary w-full px-4 py-2 rounded-lg flex items-center justify-center gap-2"
//             >
//               {loading ? (
//                 <Loader2 className="w-4 h-4 animate-spin" />
//               ) : (
//                 <Download className="w-4 h-4" />
//               )}
//               {loading ? 'Generating...' : 'Generate Certificate'}
//             </button>
//           </div>
//         </div>

//         {/* Right Column - Bulk Generation */}
//         <div className="card-gradient rounded-xl p-6 space-y-6">
//           <div className="flex items-center gap-2 mb-4">
//             <FileText className="w-5 h-5 text-indigo-400" />
//             <h2 className="text-xl font-semibold">Bulk Generation</h2>
//           </div>

//           <div className="border-2 border-dashed border-gray-700 rounded-lg p-8 text-center space-y-4">
//             <FileText className="w-12 h-12 mx-auto text-gray-500" />
//             <div>
//               <label className="btn-secondary px-6 py-2 rounded-lg cursor-pointer">
//                 Upload Excel File
//                 <input
//                   type="file"
//                   className="hidden"
//                   accept=".xlsx,.xls"
//                   onChange={(e) => {
//                     const file = e.target.files?.[0];
//                     if (file) {
//                       setSelectedFile(file);
//                       setShowBulkUpload(true);
//                     }
//                   }}
//                   disabled={loading}
//                 />
//               </label>
//             </div>
//             <p className="text-gray-500 text-sm">
//               Supports .xlsx and .xls files
//             </p>
//           </div>
//         </div>
//       </div>

//       {/* Swayam Credentials Section */}
// <div className="card-gradient rounded-xl p-6 space-y-6">
//   <div className="flex items-center gap-2 mb-4">
//     <Key className="w-5 h-5 text-indigo-400" />
//     <h2 className="text-xl font-semibold">Swayam Credentials</h2>
//   </div>

//   <div className="grid gap-8 md:grid-cols-2">
//     {/* Single Generation */}
//     <div className="space-y-4">
//       <h3 className="text-lg font-medium text-gray-200">Single Generation</h3>
//       <SwayamSection
//         isGoogleLoggedIn={isGoogleLoggedIn}
//         currentUser={currentUser}
//         handleGoogleLogin={handleGoogleLogin}
//         handleLogout={handleLogout}
//       />
//     </div>

//     {/* Bulk Generation */}
//     <div className="space-y-4">
//       <h3 className="text-lg font-medium text-gray-200">Bulk Generation</h3>
//       <div className="border-2 border-dashed border-gray-700 rounded-lg p-8 text-center space-y-4">
//         <FileText className="w-12 h-12 mx-auto text-gray-500" />
//         <div>
//           <label className="btn-secondary px-6 py-2 rounded-lg cursor-pointer">
//             Upload Excel File
//             <input
//               type="file"
//               className="hidden"
//               accept=".xlsx,.xls"
//               onChange={(e) => {
//                 const file = e.target.files?.[0];
//                 if (file) {
//                   setSelectedSwayamFile(file);
//                   setShowSwayamBulkUpload(true);
//                 }
//               }}
//               disabled={loading}
//             />
//           </label>
//         </div>
//         <p className="text-gray-500 text-sm">
//           Excel file should contain name, email, and phone columns
//         </p>
//       </div>
//     </div>
//   </div>
// </div>

// {/* Swayam Bulk Upload Modal */}
// {showSwayamBulkUpload && selectedSwayamFile && (
//   <SwayamBulkModal
//     file={selectedSwayamFile}
//     onClose={() => {
//       setShowSwayamBulkUpload(false);
//       setSelectedSwayamFile(null);
//     }}
//     isGoogleLoggedIn={isGoogleLoggedIn}
//     currentUser={currentUser}
//   />
// )}

//       {/* History Section */}
//       <div className="card-gradient rounded-xl p-6">
//         <button
//           onClick={() => setShowHistory(!showHistory)}
//           className="w-full btn-secondary px-4 py-2 rounded-lg flex items-center justify-center gap-2"
//         >
//           <History className="w-4 h-4" />
//           {showHistory ? 'Hide History' : 'Show History'}
//         </button>

//         {showHistory && (
//           <div className="mt-4 space-y-2">
//             {history.length === 0 ? (
//               <p className="text-center text-gray-500 py-4">
//                 No certificates generated yet
//               </p>
//             ) : (
//               history.map((cert, index) => (
//                 <div
//                   key={index}
//                   className="bg-[#1f2128] rounded-lg p-4 flex justify-between items-center border border-gray-800"
//                 >
//                   <div>
//                     <p className="font-medium text-gray-200">{cert.name}</p>
//                     <p className="text-sm text-gray-500">
//                       {new Date(cert.timestamp).toLocaleString()}
//                     </p>
//                   </div>
//                   <button
//                     onClick={() => window.open(cert.url)}
//                     className="btn-secondary p-2 rounded-lg"
//                   >
//                     <Download className="w-4 h-4" />
//                   </button>
//                 </div>
//               ))
//             )}
//           </div>
//         )}
//       </div>

//       {/* Alerts */}
//       {error && (
//         <div className="bg-red-500/20 border border-red-500 text-red-200 px-4 py-3 rounded-lg">
//           <div className="flex items-center gap-2">
//             <X className="w-4 h-4" />
//             {error}
//           </div>
//         </div>
//       )}
//       {success && (
//         <div className="bg-green-500/20 border border-green-500 text-green-200 px-4 py-3 rounded-lg">
//           <div className="flex items-center gap-2">
//             <Check className="w-4 h-4" />
//             {success}
//           </div>
//         </div>
//       )}

//       {/* Bulk Upload Modal */}
//       {showBulkUpload && selectedFile && (
//   <BulkUploadModal
//     file={selectedFile}
//     onClose={() => {
//       setShowBulkUpload(false);
//       setSelectedFile(null);
//     }}
//     emailTemplate={emailTemplate}
//     isGoogleLoggedIn={isGoogleLoggedIn}
//     onComplete={handleBulkComplete}
//     currentUser={currentUser}
//     handleGoogleLogin={handleGoogleLogin}
//     processMode={processMode}
//     setProcessMode={setProcessMode}
//   />
// )}
//     </div>
//   );
// };