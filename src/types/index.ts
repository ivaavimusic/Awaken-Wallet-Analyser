// MegaETH Wallet Analyzer Type Definitions

/**
 * Raw transaction data from Blockscout API
 */
export interface BlockscoutTransaction {
  blockNumber: string;
  timeStamp: string;
  hash: string;
  nonce: string;
  blockHash: string;
  transactionIndex: string;
  from: string;
  to: string;
  value: string;
  gas: string;
  gasPrice: string;
  isError: string;
  txreceipt_status: string;
  input: string;
  contractAddress: string;
  cumulativeGasUsed: string;
  gasUsed: string;
  confirmations: string;
  methodId: string;
  functionName: string;
}

/**
 * Raw token transfer data from Blockscout API
 */
export interface BlockscoutTokenTransfer {
  blockNumber: string;
  timeStamp: string;
  hash: string;
  nonce: string;
  blockHash: string;
  from: string;
  contractAddress: string;
  to: string;
  value: string;
  tokenName: string;
  tokenSymbol: string;
  tokenDecimal: string;
  transactionIndex: string;
  gas: string;
  gasPrice: string;
  gasUsed: string;
  cumulativeGasUsed: string;
  input: string;
  confirmations: string;
}

/**
 * Awaken Tax CSV row format
 */
export interface AwakenTransaction {
  Date: string;           // YYYY-MM-DD format
  Asset: string;          // Token symbol (ETH, USDT, etc.)
  Amount: string;         // Transaction amount (can be negative)
  Fee: string;            // Gas fee
  "P&L": string;          // Profit/Loss (empty for basic transactions)
  "Payment Token": string; // Token used for payment
  ID: string;             // Transaction ID (short form)
  Notes: string;          // Description
  Tag: string;            // Transaction type tag
  "Transaction Hash": string; // Full transaction hash
}

/**
 * API response wrapper
 */
export interface BlockscoutAPIResponse<T> {
  status: string;
  message: string;
  result: T[];
}

/**
 * Combined transaction for display
 */
export interface DisplayTransaction extends AwakenTransaction {
  timestamp: number;      // Unix timestamp for sorting
  isIncoming: boolean;    // True if receiving, false if sending
  type: TransactionType;  // Transaction type enum
}

/**
 * Transaction type enum
 */
export type TransactionType = 
  | 'transfer_in'
  | 'transfer_out'
  | 'token_in'
  | 'token_out'
  | 'contract_interaction'
  | 'swap'
  | 'unknown';

/**
 * Fetch state for UI
 */
export interface FetchState {
  loading: boolean;
  error: string | null;
  transactions: DisplayTransaction[];
  address: string;
}
