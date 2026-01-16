import { useAccount, useConnect, useDisconnect } from 'wagmi';

export default function WalletConnect() {
    const { address, isConnected } = useAccount();
    const { connect, connectors } = useConnect();
    const { disconnect } = useDisconnect();

    const truncateAddress = (addr: string) => {
        return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
    };

    if (isConnected && address) {
        return (
            <div className="flex items-center gap-4">
                <div className="glass-card px-4 py-2 text-sm">
                    <span className="text-gray-400">Connected: </span>
                    <span className="text-primary-400 font-mono">{truncateAddress(address)}</span>
                </div>
                <button onClick={() => disconnect()} className="btn-outline">
                    Disconnect
                </button>
            </div>
        );
    }

    return (
        <button
            onClick={() => connect({ connector: connectors[0] })}
            className="btn-primary"
        >
            Connect Wallet
        </button>
    );
}
