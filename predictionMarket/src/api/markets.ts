
export interface Market {
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

const API_URL = 'http://localhost:4000';

export const fetchMarkets = async (status?: string): Promise<Market[]> => {
    const url = new URL(`${API_URL}/markets`);
    if (status) {
        url.searchParams.append('status', status);
    }

    const response = await fetch(url.toString());
    if (!response.ok) {
        throw new Error('Failed to fetch markets');
    }

    return response.json();
};

export const fetchMarket = async (id: string): Promise<Market> => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000';
    const response = await fetch(`${apiUrl}/markets/${id}`);
    if (!response.ok) {
        throw new Error('Failed to fetch market');
    }
    return response.json();
};
