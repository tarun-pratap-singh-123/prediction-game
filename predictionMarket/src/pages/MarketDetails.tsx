import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { formatUnits, parseUnits } from 'viem';
import WalletConnect from '../components/WalletConnect';
import { PREDICTION_MARKET_ADDRESS, MOCK_USDC_ADDRESS } from '../config/contracts';
import { PredictionMarketAbi } from '../abi/PredictionMarket';
import { MockUSDCAbi } from '../abi/MockUSDC';
import { fetchMarket, Market } from '../api/markets';

export default function MarketDetails() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { address, isConnected } = useAccount();

    const [betAmount, setBetAmount] = useState('');
    const [needsApproval, setNeedsApproval] = useState(false);

    const [market, setMarket] = useState<Market | null>(null);
    const [isLoadingMarket, setIsLoadingMarket] = useState(true);

    // Fetch market data from API
    useEffect(() => {
        const loadMarket = async () => {
            if (!id) return;
            setIsLoadingMarket(true);
            try {
                const data = await fetchMarket(id);
                setMarket(data);
            } catch (error) {
                console.error("Error fetching market:", error);
            } finally {
                setIsLoadingMarket(false);
            }
        };
        loadMarket();
    }, [id]);

    // Read user position
    const { data: userPosition, refetch: refetchPosition } = useReadContract({
        address: PREDICTION_MARKET_ADDRESS,
        abi: PredictionMarketAbi,
        functionName: 'getUserPosition',
        args: [BigInt(id || '0'), address || '0x'],
    }) as { data: any; refetch: any };

    // Read USDC balance
    const { data: balance, refetch: refetchBalance } = useReadContract({
        address: MOCK_USDC_ADDRESS,
        abi: MockUSDCAbi,
        functionName: 'balanceOf',
        args: [address || '0x'],
    });

    // Read USDC allowance
    const { data: allowance, refetch: refetchAllowance } = useReadContract({
        address: MOCK_USDC_ADDRESS,
        abi: MockUSDCAbi,
        functionName: 'allowance',
        args: [address || '0x', PREDICTION_MARKET_ADDRESS],
    });

    // Check if approval is needed
    useEffect(() => {
        if (!betAmount || !allowance) {
            setNeedsApproval(false);
            return;
        }

        try {
            const amountWei = parseUnits(betAmount, 6);
            setNeedsApproval(BigInt(allowance as any) < amountWei);
        } catch {
            setNeedsApproval(false);
        }
    }, [betAmount, allowance]);

    // Approve USDC
    const {
        data: approveHash,
        writeContractAsync: approve,
        isPending: isApprovePending,
        error: approveError,
    } = useWriteContract();

    const { isLoading: isApproveConfirming, isSuccess: isApproveSuccess } = useWaitForTransactionReceipt({
        hash: approveHash,
    });

    // Place bet
    const {
        data: betHash,
        writeContractAsync: placeBet,
        isPending: isBetPending,
        error: betError,
    } = useWriteContract();

    const { isLoading: isBetConfirming, isSuccess: isBetSuccess } = useWaitForTransactionReceipt({
        hash: betHash,
    });

    // Resolve market
    const {
        data: resolveHash,
        writeContractAsync: resolveMarket,
        isPending: isResolvePending,
        error: resolveError,
    } = useWriteContract();

    const { isSuccess: isResolveSuccess } = useWaitForTransactionReceipt({
        hash: resolveHash,
    });

    // Claim winnings
    const {
        data: claimHash,
        writeContractAsync: claimWinnings,
        isPending: isClaimPending,
        error: claimError,
    } = useWriteContract();

    const { isSuccess: isClaimSuccess } = useWaitForTransactionReceipt({
        hash: claimHash,
    });

    // Mint USDC (for testing)
    const { writeContractAsync: mintUSDC, isPending: isMinting } = useWriteContract();

    useEffect(() => {
        if (isApproveSuccess) {
            refetchAllowance();
        }
    }, [isApproveSuccess]);

    useEffect(() => {
        if (isBetSuccess || isResolveSuccess || isClaimSuccess) {
            // Refetch market data from API (might need delay for sync)
            setTimeout(() => {
                if (id) fetchMarket(id).then(setMarket);
            }, 2000);
            refetchPosition();
            refetchAllowance();
            refetchBalance();
        }
    }, [isBetSuccess, isResolveSuccess, isClaimSuccess, id]);

    const handleApprove = async () => {
        if (!betAmount) return;
        const amountWei = parseUnits(betAmount, 6);

        try {
            await approve({
                address: MOCK_USDC_ADDRESS,
                abi: MockUSDCAbi,
                functionName: 'approve',
                args: [PREDICTION_MARKET_ADDRESS, amountWei],
            });
        } catch (err) {
            console.error("Approval failed:", err);
        }
    };

    const handleMint = async () => {
        if (!address) return;
        try {
            await mintUSDC({
                address: MOCK_USDC_ADDRESS,
                abi: MockUSDCAbi,
                functionName: 'mint',
                args: [address, parseUnits('1000', 6)],
            });
            setTimeout(refetchBalance, 2000);
        } catch (err) {
            console.error("Minting failed:", err);
        }
    };

    const handleResolve = (outcome: boolean) => {
        resolveMarket({
            address: PREDICTION_MARKET_ADDRESS,
            abi: PredictionMarketAbi,
            functionName: 'resolveMarket',
            args: [BigInt(id || '0'), outcome],
        });
    };

    const handleClaim = () => {
        claimWinnings({
            address: PREDICTION_MARKET_ADDRESS,
            abi: PredictionMarketAbi,
            functionName: 'claimWinnings',
            args: [BigInt(id || '0')],
        });
    };

    if (isLoadingMarket || !market) {
        return (
            <div className="min-h-screen bg-dark-950 flex items-center justify-center">
                <div className="loading-shimmer h-64 w-full max-w-4xl rounded-2xl" />
            </div>
        );
    }

    const { question, end_time, yes_volume, no_volume, resolved, outcome } = market;
    const endTime = BigInt(end_time);
    const yesPool = BigInt(yes_volume);
    const noPool = BigInt(no_volume);

    const totalPool = BigInt(yesPool) + BigInt(noPool);
    const yesPercentage = totalPool > 0n ? Number((BigInt(yesPool) * 10000n) / totalPool) / 100 : 50;
    const noPercentage = 100 - yesPercentage;

    const endDate = new Date(Number(endTime) * 1000);
    const hasEnded = new Date() > endDate;
    const isActive = !resolved && !hasEnded;

    // Calculate potential winnings
    const calculatePotentialWinnings = (side: 'yes' | 'no') => {
        if (!betAmount) return 0;
        try {
            const amount = parseUnits(betAmount, 6);
            const currentPool = side === 'yes' ? BigInt(yesPool) : BigInt(noPool);
            const newPool = currentPool + amount;
            const newTotal = totalPool + amount;

            if (newPool === 0n) return 0;

            const winnings = (amount * newTotal) / newPool;
            return Number(formatUnits(winnings, 6));
        } catch {
            return 0;
        }
    };

    const handlePlaceBet = async (side: 'yes' | 'no') => {
        if (!betAmount) return;
        const amountWei = parseUnits(betAmount, 6);
        const finalId = BigInt(String(id));
        const functionName = side === 'yes' ? 'buyYes' : 'buyNo';

        try {
            await placeBet({
                address: PREDICTION_MARKET_ADDRESS,
                abi: PredictionMarketAbi,
                functionName,
                args: [finalId, amountWei],
            });
        } catch (err) {
            console.error("Betting failed:", err);
        }
    };

    return (
        <div className="min-h-screen bg-dark-950">
            {/* Header */}
            <header className="glass-card mx-4 mt-4 mb-8 p-6">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <div>
                        <button onClick={() => navigate('/')} className="text-primary-400 hover:text-primary-300 mb-2">
                            ← Back to Markets
                        </button>
                        <h1 className="text-2xl font-bold text-gradient">Market Details</h1>
                    </div>
                    <div className="flex items-center gap-4">
                        {isConnected && balance !== undefined && (
                            <div className="text-right">
                                <p className="text-xs text-gray-400">Your Balance</p>
                                <p className="text-sm font-bold text-primary-400">
                                    ${Number(formatUnits(balance as bigint, 6)).toFixed(2)} USDC
                                </p>
                            </div>
                        )}
                        <WalletConnect />
                    </div>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-4 pb-12">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column - Market Info */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Question */}
                        <div className="glass-card p-8">
                            <div className="flex justify-between items-start mb-6">
                                {resolved ? (
                                    <span className={outcome ? 'badge-success text-lg' : 'badge-danger text-lg'}>
                                        {outcome ? '✓ YES Won' : '✗ NO Won'}
                                    </span>
                                ) : hasEnded ? (
                                    <span className="badge-info text-lg">Awaiting Resolution</span>
                                ) : (
                                    <span className="badge-success text-lg">Active</span>
                                )}
                            </div>

                            <h2 className="text-3xl font-bold mb-4">{question}</h2>

                            <div className="grid grid-cols-3 gap-4 mt-6">
                                <div className="stat-card">
                                    <p className="text-xs text-gray-400 mb-1">Total Liquidity</p>
                                    <p className="text-xl font-bold text-primary-400">
                                        ${Number(formatUnits(totalPool, 6)).toFixed(0)}
                                    </p>
                                </div>
                                <div className="stat-card">
                                    <p className="text-xs text-gray-400 mb-1">End Time</p>
                                    <p className="text-lg font-semibold">{endDate.toLocaleString()}</p>
                                </div>
                                <div className="stat-card">
                                    <p className="text-xs text-gray-400 mb-1">Status</p>
                                    <p className="text-lg font-semibold">{hasEnded ? 'Ended' : 'Active'}</p>
                                </div>
                            </div>
                        </div>

                        {/* Odds */}
                        <div className="glass-card p-8">
                            <h3 className="text-xl font-bold mb-6">Current Odds</h3>

                            <div className="space-y-6">
                                <div>
                                    <div className="flex justify-between items-center mb-3">
                                        <span className="text-success-500 text-xl font-bold">YES</span>
                                        <div className="text-right">
                                            <div className="text-2xl font-bold text-success-500">{yesPercentage.toFixed(1)}%</div>
                                            <div className="text-sm text-gray-400">${Number(formatUnits(BigInt(yesPool), 6)).toFixed(0)}</div>
                                        </div>
                                    </div>
                                    <div className="progress-bar h-3">
                                        <div
                                            className="h-full bg-gradient-to-r from-success-500 to-success-600"
                                            style={{ width: `${yesPercentage}%` }}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <div className="flex justify-between items-center mb-3">
                                        <span className="text-danger-500 text-xl font-bold">NO</span>
                                        <div className="text-right">
                                            <div className="text-2xl font-bold text-danger-500">{noPercentage.toFixed(1)}%</div>
                                            <div className="text-sm text-gray-400">${Number(formatUnits(BigInt(noPool), 6)).toFixed(0)}</div>
                                        </div>
                                    </div>
                                    <div className="progress-bar h-3">
                                        <div
                                            className="h-full bg-gradient-to-r from-danger-500 to-danger-600"
                                            style={{ width: `${noPercentage}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Your Position */}
                        {userPosition && isConnected && (
                            <div className="glass-card p-8">
                                <h3 className="text-xl font-bold mb-4">Your Position</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="stat-card">
                                        <p className="text-xs text-gray-400 mb-1">YES Bet</p>
                                        <p className="text-lg font-bold text-success-500">
                                            ${Number(formatUnits((userPosition as any).yesAmount || 0n, 6)).toFixed(2)}
                                        </p>
                                    </div>
                                    <div className="stat-card">
                                        <p className="text-xs text-gray-400 mb-1">NO Bet</p>
                                        <p className="text-lg font-bold text-danger-500">
                                            ${Number(formatUnits((userPosition as any).noAmount || 0n, 6)).toFixed(2)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Column - Actions */}
                    <div className="space-y-6">
                        {/* Bet Panel */}
                        {isActive && isConnected && (
                            <div className="glass-card p-6">
                                <h3 className="text-xl font-bold mb-4">Place Bet</h3>

                                {/* Amount Input */}
                                <div className="mb-4">
                                    <label className="block text-sm font-semibold mb-2">Amount (USDC)</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="number"
                                            value={betAmount}
                                            onChange={(e) => setBetAmount(e.target.value)}
                                            placeholder="0.00"
                                            className="input flex-1"
                                            step="0.01"
                                            min="0"
                                        />
                                        {balance !== undefined && BigInt(balance as any) === 0n && (
                                            <button
                                                onClick={handleMint}
                                                disabled={isMinting}
                                                className="btn-outline text-xs py-2"
                                            >
                                                {isMinting ? '...' : 'Get USDC'}
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Potential Winnings Display (for both sides) */}
                                {betAmount && (
                                    <div className="space-y-2 mb-4">
                                        <div className="stat-card">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-success-500">If YES wins:</span>
                                                <span className="font-bold">${calculatePotentialWinnings('yes').toFixed(2)}</span>
                                            </div>
                                        </div>
                                        <div className="stat-card">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-danger-500">If NO wins:</span>
                                                <span className="font-bold">${calculatePotentialWinnings('no').toFixed(2)}</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Action Buttons */}
                                {needsApproval ? (
                                    <button
                                        onClick={handleApprove}
                                        disabled={isApprovePending || isApproveConfirming}
                                        className="btn-primary w-full"
                                    >
                                        {isApprovePending || isApproveConfirming ? 'Approving...' : 'Approve USDC'}
                                    </button>
                                ) : (
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            onClick={() => handlePlaceBet('yes')}
                                            disabled={!betAmount || isBetPending || isBetConfirming}
                                            className="btn-success"
                                        >
                                            {isBetPending || isBetConfirming ? 'Buying...' : 'Buy YES'}
                                        </button>
                                        <button
                                            onClick={() => handlePlaceBet('no')}
                                            disabled={!betAmount || isBetPending || isBetConfirming}
                                            className="btn-danger"
                                        >
                                            {isBetPending || isBetConfirming ? 'Buying...' : 'Buy NO'}
                                        </button>
                                    </div>
                                )}

                                {isBetSuccess && (
                                    <div className="mt-4 p-3 bg-success-500/10 border border-success-500/30 rounded-xl">
                                        <p className="text-success-500 text-sm">✓ Bet placed successfully!</p>
                                    </div>
                                )}

                                {(approveError || betError) && (
                                    <div className="mt-4 p-3 bg-danger-500/10 border border-danger-500/30 rounded-xl">
                                        <p className="text-danger-500 text-sm">
                                            Error: {approveError?.message || betError?.message || 'Transaction failed'}
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Resolve Panel (Admin Only) */}
                        {hasEnded && !resolved && isConnected && (
                            <div className="glass-card p-6">
                                <h3 className="text-xl font-bold mb-4">Resolve Market</h3>
                                <p className="text-sm text-gray-400 mb-4">Admin: Resolve the market outcome</p>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => handleResolve(true)}
                                        disabled={isResolvePending}
                                        className="btn-success"
                                    >
                                        {isResolvePending ? 'Resolving...' : 'YES Wins'}
                                    </button>
                                    <button
                                        onClick={() => handleResolve(false)}
                                        disabled={isResolvePending}
                                        className="btn-danger"
                                    >
                                        {isResolvePending ? 'Resolving...' : 'NO Wins'}
                                    </button>
                                </div>
                                {resolveError && (
                                    <div className="mt-4 p-3 bg-danger-500/10 border border-danger-500/30 rounded-xl">
                                        <p className="text-danger-500 text-sm">Error: {resolveError.message}</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Claim Panel */}
                        {resolved && userPosition && !((userPosition as any).claimed) && isConnected && (
                            <div className="glass-card p-6">
                                <h3 className="text-xl font-bold mb-4">Claim Winnings</h3>
                                <button
                                    onClick={handleClaim}
                                    disabled={isClaimPending}
                                    className="btn-primary w-full"
                                >
                                    {isClaimPending ? 'Claiming...' : 'Claim Rewards'}
                                </button>

                                {isClaimSuccess && (
                                    <div className="mt-4 p-3 bg-success-500/10 border border-success-500/30 rounded-xl">
                                        <p className="text-success-500 text-sm">✓ Winnings claimed!</p>
                                    </div>
                                )}
                                {claimError && (
                                    <div className="mt-4 p-3 bg-danger-500/10 border border-danger-500/30 rounded-xl">
                                        <p className="text-danger-500 text-sm">Error: {claimError.message}</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
