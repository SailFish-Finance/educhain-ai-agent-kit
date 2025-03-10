import axios from 'axios';
import * as subgraph from './subgraph.js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Default configuration
let config = {
  apiUrl: 'https://min-api.cryptocompare.com/data/pricemultifull',
  apiKey: '', // Optional API key
  symbols: {
    EDU: 'EDU',
    USD: 'USD'
  }
};

// Path to the config file
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const configPath = path.join(__dirname, '..', 'config', 'external_market_config.json');

// Load configuration from file if it exists
try {
  if (fs.existsSync(configPath)) {
    const configData = fs.readFileSync(configPath, 'utf8');
    config = { ...config, ...JSON.parse(configData) };
  } else {
    // Create config directory if it doesn't exist
    const configDir = path.join(__dirname, '..', 'config');
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    // Save default config
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  }
} catch (error) {
  console.error('Error loading external market config:', error);
}

/**
 * Update the external market API configuration
 * @param newConfig New configuration options
 */
export function updateConfig(newConfig: Partial<typeof config>): void {
  config = { ...config, ...newConfig };
  
  // Save updated config to file
  try {
    const configDir = path.join(__dirname, '..', 'config');
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  } catch (error) {
    console.error('Error saving external market config:', error);
  }
}

/**
 * Get the current external market API configuration
 */
export function getConfig(): typeof config {
  return { ...config };
}

/**
 * Fetch external market data for EDU from CryptoCompare
 */
export async function getExternalMarketData(): Promise<{
  price: number;
  change24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  marketCap: number;
  lastUpdate: string;
  source: string;
}> {
  try {
    const { apiUrl, apiKey, symbols } = config;
    
    // Build request URL
    const url = `${apiUrl}?fsyms=${symbols.EDU}&tsyms=${symbols.USD}`;
    
    // Set up headers with API key if provided
    const headers: Record<string, string> = {};
    if (apiKey) {
      headers['authorization'] = `Apikey ${apiKey}`;
    }
    
    // Make API request
    const response = await axios.get(url, { headers });
    
    // Extract data
    const data = response.data;
    if (!data.RAW || !data.RAW[symbols.EDU] || !data.RAW[symbols.EDU][symbols.USD]) {
      throw new Error('Invalid response format from external API');
    }
    
    const rawData = data.RAW[symbols.EDU][symbols.USD];
    
    return {
      price: rawData.PRICE || 0,
      change24h: rawData.CHANGE24HOUR || 0,
      high24h: rawData.HIGH24HOUR || 0,
      low24h: rawData.LOW24HOUR || 0,
      volume24h: rawData.VOLUME24HOUR || 0,
      marketCap: rawData.MKTCAP || 0,
      lastUpdate: new Date(rawData.LASTUPDATE * 1000).toISOString(),
      source: 'CryptoCompare'
    };
  } catch (error) {
    console.error('Error fetching external market data:', error);
    throw error;
  }
}

/**
 * Check for arbitrage opportunities between CEX and SailFish DEX
 * @param threshold Minimum price difference percentage to consider as an arbitrage opportunity
 */
export async function checkArbitrageOpportunities(threshold: number = 1.0): Promise<{
  cexPrice: number;
  dexPrice: number;
  priceDifference: number;
  priceDifferencePercentage: number;
  arbitrageOpportunity: boolean;
  direction: 'BUY_CEX_SELL_DEX' | 'BUY_DEX_SELL_CEX' | 'NONE';
  potentialProfit: number;
  timestamp: string;
}> {
  try {
    // Get external market data
    const externalData = await getExternalMarketData();
    const cexPrice = externalData.price;
    
    // Get DEX price from SailFish
    const dexPrice = await subgraph.getEthPrice();
    const dexPriceNumber = parseFloat(dexPrice || '0');
    
    // Calculate price difference
    const priceDifference = Math.abs(cexPrice - dexPriceNumber);
    const priceDifferencePercentage = (priceDifference / Math.min(cexPrice, dexPriceNumber)) * 100;
    
    // Determine arbitrage opportunity
    const arbitrageOpportunity = priceDifferencePercentage >= threshold;
    
    // Determine direction
    let direction: 'BUY_CEX_SELL_DEX' | 'BUY_DEX_SELL_CEX' | 'NONE' = 'NONE';
    if (arbitrageOpportunity) {
      direction = cexPrice < dexPriceNumber ? 'BUY_CEX_SELL_DEX' : 'BUY_DEX_SELL_CEX';
    }
    
    // Calculate potential profit (simplified)
    const potentialProfit = arbitrageOpportunity ? priceDifference : 0;
    
    return {
      cexPrice,
      dexPrice: dexPriceNumber,
      priceDifference,
      priceDifferencePercentage,
      arbitrageOpportunity,
      direction,
      potentialProfit,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error checking arbitrage opportunities:', error);
    throw error;
  }
}
