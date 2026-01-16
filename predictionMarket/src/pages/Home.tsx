import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { Link } from 'react-router-dom';
import WalletConnect from '../components/WalletConnect';
import MarketCard from '../components/MarketCard';

interface Market {
    id: string;
    question: string;
    creator: string;
    end_time: string;
    resolved: boolean;
    outcome: boolean | null;
    status: string;
    yes_volume: string;
    no_volume: string;
    total_volume: string;
    block_number: string;
    block_timestamp: string;
    tx_hash: string;
}

export default function Home() {
    const { isConnected } = useAccount();
    const [filter, setFilter] = useState<'all' | 'active' | 'resolved'>('all');
    const [markets, setMarkets] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isError, setIsError] = useState(false);

    useEffect(() => {
        const fetchMarkets = async () => {
            setIsLoading(true);
            setIsError(false);
            try {
                const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000';
                const url = new URL(`${apiUrl}/markets`);
                if (filter === 'active') url.searchParams.append('status', 'ACTIVE');
                if (filter === 'resolved') url.searchParams.append('status', 'RESOLVED');

                const response = await fetch(url.toString());
                if (!response.ok) throw new Error('Failed to fetch');

                const data: Market[] = await response.json();

                const formattedMarkets = data.map((market) => ({
                    id: Number(market.id),
                    question: market.question,
                    creator: market.creator,
                    endTime: BigInt(market.end_time),
                    yesPool: BigInt(market.yes_volume),
                    noPool: BigInt(market.no_volume),
                    resolved: market.resolved,
                    outcome: market.outcome,
                }));

                setMarkets(formattedMarkets);
            } catch (error) {
                console.error("Error fetching markets:", error);
                setIsError(true);
            } finally {
                setIsLoading(false);
            }
        };

        fetchMarkets();
    }, [filter]);

    const filteredMarkets = markets;

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
                        {isLoading ? (
                            <div className="text-center py-20">
                                <p className="text-gray-400">Loading markets...</p>
                            </div>
                        ) : isError ? (
                            <div className="text-center py-20">
                                <p className="text-red-400">Error loading markets. Please try again later.</p>
                            </div>
                        ) : filteredMarkets.length === 0 ? (
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
                                    <MarketCard key={market.id} market={{ ...market, outcome: market.outcome ?? false }} />
                                ))}
                            </div>
                        )}
                    </>
                )}
            </main>
        </div>
    );
}
