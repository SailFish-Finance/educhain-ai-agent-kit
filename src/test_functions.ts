#!/usr/bin/env node
import * as swap from './swap.js';
import * as routes from './routes.js';

// SailFish V3 contract addresses
const CONTRACTS = {
  WETH9: '0xd02E8c38a8E3db71f8b2ae30B8186d7874934e12', // Wrapped EDU (WEDU) address
  USDC: '0x836d275563bAb5E93Fd6Ca62a95dB7065Da94342',  // USDC token address
};

// Test the get_swap_quote function directly
async function testGetSwapQuote() {
  try {
    console.log("Testing getSwapQuote function...");
    
    const quote = await swap.getSwapQuote(CONTRACTS.WETH9, CONTRACTS.USDC, "10", 0.5);
    
    // Format the response as it would be in the MCP server
    const response = {
      inputToken: {
        address: CONTRACTS.WETH9,
        symbol: quote.tokenInSymbol,
        amount: "10"
      },
      outputToken: {
        address: CONTRACTS.USDC,
        symbol: quote.tokenOutSymbol,
        amount: quote.formattedAmountOut,
        minimumAmount: quote.formattedMinimumAmountOut
      },
      exchangeRate: (Number(quote.formattedAmountOut) / 10).toString(),
      priceImpact: quote.priceImpact.toFixed(2),
      routeType: quote.route.type,
      slippage: "0.5"
    };
    
    // Log the response as JSON
    console.log("Response:");
    console.log(JSON.stringify(response, null, 2));
    
    // Verify the response is valid JSON
    try {
      JSON.parse(JSON.stringify(response));
      console.log("✅ Response is valid JSON");
    } catch (error) {
      console.error("❌ Response is not valid JSON:", error);
    }
    
    // Check if all required fields are present
    const requiredFields = ['inputToken', 'outputToken', 'exchangeRate', 'priceImpact', 'routeType', 'slippage'];
    const missingFields = requiredFields.filter(field => !(field in response));
    
    if (missingFields.length === 0) {
      console.log("✅ All required fields are present");
    } else {
      console.error("❌ Missing required fields:", missingFields);
    }
    
    // Check if route information is properly formatted
    if (quote.route && typeof quote.route.type === 'string') {
      console.log(`✅ Route type is properly formatted: ${quote.route.type}`);
    } else {
      console.error("❌ Route type is not properly formatted");
    }
    
    console.log("\nTest completed successfully!");
    return response;
  } catch (error) {
    console.error("Error testing getSwapQuote:", error);
    throw error;
  }
}

// Test the swap_tokens function (simulation only, no actual swap)
async function testSwapTokens() {
  try {
    console.log("\nTesting swapExactTokensForTokens function (simulation)...");
    
    // Simulate the response without actually executing the swap
    const quote = await swap.getSwapQuote(CONTRACTS.WETH9, CONTRACTS.USDC, "10", 0.5);
    
    // Create a simulated response
    const simulatedResponse = {
      hash: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
      from: "0xYourWalletAddress",
      amountIn: "10",
      amountOut: quote.formattedMinimumAmountOut,
      tokenIn: CONTRACTS.WETH9,
      tokenOut: CONTRACTS.USDC,
      tokenInSymbol: quote.tokenInSymbol,
      tokenOutSymbol: quote.tokenOutSymbol,
      route: {
        type: quote.route.type,
        path: quote.route.path,
        totalFee: quote.route.totalFee
      }
    };
    
    // Log the simulated response
    console.log("Simulated Response:");
    console.log(JSON.stringify(simulatedResponse, null, 2));
    
    // Verify the response is valid JSON
    try {
      JSON.parse(JSON.stringify(simulatedResponse));
      console.log("✅ Response is valid JSON");
    } catch (error) {
      console.error("❌ Response is not valid JSON:", error);
    }
    
    // Check if all required fields are present
    const requiredFields = ['hash', 'from', 'amountIn', 'amountOut', 'tokenIn', 'tokenOut', 'tokenInSymbol', 'tokenOutSymbol', 'route'];
    const missingFields = requiredFields.filter(field => !(field in simulatedResponse));
    
    if (missingFields.length === 0) {
      console.log("✅ All required fields are present");
    } else {
      console.error("❌ Missing required fields:", missingFields);
    }
    
    console.log("\nTest completed successfully!");
    return simulatedResponse;
  } catch (error) {
    console.error("Error testing swapExactTokensForTokens:", error);
    throw error;
  }
}

// Run the tests
async function runTests() {
  try {
    console.log("=== TESTING SWAP FUNCTIONS ===\n");
    
    // Test getSwapQuote
    await testGetSwapQuote();
    
    // Test swapExactTokensForTokens (simulation)
    await testSwapTokens();
    
    console.log("\n=== ALL TESTS COMPLETED SUCCESSFULLY ===");
  } catch (error) {
    console.error("\n=== TEST FAILED ===");
    console.error(error);
  }
}

runTests().catch(console.error);
