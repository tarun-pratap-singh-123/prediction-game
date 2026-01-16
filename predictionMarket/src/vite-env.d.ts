/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_PREDICTION_MARKET_ADDRESS: string
    readonly VITE_MOCK_USDC_ADDRESS: string
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}
