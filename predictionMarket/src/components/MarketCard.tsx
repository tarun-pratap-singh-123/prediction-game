import { Link } from 'react-router-dom';

interface Market {
    id: number;
    question: string;
    yesPool: bigint;
    noPool: bigint;
    endTime: bigint;
    resolved: boolean;
    outcome: boolean;
}

interface MarketCardProps {
    market: Market;
}

export default function MarketCard({ market }: MarketCardProps) {
    const totalPool = market.yesPool + market.noPool;
    const yesPercentage = totalPool > 0n ? Number((market.yesPool * 10000n) / totalPool) / 100 : 50;
    const noPercentage = 100 - yesPercentage;

    const endDate = new Date(Number(market.endTime) * 1000);
    const now = new Date();
    const hasEnded = now > endDate;

    const formatLiquidity = (amount: bigint) => {
        const value = Number(amount) / 1e6; // 6 decimals for USDC
        if (value >= 1000) {
            return `$${(value / 1000).toFixed(1)}K`;
        }
        return `$${value.toFixed(0)}`;
    };

    return (
        <Link to={`/market/${market.id}`} className="block">
            <div className="card group">
                {/* Status Badge */}
                <div className="flex justify-between items-start mb-4">
                    {market.resolved ? (
                        <span className={market.outcome ? 'badge-success' : 'badge-danger'}>
                            {market.outcome ? '✓ YES Won' : '✗ NO Won'}
                        </span>
                    ) : hasEnded ? (
                        <span className="badge-info">Awaiting Resolution</span>
                    ) : (
                        <span className="badge-success">Active</span>
                    )}
                    <span className="text-xs text-gray-500">
                        {hasEnded ? 'Ended' : `Ends ${endDate.toLocaleDateString()}`}
                    </span>
                </div>

                {/* Question */}
                <h3 className="text-xl font-bold mb-6 group-hover:text-primary-400 transition-colors line-clamp-2">
                    {market.question}
                </h3>

                {/* Odds */}
                <div className="space-y-3 mb-4">
                    <div className="flex justify-between items-center">
                        <span className="text-success-500 font-semibold">YES</span>
                        <span className="text-lg font-bold text-success-500">{yesPercentage.toFixed(1)}%</span>
                    </div>
                    <div className="progress-bar">
                        <div className="h-full bg-gradient-to-r from-success-500 to-success-600 transition-all duration-500" style={{ width: `${yesPercentage}%` }} />
                    </div>

                    <div className="flex justify-between items-center">
                        <span className="text-danger-500 font-semibold">NO</span>
                        <span className="text-lg font-bold text-danger-500">{noPercentage.toFixed(1)}%</span>
                    </div>
                    <div className="progress-bar">
                        <div className="h-full bg-gradient-to-r from-danger-500 to-danger-600 transition-all duration-500" style={{ width: `${noPercentage}%` }} />
                    </div>
                </div>

                {/* Liquidity */}
                <div className="stat-card flex justify-between items-center">
                    <span className="text-sm text-gray-400">Total Liquidity</span>
                    <span className="text-lg font-bold text-primary-400">{formatLiquidity(totalPool)}</span>
                </div>
            </div>
        </Link>
    );
}
