import { NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Cache for stock data (5 minutes)
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Stock symbols mapping
const STOCK_MAP: Record<string, { name: string }> = {
  'NIFTY 50': { name: 'Nifty 50 Index' },
  'BANK NIFTY': { name: 'Bank Nifty Index' },
  'NIFTY IT': { name: 'Nifty IT Index' },
  'RELIANCE': { name: 'Reliance Industries' },
  'TCS': { name: 'Tata Consultancy Services' },
  'HDFCBANK': { name: 'HDFC Bank' },
  'INFY': { name: 'Infosys' },
  'ICICIBANK': { name: 'ICICI Bank' },
  'HINDUNILVR': { name: 'Hindustan Unilever' },
  'SBIN': { name: 'State Bank of India' },
  'BHARTIARTL': { name: 'Bharti Airtel' },
  'ITC': { name: 'ITC Limited' },
  'KOTAKBANK': { name: 'Kotak Mahindra Bank' },
  'LT': { name: 'Larsen & Toubro' },
  'AXISBANK': { name: 'Axis Bank' },
  'ASIANPAINT': { name: 'Asian Paints' },
  'MARUTI': { name: 'Maruti Suzuki' },
  'SUNPHARMA': { name: 'Sun Pharma' },
  'TITAN': { name: 'Titan Company' },
  'BAJFINANCE': { name: 'Bajaj Finance' },
  'YESBANK': { name: 'Yes Bank' },
  'SUZLON': { name: 'Suzlon Energy' },
  'ADANIPOWER': { name: 'Adani Power' },
  'IDEA': { name: 'Vodafone Idea' },
  'IBREALEST': { name: 'Indiabulls Real Estate' },
  'LTIM': { name: 'LTIM Tree' },
  'FCONSUMER': { name: 'Future Consumer' },
  'HDIL': { name: 'Housing Development' },
  'HCLTECH': { name: 'HCL Technologies' },
  'WIPRO': { name: 'Wipro' },
  'TATAMOTORS': { name: 'Tata Motors' },
  'TATASTEEL': { name: 'Tata Steel' },
  'M&M': { name: 'Mahindra & Mahindra' },
  'NTPC': { name: 'NTPC' },
  'POWERGRID': { name: 'Power Grid' },
  'ULTRACEMCO': { name: 'UltraTech Cement' },
  'JSWSTEEL': { name: 'JSW Steel' },
  'DMART': { name: 'Avenue Supermarts' },
  'ADANIENT': { name: 'Adani Enterprises' },
  'ADANIPORTS': { name: 'Adani Ports' },
  'DIVISLAB': { name: 'Divis Labs' },
  'DRREDDY': { name: 'Dr Reddys Labs' },
  'CIPLA': { name: 'Cipla' },
  'BPCL': { name: 'BPCL' },
  'ONGC': { name: 'ONGC' },
  'COALINDIA': { name: 'Coal India' },
  'GRASIM': { name: 'Grasim Industries' },
  'HINDALCO': { name: 'Hindalco' },
  'JINDALSTEL': { name: 'Jindal Steel' },
  'HEROMOTOCO': { name: 'Hero MotoCorp' },
  'EICHERMOT': { name: 'Eicher Motors' },
  'BRITANNIA': { name: 'Britannia' },
  'HDFCLIFE': { name: 'HDFC Life' },
  'SBILIFE': { name: 'SBI Life' },
  'INDUSINDBK': { name: 'IndusInd Bank' },
  'BAJAJ-AUTO': { name: 'Bajaj Auto' },
  'BAJAJFINSV': { name: 'Bajaj Finserv' },
  'ZOMATO': { name: 'Zomato' },
  'PAYTM': { name: 'Paytm' },
  'NYKAA': { name: 'Nykaa' },
  'TMCV': { name: 'TVS Motor Components' },
  'TMPV': { name: 'TVS Motor Products' },
  'RICOAUTO': { name: 'Rico Auto Industries' },
};

// Fetch with retry
async function fetchWithRetry(url: string, retries = 3): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json',
        },
      });
      if (response.ok) return response;
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
  throw new Error('Failed after retries');
}

// Yahoo symbol map
const yahooMap: Record<string, string> = {
  'NIFTY 50': '^NSEI',
  'BANK NIFTY': '^NSEBANK',
  'NIFTY IT': '^NSEIT',
  'RELIANCE': 'RELIANCE.NS',
  'TCS': 'TCS.NS',
  'HDFCBANK': 'HDFCBANK.NS',
  'INFY': 'INFY.NS',
  'ICICIBANK': 'ICICIBANK.NS',
  'HINDUNILVR': 'HINDUNILVR.NS',
  'SBIN': 'SBIN.NS',
  'BHARTIARTL': 'BHARTIARTL.NS',
  'ITC': 'ITC.NS',
  'KOTAKBANK': 'KOTAKBANK.NS',
  'LT': 'LT.NS',
  'AXISBANK': 'AXISBANK.NS',
  'ASIANPAINT': 'ASIANPAINT.NS',
  'MARUTI': 'MARUTI.NS',
  'SUNPHARMA': 'SUNPHARMA.NS',
  'TITAN': 'TITAN.NS',
  'BAJFINANCE': 'BAJFINANCE.NS',
  'YESBANK': 'YESBANK.NS',
  'SUZLON': 'SUZLON.NS',
  'ADANIPOWER': 'ADANIPOWER.NS',
  'IDEA': 'IDEA.NS',
  'IBREALEST': 'IBREALEST.NS',
  'LTIM': 'LTIM.NS',
  'FCONSUMER': 'FCONSUMER.NS',
  'HDIL': 'HDIL.NS',
  'HCLTECH': 'HCLTECH.NS',
  'WIPRO': 'WIPRO.NS',
  'TATAMOTORS': 'TATAMOTORS.NS',
  'TATASTEEL': 'TATASTEEL.NS',
  'M&M': 'M&M.NS',
  'NTPC': 'NTPC.NS',
  'POWERGRID': 'POWERGRID.NS',
  'ULTRACEMCO': 'ULTRACEMCO.NS',
  'JSWSTEEL': 'JSWSTEEL.NS',
  'DMART': 'DMART.NS',
  'ADANIENT': 'ADANIENT.NS',
  'ADANIPORTS': 'ADANIPORTS.NS',
  'DIVISLAB': 'DIVISLAB.NS',
  'DRREDDY': 'DRREDDY.NS',
  'CIPLA': 'CIPLA.NS',
  'BPCL': 'BPCL.NS',
  'ONGC': 'ONGC.NS',
  'COALINDIA': 'COALINDIA.NS',
  'GRASIM': 'GRASIM.NS',
  'HINDALCO': 'HINDALCO.NS',
  'JINDALSTEL': 'JINDALSTEL.NS',
  'HEROMOTOCO': 'HEROMOTOCO.NS',
  'EICHERMOT': 'EICHERMOT.NS',
  'BRITANNIA': 'BRITANNIA.NS',
  'HDFCLIFE': 'HDFCLIFE.NS',
  'SBILIFE': 'SBILIFE.NS',
  'INDUSINDBK': 'INDUSINDBK.NS',
  'BAJAJ-AUTO': 'BAJAJ-AUTO.NS',
  'BAJAJFINSV': 'BAJAJFINSV.NS',
  'ZOMATO': 'ZOMATO.NS',
  'PAYTM': 'PAYTM.NS',
  'NYKAA': 'NYKAA.NS',
  'TMCV': 'TMCV.NS',
  'TMPV': 'TMPV.NS',
  'RICOAUTO': 'RICOAUTO.NS',
};

// Get quote from Yahoo Finance
async function getYahooQuote(symbol: string): Promise<any> {
  const yahooSymbol = yahooMap[symbol] || `${symbol}.NS`;
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?interval=1d&range=1mo`;
  
  try {
    const response = await fetchWithRetry(url);
    const data = await response.json();
    
    if (data.chart?.result?.[0]) {
      const result = data.chart.result[0];
      const meta = result.meta || {};
      const quote = result.indicators?.quote?.[0] || {};
      
      const closes = (quote.close || []) as (number | null)[];
      const highs = (quote.high || []) as (number | null)[];
      const lows = (quote.low || []) as (number | null)[];
      const opens = (quote.open || []) as (number | null)[];
      
      const validCloses = closes.filter(v => v !== null) as number[];
      const validHighs = highs.filter(v => v !== null) as number[];
      const validLows = lows.filter(v => v !== null) as number[];
      const validOpens = opens.filter(v => v !== null) as number[];
      
      const currentPrice = meta.regularMarketPrice || validCloses[validCloses.length - 1] || 0;
      
      // Handle duplicate last close
      let prevClose: number;
      if (validCloses.length >= 2) {
        const lastClose = validCloses[validCloses.length - 1];
        const secondLastClose = validCloses[validCloses.length - 2];
        
        if (Math.abs(lastClose - secondLastClose) < 0.01 && validCloses.length >= 3) {
          prevClose = validCloses[validCloses.length - 3];
        } else {
          prevClose = secondLastClose;
        }
      } else {
        prevClose = meta.chartPreviousClose || currentPrice;
      }
      
      const change = currentPrice - prevClose;
      const pChange = prevClose > 0 ? (change / prevClose) * 100 : 0;
      
      // Check for duplicate candles
      const isDuplicateLast = validCloses.length >= 2 && 
        Math.abs(validCloses[validCloses.length - 1] - validCloses[validCloses.length - 2]) < 0.01;
      
      const todayOpen = validOpens[validOpens.length - 1] || currentPrice;
      const todayHigh = validHighs[validHighs.length - 1] || currentPrice;
      const todayLow = validLows[validLows.length - 1] || currentPrice;
      
      const yesterdayIdx = isDuplicateLast && validOpens.length >= 3 ? validOpens.length - 3 : validOpens.length - 2;
      const yesterdayOpen = validOpens.length > 1 ? validOpens[yesterdayIdx] : todayOpen;
      const yesterdayHigh = validHighs.length > 1 ? validHighs[yesterdayIdx] : todayHigh;
      const yesterdayLow = validLows.length > 1 ? validLows[yesterdayIdx] : todayLow;
      const yesterdayClose = prevClose;
      
      const pmHigh = validHighs.length > 5 ? Math.max(...validHighs.slice(0, -5)) : Math.max(...validHighs);
      const pmLow = validLows.length > 5 ? Math.min(...validLows.slice(0, -5)) : Math.min(...validLows);
      const pmClose = validCloses[0] || prevClose;
      
      const week52High = meta.fiftyTwoWeekHigh || Math.max(...validHighs) * 1.1;
      const week52Low = meta.fiftyTwoWeekLow || Math.min(...validLows) * 0.9;
      
      return {
        symbol,
        name: STOCK_MAP[symbol]?.name || meta.shortName || symbol,
        price: currentPrice,
        change: change,
        pChange: pChange,
        yOpen: yesterdayOpen,
        yHigh: Math.max(yesterdayHigh, yesterdayOpen, yesterdayClose),
        yLow: Math.min(yesterdayLow, yesterdayOpen, yesterdayClose),
        yClose: yesterdayClose,
        tOpen: todayOpen,
        tHigh: Math.max(todayHigh, todayOpen, currentPrice),
        tLow: Math.min(todayLow, todayOpen, currentPrice),
        tClose: currentPrice,
        week52High,
        week52Low,
        lifetimeHigh: week52High * 1.2,
        lifetimeLow: week52Low * 0.8,
        pmHigh: Math.max(pmHigh, pmClose),
        pmLow: Math.min(pmLow, pmClose),
        pmClose: pmClose,
        isBuy: pChange > 0,
      };
    }
  } catch (error) {
    console.error(`Yahoo fetch error for ${symbol}:`, error);
  }
  
  return null;
}

// Get all stocks
async function getAllStocks() {
  const symbols = Object.keys(STOCK_MAP);
  const results: any[] = [];
  
  // Fetch in batches of 5
  for (let i = 0; i < symbols.length; i += 5) {
    const batch = symbols.slice(i, i + 5);
    const batchResults = await Promise.all(batch.map(s => getYahooQuote(s)));
    results.push(...batchResults.filter(r => r !== null));
  }
  
  return results;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const symbol = searchParams.get('symbol');
  const all = searchParams.get('all');
  const refresh = searchParams.get('refresh');
  
  if (refresh === 'true') {
    cache.clear();
  }
  
  try {
    const cacheKey = symbol || (all ? 'all' : 'default');
    const cached = cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION && refresh !== 'true') {
      return NextResponse.json({
        success: true,
        cached: true,
        data: cached.data,
      });
    }
    
    let data;
    
    if (all === 'true') {
      data = await getAllStocks();
    } else if (symbol) {
      data = await getYahooQuote(symbol);
    } else {
      data = await getAllStocks();
    }
    
    cache.set(cacheKey, { data, timestamp: Date.now() });
    
    return NextResponse.json({
      success: true,
      cached: false,
      data,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
