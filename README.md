# Awaken Wallet Analyzer

<p align="center">
  <strong>Analyze your MegaETH & Keeta wallet transactions and export to Awaken Tax CSV format</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/MegaETH-Chain%20ID%204326-6366f1" alt="MegaETH">
  <img src="https://img.shields.io/badge/Keeta-Mainnet-f97316" alt="Keeta">
  <img src="https://img.shields.io/badge/License-MIT-green.svg" alt="License: MIT">
  <img src="https://img.shields.io/badge/Next.js-16+-black" alt="Next.js">
</p>

---

## 🚀 Features

- **Multi-Chain Support**: Supports both MegaETH and Keeta networks
- **Transaction Fetching**: Retrieves all transactions from supported blockchains
- **Awaken Tax Format**: Exports data in the exact CSV format required by [Awaken Tax](https://awaken.tax)
- **Modern UI**: Premium dark theme with responsive design
- **Chain Selector**: Switch between MegaETH and Keeta networks
- **Stats Dashboard**: View total transactions, active days, volume, and gas spent
- **Daily Activity Chart**: Visual representation of your transaction activity
- **One-Click Export**: Download CSV ready for Awaken Tax import

## 📋 CSV Format

The exported CSV follows Awaken Tax's required format with these columns:

| Column | Description |
|--------|-------------|
| Date | Transaction date (YYYY-MM-DD) |
| Asset | Token symbol (ETH, ERC-20 tokens) |
| Amount | Transaction amount (+ for incoming, - for outgoing) |
| Fee | Gas fee paid |
| P&L | Profit/Loss (if applicable) |
| Payment Token | Token used for fees |
| ID | Short transaction ID |
| Notes | Transaction description |
| Tag | Transaction type (deposit, withdrawal, contract, etc.) |
| Transaction Hash | Full transaction hash |

## 🛠️ Tech Stack

- **Framework**: Next.js 16+ with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui components
- **Theme**: Dark/Light mode support with next-themes
- **APIs**:
  - Blockscout API (MegaETH)
  - Keeta Network REST API (Keeta)

## ⚡ Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- (Optional) Alchemy API key for enhanced features

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/ivaavimusic/Awaken-Wallet-Analyser.git
   cd Awaken-Wallet-Analyser
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables** (optional)
   ```bash
   cp .env.example .env.local
   ```

   Edit `.env.local` to add optional Alchemy API key:
   ```env
   NEXT_PUBLIC_ALCHEMY_API_KEY=your_alchemy_api_key_here
   ```

   > 💡 The app works without API keys using public endpoints. Get a free Alchemy key at [alchemy.com](https://www.alchemy.com/) for enhanced features.

4. **Start development server**
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

### Production Build

```bash
npm run build
npm start
```

## 🌐 Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import to [Vercel](https://vercel.com)
3. (Optional) Add environment variable: `NEXT_PUBLIC_ALCHEMY_API_KEY`
4. Deploy!

### Other Platforms

The app is a standard Next.js application and can be deployed to any platform that supports Next.js:
- Netlify
- Railway
- AWS Amplify
- Self-hosted

## 🔒 Security

- **No API keys required**: Works with public blockchain endpoints
- **`.env.local` is gitignored**: Your API keys are never committed
- **Client-side only**: No data is stored on any server

## 📖 Supported Networks

### MegaETH

| Property | Value |
|----------|-------|
| Chain ID | 4326 |
| Network | Mainnet |
| Explorer | [megaeth.blockscout.com](https://megaeth.blockscout.com) |
| Native Token | ETH |

### Keeta

| Property | Value |
|----------|-------|
| Network | Mainnet |
| Explorer | [keeta.network](https://keeta.network) |
| Native Token | KEETA |
| Address Format | `keeta_...` |

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Awaken Tax](https://awaken.tax) - For the CSV format specification
- [MegaETH](https://megaeth.com) - The first real-time blockchain
- [Keeta](https://keeta.network) - Designed for real-world payments
- [Blockscout](https://blockscout.com) - For the explorer API

---

<p align="center">
  Built with ❤️ by <a href="https://github.com/ivaavimusic">Event Horizon Labs</a>
</p>
