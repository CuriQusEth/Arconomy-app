import React, { useEffect, useState } from 'react';
import { createPublicClient, custom, formatUnits, http } from 'viem';
import { RefreshCcw } from 'lucide-react';
import { TOKENS, ERC20_ABI, ARC_TESTNET_CONFIG } from '../lib/contracts';

interface BalanceWidgetProps {
  address: string | null;
}

export function BalanceWidget({ address }: BalanceWidgetProps) {
  const [balances, setBalances] = useState<Record<string, string>>({
    USDC: '0.00',
    EURC: '0.00'
  });
  const [loading, setLoading] = useState(false);

  const fetchBalances = async () => {
    if (!address || !window.ethereum) return;
    setLoading(true);
    try {
      const publicClient = createPublicClient({
        chain: ARC_TESTNET_CONFIG,
        transport: http('https://rpc.testnet.arc.network')
      });
      
      const newBals = { ...balances };
      
      for (const [key, tokenAddress] of Object.entries(TOKENS)) {
        try {
          // @ts-ignore - Viem types causing issues with missing properties on testnets
          const bal = await publicClient.readContract({
             address: tokenAddress as `0x${string}`,
             abi: ERC20_ABI as any,
             functionName: 'balanceOf',
             args: [address as `0x${string}`]
          }) as bigint;
          
          newBals[key] = Number(formatUnits(bal, 6)).toFixed(2);
        } catch (e) {
          console.error(`Failed to fetch ${key} balance`, e);
          newBals[key] = '0.00';
        }
      }

      setBalances(newBals);
    } catch (err) {
      console.error("Error setting up public client:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBalances();
  }, [address]);

  if (!address) return null;

  return (
    <div className="bg-card border border-border p-3 rounded-xl flex items-center justify-between gap-4 shadow-sm w-full max-w-[550px]">
       <div className="flex gap-4 items-center">
         <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-[#2775ca] flex items-center justify-center text-[8px] font-bold text-white shadow-sm">U</div>
            <span className="text-sm font-semibold">{balances.USDC} <span className="text-text-secondary text-xs font-normal">USDC</span></span>
         </div>
         <div className="w-[1px] h-4 bg-border"></div>
         <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-[#e2a828] flex items-center justify-center text-[8px] font-bold text-white shadow-sm">E</div>
            <span className="text-sm font-semibold">{balances.EURC} <span className="text-text-secondary text-xs font-normal">EURC</span></span>
         </div>
       </div>
       <button onClick={fetchBalances} className={`text-text-secondary hover:text-white transition-colors p-1 ${loading ? 'animate-spin opacity-50' : ''}`} title="Refresh Balances">
          <RefreshCcw size={16} />
       </button>
    </div>
  );
}
