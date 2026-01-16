import { useState } from 'react';
import { useAccount, useReadContract, useReadContracts } from 'wagmi';
import { Link } from 'react-router-dom';
import WalletConnect from '../components/WalletConnect';
import MarketCard from '../components/MarketCard';
import { PREDICTION_MARKET_ADDRESS } from '../config/contracts';
import { PredictionMarketAbi } from '../abi/PredictionMarket';

export default function Home() {
    const { isConnected } = useAccount();
    const [filter, setFilter] = useState<'all' | 'active' | 'resolved'>('all');

    // Get market count
    const { data: marketCount } = useReadContract({
        address: PREDICTION_MARKET_ADDRESS,
        abi: PredictionMarketAbi,
        functionName: 'marketCount',
    });

    // Fetch all markets
    const { data: marketsData } = useReadContracts({
        contracts: Array.from({ length: Number(marketCount || 0) }).map((_, i) => ({
            address: PREDICTION_MARKET_ADDRESS,
            abi: PredictionMarketAbi,
            functionName: 'getMarket',
            args: [BigInt(i)],
        })),
    });

    const markets = marketsData?.map((result, index) => {
        if (result.status !== 'success') return null;
        const market = result.result as any;
        return {
            id: index,
            question: market.question,
            creator: market.creator,
            endTime: market.endTime,
            yesPool: market.yesPool,
            noPool: market.noPool,
            resolved: market.resolved,
            outcome: market.outcome,
        };
    }).filter(m => m !== null) || [];

    const filteredMarkets = markets.filter(market => {
        if (filter === 'active') return !market.resolved && new Date(Number(market.endTime) * 1000) > new Date();
        if (filter === 'resolved') return market.resolved;
        return true;
    });

    return (
        <div className="min-h-screen bg-dark-950">
            {/* Header */}
            <header className="glass-card mx-4 mt-4 mb-8 p-6">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-gradient">PredictMarket</h1>
                        <p className="text-gray-400 text-sm mt-1">Decentralized Prediction Markets</p>
                    </div>
                    <WalletConnect />
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 pb-12">
                {!isConnected ? (
                    <div className="text-center py-20">
                        <div className="glass-card p-12 max-w-md mx-auto">
                            <h2 className="text-2xl font-bold mb-4">Welcome to PredictMarket</h2>
                            <p className="text-gray-400 mb-8">
                                Connect your wallet to create markets, place bets, and claim winnings.
                            </p>
                            <div className="flex justify-center">
                                <WalletConnect />
                            </div>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Actions */}
                        <div className="flex flex-wrap gap-4 justify-between items-center mb-8">
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setFilter('all')}
                                    className={filter === 'all' ? 'btn-primary' : 'btn-outline'}
                                >
                                    All Markets
                                </button>
                                <button
                                    onClick={() => setFilter('active')}
                                    className={filter === 'active' ? 'btn-primary' : 'btn-outline'}
                                >
                                    Active
                                </button>
                                <button
                                    onClick={() => setFilter('resolved')}
                                    className={filter === 'resolved' ? 'btn-primary' : 'btn-outline'}
                                >
                                    Resolved
                                </button>
                            </div>
                            <Link to="/create" className="btn-primary">
                                + Create Market
                            </Link>
                        </div>

                        {/* Markets Grid */}
                        {filteredMarkets.length === 0 ? (
                            <div className="text-center py-20">
                                <div className="glass-card p-12 max-w-md mx-auto">
                                    <p className="text-gray-400 text-lg mb-6">No markets found</p>
                                    <Link to="/create" className="btn-primary">
                                        Create the First Market
                                    </Link>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {filteredMarkets.map(market => (
                                    <MarketCard key={market.id} market={market} />
                                ))}
                            </div>
                        )}
                    </>
                )}
            </main>
        </div>
    );
}
