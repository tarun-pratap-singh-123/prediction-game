import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import WalletConnect from '../components/WalletConnect';
import { PREDICTION_MARKET_ADDRESS } from '../config/contracts';
import { PredictionMarketAbi } from '../abi/PredictionMarket';

export default function CreateMarket() {
    const { isConnected } = useAccount();
    const navigate = useNavigate();

    const [question, setQuestion] = useState('');
    const [endDate, setEndDate] = useState('');
    const [endTime, setEndTime] = useState('');

    const { data: hash, writeContract, isPending } = useWriteContract();

    const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
        hash,
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!question || !endDate || !endTime) {
            alert('Please fill all fields');
            return;
        }

        const endDateTime = new Date(`${endDate}T${endTime}`);
        const endTimeUnix = Math.floor(endDateTime.getTime() / 1000);

        if (endTimeUnix <= Math.floor(Date.now() / 1000)) {
            alert('End time must be in the future');
            return;
        }

        writeContract({
            address: PREDICTION_MARKET_ADDRESS,
            abi: PredictionMarketAbi,
            functionName: 'createMarket',
            args: [question, BigInt(endTimeUnix)],
        });
    };

    if (isSuccess) {
        setTimeout(() => navigate('/'), 1500);
    }

    return (
        <div className="min-h-screen bg-dark-950">
            {/* Header */}
            <header className="glass-card mx-4 mt-4 mb-8 p-6">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-gradient">PredictMarket</h1>
                        <p className="text-gray-400 text-sm mt-1">Create New Market</p>
                    </div>
                    <WalletConnect />
                </div>
            </header>

            <main className="max-w-2xl mx-auto px-4 pb-12">
                {!isConnected ? (
                    <div className="text-center py-20">
                        <div className="glass-card p-12">
                            <h2 className="text-2xl font-bold mb-4">Connect Wallet</h2>
                            <p className="text-gray-400 mb-8">
                                Connect your wallet to create a prediction market.
                            </p>
                            <div className="flex justify-center">
                                <WalletConnect />
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="glass-card p-8">
                        <h2 className="text-2xl font-bold mb-6">Create Prediction Market</h2>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Question */}
                            <div>
                                <label className="block text-sm font-semibold mb-2">Market Question</label>
                                <input
                                    type="text"
                                    value={question}
                                    onChange={(e) => setQuestion(e.target.value)}
                                    placeholder="Will Bitcoin reach $100k by end of 2024?"
                                    className="input"
                                    required
                                />
                                <p className="text-xs text-gray-500 mt-2">
                                    Ask a clear YES/NO question about a future event
                                </p>
                            </div>

                            {/* End Date */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold mb-2">End Date</label>
                                    <input
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        className="input"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold mb-2">End Time</label>
                                    <input
                                        type="time"
                                        value={endTime}
                                        onChange={(e) => setEndTime(e.target.value)}
                                        className="input"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Info */}
                            <div className="stat-card">
                                <h3 className="font-semibold mb-2 text-primary-400">How it works:</h3>
                                <ul className="text-sm text-gray-400 space-y-1">
                                    <li>• Users bet on YES or NO using USDC</li>
                                    <li>• Betting closes at the end time</li>
                                    <li>• Admin resolves the market based on outcome</li>
                                    <li>• Winners claim proportional rewards</li>
                                </ul>
                            </div>

                            {/* Submit */}
                            <div className="flex gap-4">
                                <button
                                    type="button"
                                    onClick={() => navigate('/')}
                                    className="btn-outline flex-1"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isPending || isConfirming}
                                    className="btn-primary flex-1"
                                >
                                    {isPending || isConfirming ? 'Creating...' : 'Create Market'}
                                </button>
                            </div>

                            {isSuccess && (
                                <div className="glass-card p-4 bg-success-500/10 border-success-500/30">
                                    <p className="text-success-500 font-semibold">
                                        ✓ Market created successfully! Redirecting...
                                    </p>
                                </div>
                            )}
                        </form>
                    </div>
                )}
            </main>
        </div>
    );
}
