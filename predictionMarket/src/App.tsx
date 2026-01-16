import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { config } from './config/wagmi';
import Home from './pages/Home';
import CreateMarket from './pages/CreateMarket';
import MarketDetails from './pages/MarketDetails';

const queryClient = new QueryClient();

function App() {
    return (
        <WagmiProvider config={config}>
            <QueryClientProvider client={queryClient}>
                <BrowserRouter>
                    <Routes>
                        <Route path="/" element={<Home />} />
                        <Route path="/create" element={<CreateMarket />} />
                        <Route path="/market/:id" element={<MarketDetails />} />
                    </Routes>
                </BrowserRouter>
            </QueryClientProvider>
        </WagmiProvider>
    );
}

export default App;
