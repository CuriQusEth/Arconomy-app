import React, { useState, useEffect } from 'react';
import { Loader2, CheckCircle2, AlertCircle, SunMedium, Flame } from 'lucide-react';
import { createWalletClient, createPublicClient, custom } from 'viem';

interface GMCardProps {
  address: string | null;
}

export function GMCard({ address }: GMCardProps) {
  const [streak, setStreak] = useState(0);
  const [lastGMTime, setLastGMTime] = useState<number | null>(null);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [txStatus, setTxStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');
  const [txHash, setTxHash] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (address) {
      const savedData = localStorage.getItem(`arconomy_gm_${address}`);
      if (savedData) {
        try {
          const parsed = JSON.parse(savedData);
          setStreak(parsed.streak || 0);
          setLastGMTime(parsed.lastGMTime || null);
        } catch (e) {}
      } else {
        setStreak(0);
        setLastGMTime(null);
      }
    }
  }, [address]);

  const canSayGM = () => {
    if (!lastGMTime) return true;
    const oneDay = 24 * 60 * 60 * 1000;
    // For demo purposes, we will treat cooldown as 1 minute so you don't wait a full day while testing:
    const DEMO_COOLDOWN = 60 * 1000; 
    return Date.now() - lastGMTime > DEMO_COOLDOWN; // Change to oneDay in production
  };

  const executeGM = async () => {
    if (!address || !window.ethereum) {
      alert('Please connect your wallet first.');
      return;
    }

    if (!canSayGM()) {
      alert('You have already said GM recently! Come back later.');
      return;
    }

    setIsProcessing(true);
    setTxStatus('pending');
    setErrorMessage(null);
    setTxHash(null);

    try {
      const arcTestnet = {
        id: 5042002,
        name: 'Arc Testnet',
        nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
        rpcUrls: { default: { http: ['https://rpc.testnet.arc.network'] } }
      } as const;

      // Ensure Correct Chain
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x4cef52' }], // 5042002 in hex
        });
      } catch (switchError: any) {
        if (switchError.code === 4902) {
          try {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [
                {
                  chainId: '0x4cef52',
                  chainName: 'Arc Testnet',
                  rpcUrls: ['https://rpc.testnet.arc.network'],
                  nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
                  blockExplorerUrls: ['https://testnet.arcscan.app']
                },
              ],
            });
          } catch (addError) {
            throw new Error('Failed to add Arc Testnet.');
          }
        } else {
          throw new Error('Switch to Arc Testnet was rejected.');
        }
      }

      const publicClient = createPublicClient({ 
        chain: arcTestnet,
        transport: custom(window.ethereum as any) 
      });
      const walletClient = createWalletClient({ 
        chain: arcTestnet,
        transport: custom(window.ethereum as any) 
      });

      const account = address as `0x${string}`;

      // Contract execution instead of 0-value transaction
      const GM_CONTRACT = '0x616259C32a21999EAcefa8ccA964Fc983C253359' as const;
      const GM_ABI = [
        {
          inputs: [],
          name: "gm",
          outputs: [],
          stateMutability: "nonpayable",
          type: "function"
        }
      ] as const;

      const hash = await walletClient.writeContract({
        address: GM_CONTRACT,
        abi: GM_ABI,
        functionName: 'gm',
        account,
        chain: arcTestnet
      });

      await publicClient.waitForTransactionReceipt({ hash });

      setTxHash(hash);
      setTxStatus('success');

      // Update Local Streak
      const currentTime = Date.now();
      const newStreak = streak + 1;
      setStreak(newStreak);
      setLastGMTime(currentTime);

      localStorage.setItem(`arconomy_gm_${address}`, JSON.stringify({
        streak: newStreak,
        lastGMTime: currentTime
      }));

      // Call Backend API to Process Circle Reward
      try {
        const rewardRes = await fetch('/api/circle/reward', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address, streak: newStreak })
        });
        const rewardData = await rewardRes.json();
        if (rewardData.success) {
          console.log(rewardData.message);
          // Optional: Display success message from backend if desired
        }
      } catch (err) {
        console.error("Failed to fetch reward:", err);
      }

    } catch (error: any) {
      console.error('GM Tx failed:', error);
      setErrorMessage(error.shortMessage || error.message || 'Transaction failed.');
      setTxStatus('error');
    } finally {
      setIsProcessing(false);
    }
  };

  const getBadgeColor = () => {
    if (streak >= 100) return 'text-purple-400 border-purple-400';
    if (streak >= 30) return 'text-blue-400 border-blue-400';
    if (streak >= 7) return 'text-orange-400 border-orange-400';
    return 'text-gray-400 border-gray-400';
  };

  const getBadgeName = () => {
    if (streak >= 100) return 'Diamond Identity';
    if (streak >= 30) return 'Silver Identity';
    if (streak >= 7) return 'Bronze Badge';
    return 'Novice';
  };

  return (
    <>
      <div className="bg-card w-full max-w-[480px] p-6 rounded-[24px] border border-border shadow-[0_20px_40px_rgba(0,0,0,0.4)]">
        <div className="flex justify-between items-center mb-6">
          <div className="flex flex-col">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <SunMedium size={22} className="text-[#f1c40f]" />
              Arc GM Check-in
            </h2>
            <span className="text-xs text-text-secondary mt-1">Lightweight On-Chain Reputation</span>
          </div>
          {address && (
            <div className={`px-3 py-1 rounded-full border text-xs font-bold flex items-center gap-1 ${getBadgeColor()}`}>
              <Flame size={14} /> Streak: {streak}
            </div>
          )}
        </div>

        <div className="bg-input p-4 rounded-2xl border border-transparent flex flex-col items-center justify-center py-8">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#f1c40f]/20 to-transparent border border-[#f1c40f]/40 flex items-center justify-center mb-4">
            <SunMedium size={28} className="text-[#f1c40f]" />
          </div>
          <h3 className="text-lg font-bold">Say "GM" on Arc</h3>
          <p className="text-sm text-center text-text-secondary mt-2 px-4">
            Prove your daily activity by interacting with the GM Smart Contract on the Arc Testnet. 
            Build your reputation streak!
          </p>
          
          <div className="mt-4 text-xs font-semibold px-3 py-1 rounded bg-[#3d6eff]/10 text-[#3d6eff]">
            Current Rank: {getBadgeName()}
          </div>
        </div>

        <button
          onClick={executeGM}
          disabled={!address || isProcessing || !canSayGM()}
          className={`w-full p-4 rounded-xl text-md shadow-lg font-semibold mt-6 transition-colors ${
            !address ? 'bg-input text-text-secondary cursor-not-allowed' :
            !canSayGM() ? 'bg-success/20 text-success cursor-not-allowed border border-success/30' :
            isProcessing ? 'bg-accent/50 text-white/50 cursor-not-allowed' :
            'bg-[#3d6eff] hover:bg-[#2b5ae6] text-white'
          }`}
        >
          {!address ? 'Connect Wallet' : 
            !canSayGM() ? 'GM already said today! ✨' : 
            isProcessing ? 'Saying GM...' : 'Say GM (Check-in)'}
        </button>
      </div>

      {txStatus !== 'idle' && (
        <div className={`fixed bottom-10 right-10 bg-card border px-6 py-4 rounded-xl flex flex-col gap-1 shadow-[0_10px_40px_rgba(0,0,0,0.6)] z-50 min-w-[300px] ${
          txStatus === 'pending' ? 'border-[#3d6eff]' :
          txStatus === 'success' ? 'border-success' :
          'border-red-500'
        }`}>
          <div className="flex items-center gap-3">
            {txStatus === 'pending' && <Loader2 className="animate-spin text-[#3d6eff]" size={20} />}
            {txStatus === 'success' && <CheckCircle2 className="text-success" size={20} />}
            {txStatus === 'error' && <AlertCircle className="text-red-500" size={20} />}
            
            <h4 className="text-sm font-semibold">
              {txStatus === 'pending' ? 'Transaction Pending' : txStatus === 'success' ? 'GM Recorded!' : 'Execution Failed'}
            </h4>
          </div>
          <p className="text-xs text-text-secondary max-w-xs break-words mt-1 pl-8">
            {txStatus === 'pending' && 'Please check your wallet and approve the GM contract interaction...'}
            {txStatus === 'success' && (
              <>
                Your GM streak has increased by +1!{' '}
                {txHash && (
                  <a href={`https://testnet.arcscan.app/tx/${txHash}`} target="_blank" rel="noopener noreferrer" className="text-[#f1c40f] underline hover:text-white block mt-1">
                    View on ArcScan
                  </a>
                )}
              </>
            )}
            {txStatus === 'error' && errorMessage}
          </p>
        </div>
      )}
    </>
  );
}
