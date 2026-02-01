# MegaETH Wallet Analyzer for Awaken Tax

<p align="center">
  <strong>Analyze your MegaETH wallet transactions and export to Awaken Tax CSV format</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/MegaETH-Chain%20ID%204326-6366f1" alt="MegaETH">
  <img src="https://img.shields.io/badge/License-MIT-green.svg" alt="License: MIT">
  <img src="https://img.shields.io/badge/Next.js-16+-black" alt="Next.js">
</p>

---

## 🚀 Features

- **Transaction Fetching**: Retrieves all transactions and token transfers from MegaETH blockchain
- **Awaken Tax Format**: Exports data in the exact CSV format required by [Awaken Tax](https://awaken.tax)
- **Modern UI**: Premium dark theme with responsive design
- **Sortable Table**: Sort by date, asset, amount, fee, or tag
- **Search & Filter**: Quickly find specific transactions
- **Pagination**: Handle large transaction histories efficiently
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
- **Styling**: Tailwind CSS + Custom CSS
- **APIs**: 
  - Blockscout API (primary)
  - Alchemy RPC (fallback)

## ⚡ Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Alchemy API key (free tier works fine)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/ivaavimusic/Awaken-MegaEth-Wallet-Analyser.git
   cd Awaken-MegaEth-Wallet-Analyser
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Edit `.env.local` and add your Alchemy API key:
   ```env
   NEXT_PUBLIC_ALCHEMY_API_KEY=your_alchemy_api_key_here
   ```
   
   > 💡 Get a free API key at [alchemy.com](https://www.alchemy.com/)

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
3. Add environment variable: `NEXT_PUBLIC_ALCHEMY_API_KEY`
4. Deploy!

### Other Platforms

The app is a standard Next.js application and can be deployed to any platform that supports Next.js:
- Netlify
- Railway
- AWS Amplify
- Self-hosted

## 🔒 Security

- **No API keys in code**: All secrets are stored in environment variables
- **`.env.local` is gitignored**: Your API keys are never committed
- **Client-side only**: No data is stored on any server

## 📖 API Reference

### MegaETH Chain Info

| Property | Value |
|----------|-------|
| Chain ID | 4326 |
| Network | Mainnet |
| Explorer | [megaeth.blockscout.com](https://megaeth.blockscout.com) |
| Native Token | ETH |

### Blockscout API Endpoints Used

- `?module=account&action=txlist` - Normal transactions
- `?module=account&action=tokentx` - Token transfers

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

- [Awaken Tax](https://awaken.tax) - For the bounty and CSV format specification
- [MegaETH](https://megaeth.com) - For the blockchain infrastructure
- [Alchemy](https://alchemy.com) - For the RPC infrastructure
- [Blockscout](https://blockscout.com) - For the explorer API

---

<p align="center">
  Built with ❤️ by <a href="https://github.com/ivaavimusic">Event Horizon Labs</a>
</p>
