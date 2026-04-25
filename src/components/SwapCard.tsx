import React, { useState } from 'react';
import { Settings, AlertCircle, CheckCircle2, Loader2, ArrowDownUp, X } from 'lucide-react';
import { TOKENS, CORE_ABI, CORE_CONTRACT, ARC_TESTNET_CONFIG, ERC20_ABI } from '../lib/contracts';
import { useLogs } from '../context/LogContext';
import { createWalletClient, createPublicClient, custom, http, parseUnits } from 'viem';
import { AppKit } from '@circle-fin/app-kit';

interface SwapCardProps {
  address: string | null;
  adapter: any | null;
}

const TOKEN_KEYS = Object.keys(TOKENS) as Array<keyof typeof TOKENS>;

const kit = new AppKit();

export function SwapCard({ address, adapter }: SwapCardProps) {
  const { logAction } = useLogs();
  const [tokenIn, setTokenIn] = useState<keyof typeof TOKENS>('USDC');
  const [tokenOut, setTokenOut] = useState<keyof typeof TOKENS>('EURC');
  const [amountIn, setAmountIn] = useState('');
  
  // Minimal frontend calculation for preview, 1:1 for testnet mockup
  // If we had a router, we would query `getAmountsOut`
  const expectedOut = amountIn ? (Number(amountIn) * 0.95).toFixed(4) : ''; 

  const [isSwapping, setIsSwapping] = useState(false);
  const [txStatus, setTxStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');
  const [txHash, setTxHash] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSwap = async () => {
    if (!address || !window.ethereum) {
      alert('Cüzdanını bağla.');
      return;
    }

    if (!amountIn || isNaN(Number(amountIn)) || Number(amountIn) <= 0) {
      alert('Geçerli bir miktar gir.');
      return;
    }

    if (tokenIn === tokenOut) {
      alert('Must select different tokens to swap.');
      return;
    }

    setIsSwapping(true);
    setTxStatus('pending');
    setErrorMessage(null);
    setTxHash(null);

    try {
      let hash = null;
      let usedAppKit = false;

      if (adapter) {
        try {
          const result = await kit.swap({
            from: { adapter, chain: 'Arc_Testnet' },
            tokenIn: tokenIn,
            tokenOut: tokenOut,
            amountIn: amountIn,
            config: {
              kitKey: import.meta.env.VITE_KIT_KEY || '',
            }
          });
          hash = result.txHash;
          usedAppKit = true;
        } catch (kitError: any) {
          console.warn("AppKit swap failed, falling back to Viem:", kitError);
        }
      }

      if (!hash) {
        const publicClient = createPublicClient({ 
          chain: ARC_TESTNET_CONFIG,
          transport: http('https://rpc.testnet.arc.network') 
        });
        const walletClient = createWalletClient({ 
          chain: ARC_TESTNET_CONFIG,
          transport: custom(window.ethereum as any) 
        });

        const dec = 6; 
        const parsedAmount = parseUnits(amountIn, dec);
        const addressIn = TOKENS[tokenIn];
        const addressOut = TOKENS[tokenOut];

        const { request: approveReq } = await publicClient.simulateContract({
          address: addressIn as `0x${string}`,
          abi: ERC20_ABI as any,
          functionName: 'approve',
          args: [CORE_CONTRACT as `0x${string}`, parsedAmount],
          account: address as `0x${string}`,
        });
        const approveHash = await walletClient.writeContract(approveReq as any);
        await publicClient.waitForTransactionReceipt({ hash: approveHash });

        const minAmountOut = 0n; 
        const { request: swapReq } = await publicClient.simulateContract({
          address: CORE_CONTRACT as `0x${string}`,
          abi: CORE_ABI as any,
          functionName: 'swap',
          args: [addressIn as `0x${string}`, addressOut as `0x${string}`, parsedAmount, minAmountOut],
          account: address as `0x${string}`,
        });
        hash = await walletClient.writeContract(swapReq as any);
        await publicClient.waitForTransactionReceipt({ hash });
      }

      setTxHash(hash);
      setTxStatus('success');
      logAction(`Swap Tokens (${usedAppKit ? 'AppKit' : 'Viem'})`, address, `Swapped ${amountIn} ${tokenIn} → ${tokenOut}. TxHash: ${hash}`);

    } catch (error: any) {
      setErrorMessage(error.shortMessage || error.message || 'Swap başarısız.');
      setTxStatus('error');
    } finally {
      setIsSwapping(false);
    }
  };

  const handleFlip = () => {
    setTokenIn(tokenOut);
    setTokenOut(tokenIn);
  };

  return (
    <>
      <div className="bg-card w-full max-w-[480px] p-4 rounded-[24px] border border-border shadow-[0_20px_40px_rgba(0,0,0,0.4)] relative">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <ArrowDownUp className="text-[#f1c40f]" size={22} /> Swap
          </h2>
          <button className="text-text-secondary hover:text-text-primary transition-colors cursor-pointer text-sm">
            <Settings size={18} />
          </button>
        </div>

        <div className="space-y-1 relative">
          
          {/* Token In */}
          <div className="bg-input rounded-2xl p-4 border border-transparent focus-within:border-[#f1c40f] transition-colors relative z-10">
            <div className="text-xs text-text-secondary mb-2">You Pay</div>
            <div className="flex justify-between items-center">
              <input
                type="number"
                placeholder="0.0"
                value={amountIn}
                onChange={(e) => setAmountIn(e.target.value)}
                className="text-4xl bg-transparent border-none text-text-primary w-full outline-none placeholder:text-text-secondary font-medium tracking-tight"
              />
              <div className="relative shrink-0 ml-4">
                <select
                  value={tokenIn}
                  onChange={(e) => setTokenIn(e.target.value as keyof typeof TOKENS)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                >
               {TOKEN_KEYS.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <div className="bg-card border border-border py-2 px-3 rounded-full flex items-center gap-2 pointer-events-none">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${tokenIn === 'USDC' ? 'bg-[#2775ca]' : 'bg-[#e2a828]'}`}>
                    {tokenIn.slice(0, 1)}
                  </div>
                  <span className="font-bold text-base">{tokenIn}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Flip Button */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
            <button 
              onClick={handleFlip}
              className="bg-card border border-border w-10 h-10 rounded-xl flex items-center justify-center hover:border-text-secondary transition-all text-text-secondary hover:text-white"
            >
              <ArrowDownUp size={18} />
            </button>
          </div>

          {/* Token Out */}
          <div className="bg-input rounded-2xl p-4 border border-transparent transition-colors relative z-0 pt-6">
             <div className="text-xs text-text-secondary mb-2">You Receive</div>
             <div className="flex justify-between items-center">
              <input
                type="text"
                placeholder="0.0"
                value={expectedOut}
                readOnly
                className="text-4xl bg-transparent border-none text-text-secondary w-full outline-none opacity-80 font-medium tracking-tight"
              />
              <div className="relative shrink-0 ml-4">
                <select
                  value={tokenOut}
                  onChange={(e) => setTokenOut(e.target.value as keyof typeof TOKENS)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                >
               {TOKEN_KEYS.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <div className="bg-card border border-border py-2 px-3 rounded-full flex items-center gap-2 pointer-events-none">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${tokenOut === 'USDC' ? 'bg-[#2775ca]' : 'bg-[#e2a828]'}`}>
                    {tokenOut.slice(0, 1)}
                  </div>
                  <span className="font-bold text-base">{tokenOut}</span>
                </div>
              </div>
            </div>
          </div>
          
        </div>
        
        {/* Helper Footer */}
        <div className="px-2 mt-4 space-y-1">
            <div className="flex justify-between text-xs text-text-secondary">
                <span>Fee</span>
                <span>0.3%</span>
            </div>
             <div className="flex justify-between text-xs text-text-secondary">
                <span>Routing</span>
                <span>Arc Native DEX</span>
            </div>
        </div>

        {/* Action Button */}
        <button
          onClick={handleSwap}
          disabled={!address || isSwapping || !amountIn || Number(amountIn) <= 0 || tokenIn === tokenOut}
          className={`w-full p-4 rounded-xl text-lg font-bold mt-4 transition-all shadow-lg ${
            !address || !amountIn || Number(amountIn) <= 0 || tokenIn === tokenOut
              ? 'bg-input text-text-secondary cursor-not-allowed opacity-70'
              : isSwapping
                ? 'bg-[#f1c40f]/50 text-white cursor-wait opacity-80'
                : 'bg-[#f1c40f] hover:bg-[#d4ac0d] hover:shadow-[#f1c40f]/20 active:scale-[0.98] text-black'
          }`}
        >
          {!address ? 'Connect Wallet' : isSwapping ? 'Approving & Swapping...' : 'Swap Tokens'}
        </button>
      </div>

      {txStatus !== 'idle' && (
        <div className={`fixed bottom-10 right-10 bg-card border px-6 py-4 rounded-xl flex items-center gap-3 shadow-[0_10px_40px_rgba(0,0,0,0.6)] z-50 min-w-[300px] ${
          txStatus === 'pending' ? 'border-[#f1c40f]' :
          txStatus === 'success' ? 'border-success' :
          'border-red-500'
        }`}>
          {txStatus === 'pending' && <Loader2 className="animate-spin text-[#f1c40f]" size={20} />}
          {txStatus === 'success' && <CheckCircle2 className="text-success" size={20} />}
          {txStatus === 'error' && <AlertCircle className="text-red-500" size={20} />}
          
          <div>
            <h4 className="text-sm font-semibold mb-0.5">
              {txStatus === 'pending' ? 'Swap Pending' : txStatus === 'success' ? 'Swap Successful' : 'Swap Failed'}
            </h4>
            <div className="absolute top-2 right-2">
              <button onClick={() => setTxStatus('idle')} className="text-text-secondary hover:text-white">
                <X size={16} />
              </button>
            </div>
            <p className="text-xs text-text-secondary max-w-xs break-words">
              {txStatus === 'pending' && 'Approving & resolving onchain...'}
              {txStatus === 'success' && (
                <>
                  Tokens swapped via Arc DEX.{' '}
                  {txHash && (
                    <a 
                      href={`https://testnet.arcscan.app/tx/${txHash}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-[#f1c40f] underline hover:text-white"
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
