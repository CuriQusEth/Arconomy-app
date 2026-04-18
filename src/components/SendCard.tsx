import React, { useState } from 'react';
import { AppKit } from '@circle-fin/app-kit';
import { ArrowDown, Settings, AlertCircle, CheckCircle2, Loader2, Send } from 'lucide-react';

interface SendCardProps {
  adapter: any;
  address: string | null;
}

const TOKENS = ['USDC', 'EURC', 'USDT'];

export function SendCard({ adapter, address }: SendCardProps) {
  const [token, setToken] = useState('USDC');
  const [amount, setAmount] = useState('');
  const [recipient, setRecipient] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [txStatus, setTxStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');
  const [txHash, setTxHash] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSend = async () => {
    if (!adapter || !address) {
      alert('Please connect your wallet first.');
      return;
    }

    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      alert('Please enter a valid amount.');
      return;
    }

    if (!recipient || !recipient.startsWith('0x') || recipient.length !== 42) {
      alert('Please enter a valid Ethereum address starting with 0x.');
      return;
    }

    setIsSending(true);
    setTxStatus('pending');
    setErrorMessage(null);
    setTxHash(null);

    try {
      const kit = new AppKit();
      
      const result = await kit.send({
        from: { adapter, chain: 'Arc_Testnet' },
        to: recipient,
        amount: amount,
        token: token as any,
      });

      // Navigate the BridgeStep result finding the hash
      setTxHash(result.txHash || (result.data as any)?.txHash || 'Unknown');
      if (result.state === 'error') {
        throw new Error(result.errorMessage || 'Transaction returned error state');
      }
      setTxStatus('success');
    } catch (error: any) {
      console.error('Send failed:', error);
      setErrorMessage(error.message || 'An unknown error occurred during the send transfer.');
      setTxStatus('error');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <>
      <div className="bg-card w-full max-w-[480px] p-3 rounded-[24px] border border-border shadow-[0_20px_40px_rgba(0,0,0,0.4)]">
        <div className="px-3 pt-2 pb-4 flex justify-between items-center">
          <h2 className="text-base font-semibold">Send</h2>
          <button className="text-text-secondary hover:text-text-primary transition-colors">
            <Settings size={18} />
          </button>
        </div>

        <div className="space-y-1">
          {/* Amount and Token */}
          <div className="bg-input rounded-2xl p-4 border border-transparent hover:border-border transition-colors">
            <div className="text-xs text-text-secondary mb-2">Amount to send</div>
            <div className="flex justify-between items-center">
              <input
                type="number"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="text-[32px] bg-transparent border-none text-text-primary w-[60%] outline-none placeholder:text-text-secondary"
              />
              <div className="relative">
                <select
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                >
                  {TOKENS.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <div className="bg-card border border-border py-1 pr-2 pl-1 rounded-full flex items-center gap-2 pointer-events-none">
                  <div className="w-6 h-6 rounded-full bg-[#2775ca] flex items-center justify-center text-[10px] font-bold text-white">
                    {token.slice(0, 1)}
                  </div>
                  <span className="font-semibold text-base">{token}</span>
                  <ArrowDown size={12} />
                </div>
              </div>
            </div>
          </div>

          {/* Recipient Address */}
          <div className="bg-input rounded-2xl p-4 border border-transparent hover:border-border transition-colors mt-1">
            <div className="text-xs text-text-secondary mb-2">Recipient Address</div>
            <div className="flex justify-between items-center gap-2">
              <input
                type="text"
                placeholder="0x..."
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                className="text-base bg-transparent border-none text-text-primary w-full outline-none placeholder:text-text-secondary font-mono"
              />
            </div>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={handleSend}
          disabled={!address || isSending || !amount || Number(amount) <= 0 || !recipient}
          className={`w-full p-4 rounded-2xl text-lg font-semibold mt-3 transition-colors ${
            !address 
              ? 'bg-input text-text-secondary cursor-not-allowed'
              : isSending || !amount || Number(amount) <= 0 || !recipient
                ? 'bg-accent/50 text-white/50 cursor-not-allowed'
                : 'bg-accent hover:bg-accent-hover text-white'
          }`}
        >
          {!address ? 'Connect Wallet' : isSending ? 'Sending...' : 'Send'}
        </button>
      </div>

      {/* Transaction Status */}
      {txStatus !== 'idle' && (
        <div className={`fixed bottom-10 right-10 bg-card border px-6 py-4 rounded-xl flex items-center gap-3 shadow-[0_10px_30px_rgba(0,0,0,0.5)] z-50 ${
          txStatus === 'pending' ? 'border-accent' :
          txStatus === 'success' ? 'border-success' :
          'border-red-500'
        }`}>
          {txStatus === 'pending' && <Loader2 className="animate-spin text-accent" size={20} />}
          {txStatus === 'success' && <CheckCircle2 className="text-success" size={20} />}
          {txStatus === 'error' && <AlertCircle className="text-red-500" size={20} />}
          
          <div>
            <h4 className="text-sm font-semibold mb-0.5">
              {txStatus === 'pending' ? 'Send Pending' : txStatus === 'success' ? 'Send Successful' : 'Send Failed'}
            </h4>
            <p className="text-xs text-text-secondary max-w-xs break-words">
              {txStatus === 'pending' && 'Transaction is being processed...'}
              {txStatus === 'success' && (
                <>
                  {amount} {token} sent successfully.{' '}
                  {txHash && txHash !== 'Unknown' && (
                    <a 
                      href={`https://testnet.arcscan.app/tx/${txHash}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="underline hover:text-white"
                    >
                      View on Explorer
                    </a>
                  )}
                </>
              )}
              {txStatus === 'error' && errorMessage}
            </p>
          </div>
        </div>
      )}
    </>
  );
}
