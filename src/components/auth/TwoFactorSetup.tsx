// @ts-nocheck
'use client';

import { useState } from 'react';
import Image from 'next/image';

interface TwoFactorSetupProps {
  onComplete: () => void;
}

export default function TwoFactorSetup({ onComplete }: TwoFactorSetupProps) {
  const [step, setStep] = useState<'setup' | 'verify'>('setup');
  const [setupData, setSetupData] = useState<any>(null);
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSetup = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/auth/2fa/setup', {
        method: 'POST',
      });

      const data = await response.json();

      if (data.success) {
        setSetupData(data.data);
        setStep('verify');
      } else {
        setError(data.error || 'Setup failed');
      }
    } catch (err) {
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/auth/2fa/enable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (data.success) {
        onComplete();
      } else {
        setError(data.error || 'Verification failed');
      }
    } catch (err) {
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'setup') {
    return (
      <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Setup Two-Factor Authentication</h2>
        <p className="text-gray-600 mb-6">
          Enhance your account security by enabling two-factor authentication.
        </p>
        
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
            {error}
          </div>
        )}

        <button
          onClick={handleSetup}
          disabled={loading}
          className="w-full py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Setting up...' : 'Start Setup'}
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4">Scan QR Code</h2>
      
      <div className="mb-6 text-center">
        {setupData?.qrCodeUrl && (
          <Image
            src={setupData.qrCodeUrl}
            alt="2FA QR Code"
            width={200}
            height={200}
            className="mx-auto border rounded"
          />
        )}
      </div>

      <div className="mb-4">
        <p className="text-sm text-gray-600 mb-2">
          1. Install an authenticator app (Google Authenticator, Authy, etc.)
        </p>
        <p className="text-sm text-gray-600 mb-2">
          2. Scan the QR code above
        </p>
        <p className="text-sm text-gray-600 mb-4">
          3. Enter the 6-digit code from your app
        </p>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Verification Code
        </label>
        <input
          type="text"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="000000"
          maxLength={6}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="mb-6 p-4 bg-gray-50 rounded">
        <h3 className="font-medium text-sm mb-2">Backup Codes</h3>
        <p className="text-xs text-gray-600 mb-2">Save these backup codes in a safe place:</p>
        <div className="grid grid-cols-2 gap-1 text-xs font-mono">
          {setupData?.backupCodes?.map((code: string, index: number) => (
            <div key={index} className="p-1 bg-white rounded text-center">
              {code}
            </div>
          ))}
        </div>
      </div>

      <div className="flex space-x-2">
        <button
          onClick={() => setStep('setup')}
          className="flex-1 py-2 px-4 border border-gray-300 rounded hover:bg-gray-50"
        >
          Back
        </button>
        <button
          onClick={handleVerify}
          disabled={loading || !token}
          className="flex-1 py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Verifying...' : 'Enable 2FA'}
        </button>
      </div>
    </div>
  );
}