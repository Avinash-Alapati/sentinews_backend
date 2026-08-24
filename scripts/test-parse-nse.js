const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const filePath = path.join(__dirname, '..', 'NSE.csv.gz');
const compressedBuf = fs.readFileSync(filePath);
const csvText = zlib.gunzipSync(compressedBuf).toString('utf-8');

const lines = csvText.split('\n');
let stocks = [];

for (let i = 1; i < lines.length; i++) {
  const line = lines[i].trim();
  if (!line) continue;
  
  // Handle CSV splitting safely
  const cols = line.split('","').map(c => c.replace(/^"|"$/g, ''));
  if (cols.length >= 12) {
    const [instrument_key, exchange_token, tradingsymbol, name, last_price, expiry, strike, tick_size, lot_size, instrument_type, option_type, exchange] = cols;
    
    // Filter corporate equities (exclude SDL government bonds like 749RJ35, 645BR27)
    if (instrument_type === 'EQUITY' && exchange === 'NSE_EQ') {
      const isBond = /^[0-9]+[A-Z]+[0-9]+$/.test(tradingsymbol) || name.startsWith('SDL ') || name.startsWith('GS ');
      if (!isBond && tradingsymbol) {
        stocks.push({
          instrument_key,
          symbol: tradingsymbol,
          name,
          lastPrice: parseFloat(last_price) || 0,
        });
      }
    }
  }
}

console.log('Clean Corporate Equities count from NSE.csv.gz:', stocks.length);
console.log('Sample 15 Clean Equities:', stocks.slice(0, 15));
