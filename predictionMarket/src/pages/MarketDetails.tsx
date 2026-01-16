import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { formatUnits, parseUnits } from 'viem';
import WalletConnect from '../components/WalletConnect';
import { PREDICTION_MARKET_ADDRESS, MOCK_USDC_ADDRESS } from '../config/contracts';
import { PredictionMarketAbi } from '../abi/PredictionMarket';
import { MockUSDCAbi } from '../abi/MockUSDC';

export default function MarketDetails() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { address, isConnected } = useAccount();

    const [betSide, setBetSide] = useState<'yes' | 'no'>('yes');
    const [betAmount, setBetAmount] = useState('');
    const [needsApproval, setNeedsApproval] = useState(false);

    // Read market data
    const { data: market, refetch: refetchMarket } = useReadContract({
        address: PREDICTION_MARKET_ADDRESS,
        abi: PredictionMarketAbi,
        functionName: 'getMarket',
        args: [BigInt(id || '0')],
    });

    // Read user position
    const { data: userPosition, refetch: refetchPosition } = useReadContract({
        address: PREDICTION_MARKET_ADDRESS,
        abi: PredictionMarketAbi,
        functionName: 'getUserPosition',
        args: [BigInt(id || '0'), address || '0x'],
    }) as { data: any; refetch: any };

    // Read USDC allowance
    const { data: allowance } = useReadContract({
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
        writeContract: approve,
        isPending: isApprovePending,
    } = useWriteContract();

    const { isLoading: isApproveConfirming } = useWaitForTransactionReceipt({
        hash: approveHash,
    });

    // Place bet
    const {
        data: betHash,
        writeContract: placeBet,
        isPending: isBetPending,
    } = useWriteContract();

    const { isLoading: isBetConfirming, isSuccess: isBetSuccess } = useWaitForTransactionReceipt({
        hash: betHash,
    });

    // Resolve market
    const {
        data: resolveHash,
        writeContract: resolveMarket,
        isPending: isResolvePending,
    } = useWriteContract();

    const { isSuccess: isResolveSuccess } = useWaitForTransactionReceipt({
        hash: resolveHash,
    });

    // Claim winnings
    const {
        data: claimHash,
        writeContract: claimWinnings,
        isPending: isClaimPending,
    } = useWriteContract();

    const { isSuccess: isClaimSuccess } = useWaitForTransactionReceipt({
        hash: claimHash,
    });

    useEffect(() => {
        if (isBetSuccess || isResolveSuccess || isClaimSuccess) {
            refetchMarket();
            refetchPosition();
        }
    }, [isBetSuccess, isResolveSuccess, isClaimSuccess]);

    const handleApprove = () => {
        if (!betAmount) return;
        const amountWei = parseUnits(betAmount, 6);

        approve({
            address: MOCK_USDC_ADDRESS,
            abi: MockUSDCAbi,
            functionName: 'approve',
            args: [PREDICTION_MARKET_ADDRESS, amountWei],
        });
    };

    const handlePlaceBet = () => {
        if (!betAmount) return;
        const amountWei = parseUnits(betAmount, 6);

        const functionName = betSide === 'yes' ? 'buyYes' : 'buyNo';

        placeBet({
            address: PREDICTION_MARKET_ADDRESS,
            abi: PredictionMarketAbi,
            functionName,
            args: [BigInt(id || '0'), amountWei],
        });
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

    if (!market) {
        return (
            <div className="min-h-screen bg-dark-950 flex items-center justify-center">
                <div className="loading-shimmer h-64 w-full max-w-4xl rounded-2xl" />
            </div>
        );
    }

    const [question, , endTime, yesPool, noPool, resolved, outcome] = market as any[];

    const totalPool = BigInt(yesPool) + BigInt(noPool);
    const yesPercentage = totalPool > 0n ? Number((BigInt(yesPool) * 10000n) / totalPool) / 100 : 50;
    const noPercentage = 100 - yesPercentage;

    const endDate = new Date(Number(endTime) * 1000);
    const hasEnded = new Date() > endDate;
    const isActive = !resolved && !hasEnded;

    // Calculate potential winnings
    const calculatePotentialWinnings = () => {
        if (!betAmount) return 0;
        try {
            const amount = parseUnits(betAmount, 6);
            const currentPool = betSide === 'yes' ? BigInt(yesPool) : BigInt(noPool);
            const newPool = currentPool + amount;
            const newTotal = totalPool + amount;

            if (newPool === 0n) return 0;

            const winnings = (amount * newTotal) / newPool;
            return Number(formatUnits(winnings, 6));
        } catch {
            return 0;
        }
    };

    const potentialWinnings = calculatePotentialWinnings();
    const potentialProfit = potentialWinnings - (betAmount ? parseFloat(betAmount) : 0);

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
                    <WalletConnect />
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

                                {/* Side Selection */}
                                <div className="grid grid-cols-2 gap-3 mb-4">
                                    <button
                                        onClick={() => setBetSide('yes')}
                                        className={betSide === 'yes' ? 'btn-success' : 'btn-outline'}
                                    >
                                        YES
                                    </button>
                                    <button
                                        onClick={() => setBetSide('no')}
                                        className={betSide === 'no' ? 'btn-danger' : 'btn-outline'}
                                    >
                                        NO
                                    </button>
                                </div>

                                {/* Amount Input */}
                                <div className="mb-4">
                                    <label className="block text-sm font-semibold mb-2">Amount (USDC)</label>
                                    <input
                                        type="number"
                                        value={betAmount}
                                        onChange={(e) => setBetAmount(e.target.value)}
                                        placeholder="0.00"
                                        className="input"
                                        step="0.01"
                                        min="0"
                                    />
                                </div>

                                {/* Potential Winnings */}
                                {betAmount && (
                                    <div className="stat-card mb-4">
                                        <div className="flex justify-between text-sm mb-1">
                                            <span className="text-gray-400">Potential Winnings:</span>
                                            <span className="font-bold">${potentialWinnings.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-400">Potential Profit:</span>
                                            <span className={`font-bold ${potentialProfit > 0 ? 'text-success-500' : 'text-danger-500'}`}>
                                                ${potentialProfit.toFixed(2)}
                                            </span>
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
                                    <button
                                        onClick={handlePlaceBet}
                                        disabled={!betAmount || isBetPending || isBetConfirming}
                                        className={betSide === 'yes' ? 'btn-success w-full' : 'btn-danger w-full'}
                                    >
                                        {isBetPending || isBetConfirming ? 'Placing Bet...' : `Bet ${betSide.toUpperCase()}`}
                                    </button>
                                )}

                                {isBetSuccess && (
                                    <div className="mt-4 p-3 bg-success-500/10 border border-success-500/30 rounded-xl">
                                        <p className="text-success-500 text-sm">✓ Bet placed successfully!</p>
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
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
