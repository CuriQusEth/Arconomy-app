import React, { useState } from 'react';
import { Settings, AlertCircle, CheckCircle2, Loader2, Send, ArrowDown } from 'lucide-react';
import { createWalletClient, createPublicClient, custom, parseUnits, http } from 'viem';
import { TOKENS, ERC20_ABI, SWAP_ABI, SWAP_CONTRACT, ARC_TESTNET_CONFIG } from '../lib/contracts';
import { useLogs } from '../context/LogContext';

interface SendCardProps {
  address: string | null;
}

const TOKEN_KEYS = Object.keys(TOKENS) as Array<keyof typeof TOKENS>;

export function SendCard({ address }: SendCardProps) {
  const { logAction } = useLogs();
  const [tokenKey, setTokenKey] = useState<keyof typeof TOKENS>('USDC');
  const [amount, setAmount] = useState('');
  const [recipient, setRecipient] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [txStatus, setTxStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');
  const [txHash, setTxHash] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSend = async () => {
    if (!address || !window.ethereum) {
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
      // Ensure we are on Arc Testnet
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: `0x${ARC_TESTNET_CONFIG.id.toString(16)}` }],
        });
      } catch (switchError: any) {
        if (switchError.code === 4902) {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: `0x${ARC_TESTNET_CONFIG.id.toString(16)}`,
              chainName: ARC_TESTNET_CONFIG.name,
              rpcUrls: ARC_TESTNET_CONFIG.rpcUrls.default.http,
              nativeCurrency: ARC_TESTNET_CONFIG.nativeCurrency,
              blockExplorerUrls: [ARC_TESTNET_CONFIG.blockExplorers.default.url]
            }],
          });
        } else {
          throw new Error('Switch to Arc Testnet failed.');
        }
      }

      const walletClient = createWalletClient({
        chain: ARC_TESTNET_CONFIG,
        transport: custom(window.ethereum as any)
      });

      const publicClient = createPublicClient({
        chain: ARC_TESTNET_CONFIG,
        transport: http('https://rpc.testnet.arc.network')
      });

      // We assume 6 decimals for USDC and EURC on Testnet by default, but you might want to fetch dynamically
      const dec = 6; 
      const parsedAmount = parseUnits(amount, dec);
      const tokenAddress = TOKENS[tokenKey];

      // Step 1: Approve the Contract
      const { request: approveReq } = await publicClient.simulateContract({
        address: tokenAddress as `0x${string}`,
        abi: ERC20_ABI as any,
        functionName: 'approve',
        args: [SWAP_CONTRACT as `0x${string}`, parsedAmount],
        account: address as `0x${string}`,
        chain: ARC_TESTNET_CONFIG,
        maxFeePerGas: 1000000000n,
        maxPriorityFeePerGas: 1000000000n,
      });
      const approveHash = await walletClient.writeContract(approveReq as any);
      await publicClient.waitForTransactionReceipt({ hash: approveHash });

      // Step 2: Call the Send function on the Contract
      const { request: sendReq } = await publicClient.simulateContract({
        address: SWAP_CONTRACT as `0x${string}`,
        abi: SWAP_ABI as any,
        functionName: 'send',
        args: [tokenAddress as `0x${string}`, recipient as `0x${string}`, parsedAmount],
        account: address as `0x${string}`,
        chain: ARC_TESTNET_CONFIG,
        maxFeePerGas: 1000000000n,
        maxPriorityFeePerGas: 1000000000n,
      });
      const hash = await walletClient.writeContract(sendReq as any);

      setTxHash(hash);
      
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      if (receipt.status !== 'success') {
        throw new Error('Transaction reverted by the network');
      }

      setTxStatus('success');
      
      // Log Action using context
      logAction('Send Token', address, `Sent ${amount} ${tokenKey} to ${recipient.substring(0, 8)}... TxHash: ${hash}`);
      
    } catch (error: any) {
      console.error('Send failed:', error);
      setErrorMessage(error.shortMessage || error.message || 'An unknown error occurred during the send transfer.');
      setTxStatus('error');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <>
      <div className="bg-card w-full max-w-[480px] p-4 rounded-[24px] border border-border shadow-[0_20px_40px_rgba(0,0,0,0.4)]">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Send className="text-[#3d6eff]" size={22} /> Send Token
          </h2>
          <button className="text-text-secondary hover:text-text-primary transition-colors cursor-pointer text-sm">
            <Settings size={18} />
          </button>
        </div>

        <div className="space-y-2 relative">
          {/* Amount and Token */}
          <div className="bg-input rounded-2xl p-4 border border-transparent focus-within:border-[#3d6eff] transition-colors relative z-10">
            <div className="text-xs text-text-secondary mb-2">You Send</div>
            <div className="flex justify-between items-center">
              <input
                type="number"
                placeholder="0.0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="text-4xl bg-transparent border-none text-text-primary w-full outline-none placeholder:text-text-secondary font-medium tracking-tight"
              />
              <div className="relative shrink-0 ml-4">
                <select
                  value={tokenKey}
                  onChange={(e) => setTokenKey(e.target.value as keyof typeof TOKENS)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                >
                  {TOKEN_KEYS.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <div className="bg-card border border-border py-2 px-3 rounded-full flex items-center gap-2 pointer-events-none hover:bg-white/5 transition-colors">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-sm ${tokenKey === 'USDC' ? 'bg-[#2775ca]' : 'bg-[#e2a828]'}`}>
                    {tokenKey.slice(0, 1)}
                  </div>
                  <span className="font-bold text-base">{tokenKey}</span>
                  <ArrowDown size={14} className="text-text-secondary" />
                </div>
              </div>
            </div>
          </div>

          {/* Recipient Address */}
          <div className="bg-input rounded-2xl p-4 border border-transparent focus-within:border-[#3d6eff] transition-colors relative z-0">
             <div className="text-xs text-text-secondary mb-2">To Recipient Address</div>
             <input
               type="text"
               placeholder="0x..."
               value={recipient}
               onChange={(e) => setRecipient(e.target.value)}
               className="text-sm bg-transparent border-none text-text-primary w-full outline-none placeholder:text-text-secondary font-mono tracking-wide"
             />
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={handleSend}
          disabled={!address || isSending || !amount || Number(amount) <= 0 || !recipient}
          className={`w-full p-4 rounded-xl text-lg font-bold mt-4 transition-all shadow-lg ${
            !address || !amount || Number(amount) <= 0 || !recipient
              ? 'bg-input text-text-secondary cursor-not-allowed opacity-70'
              : isSending
                ? 'bg-[#3d6eff]/50 text-white cursor-wait opacity-80'
                : 'bg-[#3d6eff] hover:bg-[#2b5ae6] hover:shadow-[#3d6eff]/20 active:scale-[0.98] text-white'
          }`}
        >
          {!address ? 'Connect Wallet' : isSending ? 'Approving & Sending...' : 'Send on Testnet'}
        </button>
      </div>

      {/* Transaction Status Overlay */}
      {txStatus !== 'idle' && (
        <div className={`fixed bottom-10 right-10 bg-card border px-6 py-4 rounded-xl flex items-center gap-3 shadow-[0_10px_40px_rgba(0,0,0,0.6)] z-50 min-w-[300px] ${
          txStatus === 'pending' ? 'border-[#3d6eff]' :
          txStatus === 'success' ? 'border-success' :
          'border-red-500'
        }`}>
          {txStatus === 'pending' && <Loader2 className="animate-spin text-[#3d6eff]" size={20} />}
          {txStatus === 'success' && <CheckCircle2 className="text-success" size={20} />}
          {txStatus === 'error' && <AlertCircle className="text-red-500" size={20} />}
          
          <div>
            <h4 className="text-sm font-semibold mb-0.5">
              {txStatus === 'pending' ? 'Transaction Pending' : txStatus === 'success' ? 'Send Successful' : 'Execution Failed'}
            </h4>
            <p className="text-xs text-text-secondary max-w-xs break-words">
              {txStatus === 'pending' && 'Approving & moving funds onchain...'}
              {txStatus === 'success' && (
                <>
                  Funds sent successfully.{' '}
                  {txHash && (
                    <a 
                      href={`https://testnet.arcscan.app/tx/${txHash}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-[#3d6eff] underline hover:text-white"
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
