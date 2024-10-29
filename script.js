const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY); // Make sure to set this environment variable

// CSV file path
const CSV_FILE = path.join(__dirname, 'trades.csv');

// Ensure CSV file exists with headers
function initializeCSV() {
    const headers = ['Date', 'Symbol', 'Entry Price', 'Exit Price', 'Position Size', 'Direction', 'Profit/Loss', 'Notes'];
    if (!fs.existsSync(CSV_FILE)) {
        fs.writeFileSync(CSV_FILE, headers.join(',') + '\n');
    }
}

// Process trade data using Gemini AI
async function processTrade(tradeDescription) {
    try {
        // Get the model
        const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

        const prompt = `
        Extract trading information from the following description and return it as a JSON object.
        Only return the JSON object, nothing else.
        Use this exact format:
        {
            "date": "YYYY-MM-DD",
            "symbol": "TICKER",
            "entryPrice": number,
            "exitPrice": number,
            "positionSize": number,
            "direction": "LONG" or "SHORT",
            "profitLoss": number,
            "notes": "string"
        }
        Use today's date if no date is specified.
        
        Trade description: ${tradeDescription}`;

        // Generate content
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        // Parse the JSON response
        try {
            return JSON.parse(text);
        } catch (e) {
            // If JSON parsing fails, try to extract JSON from the text
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            throw new Error('Failed to parse AI response as JSON');
        }
    } catch (error) {
        console.error('Error processing trade with AI:', error);
        throw error;
    }
}

// Add trade data to CSV
function addTradeToCSV(tradeData) {
    const row = [
        tradeData.date,
        tradeData.symbol,
        tradeData.entryPrice,
        tradeData.exitPrice,
        tradeData.positionSize,
        tradeData.direction,
        tradeData.profitLoss,
        `"${tradeData.notes.replace(/"/g, '""')}"` // Properly escape quotes in notes
    ].join(',');

    fs.appendFileSync(CSV_FILE, row + '\n');
}

// Main function to process trade
async function main(tradeDescription) {
    try {
        // Initialize CSV if it doesn't exist
        initializeCSV();

        // Process trade data using AI
        console.log('Processing trade data...');
        const processedData = await processTrade(tradeDescription);

        // Add to CSV
        addTradeToCSV(processedData);
        console.log('Trade data successfully added to CSV!');
        
        // Display processed data
        console.log('\nProcessed Trade Data:');
        console.log(JSON.stringify(processedData, null, 2));

        // Display file location
        console.log(`\nData saved to: ${CSV_FILE}`);
    } catch (error) {
        console.error('Error:', error.message);
    }
}

// Example usage
if (require.main === module) {
    const tradeDescription = process.argv[2];
    if (!tradeDescription) {
        console.log('Please provide a trade description as a command line argument');
        console.log('Example: node script.js "Bought 100 shares of AAPL at 150, sold at 155, made good profit due to earnings report"');
        process.exit(1);
    }
    main(tradeDescription);
}

module.exports = { processTrade, addTradeToCSV, main };