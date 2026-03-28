'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast, Toaster } from 'sonner';
import {
  Search,
  TrendingUp,
  TrendingDown,
  Star,
  Moon,
  Sun,
  Grid3X3,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  RefreshCw,
  BarChart3,
  Target,
  Heart,
  Loader2,
  Menu,
  X,
  ChevronLeft,
  AlertTriangle,
  Lock,
  Shield,
  LogOut,
} from 'lucide-react';

// Password constants
const ADMIN_PASSWORD = 'j8pro';
const DEMO_PASSWORD = 'demo1';
const DEMO_DURATION_MS = 24 * 60 * 60 * 1000; // 1 day in milliseconds

// Types
interface Stock {
  symbol: string;
  name: string;
  price: number;
  change: number;
  pChange: number;
  yOpen: number;
  yHigh: number;
  yLow: number;
  yClose: number;
  tOpen: number;
  tHigh: number;
  tLow: number;
  tClose: number;
  week52High: number;
  week52Low: number;
  lifetimeHigh: number;
  lifetimeLow: number;
  pmHigh: number;
  pmLow: number;
  pmClose: number;
  isBuy?: boolean;
}

interface GannLevels {
  buy: { entry: number; avg: number; sl: number; t1: number; t2: number; t3: number };
  sell: { entry: number; avg: number; sl: number; t1: number; t2: number; t3: number };
}

// NIFTY Indices
const NIFTY_INDICES = [
  { name: 'NIFTY 50', symbol: 'NIFTY 50' },
  { name: 'BANK NIFTY', symbol: 'BANK NIFTY' },
  { name: 'NIFTY IT', symbol: 'NIFTY IT' },
  { name: 'RELIANCE', symbol: 'RELIANCE' },
  { name: 'TCS', symbol: 'TCS' },
  { name: 'HDFCBANK', symbol: 'HDFCBANK' },
];

// Gann calculation
const GANN_STEPS = {
  buy: { up: 0.333, avg: 0.250, sl: 0.166, t1: 0.416, t2: 0.500, t3: 0.666 },
  sell: { below: -0.333, avg: -0.250, sl: -0.166, t1: -0.416, t2: -0.500, t3: -0.666 }
};

const calculateGann = (price: number, multiplier: number = 1): GannLevels => {
  const baseSqrt = Math.sqrt(price);
  const step = (val: number) => Math.pow(baseSqrt + (val * multiplier), 2);
  return {
    buy: {
      entry: step(GANN_STEPS.buy.up),
      avg: step(GANN_STEPS.buy.avg),
      sl: step(GANN_STEPS.buy.sl),
      t1: step(GANN_STEPS.buy.t1),
      t2: step(GANN_STEPS.buy.t2),
      t3: step(GANN_STEPS.buy.t3)
    },
    sell: {
      entry: step(GANN_STEPS.sell.below),
      avg: step(GANN_STEPS.sell.avg),
      sl: step(GANN_STEPS.sell.sl),
      t1: step(GANN_STEPS.sell.t1),
      t2: step(GANN_STEPS.sell.t2),
      t3: step(GANN_STEPS.sell.t3)
    }
  };
};

// Data grid component
const DataCell = ({ label, value, color }: { label: string; value: number; color: 'purple' | 'green' | 'red' | 'cyan' | 'orange' }) => {
  const colorClasses = {
    purple: 'text-purple-400 border-l-purple-500',
    green: 'text-emerald-400 border-l-emerald-500',
    red: 'text-rose-400 border-l-rose-500',
    cyan: 'text-cyan-400 border-l-cyan-500',
    orange: 'text-orange-400 border-l-orange-500',
  };
  return (
    <div className={`bg-[#0f1629] border border-[#1e293b] border-l-2 rounded-lg p-2 sm:p-3 text-center`}>
      <p className="text-[9px] sm:text-[10px] text-slate-500 mb-0.5 sm:mb-1">{label}</p>
      <p className={`text-xs sm:text-sm font-bold ${colorClasses[color]}`}>₹{value?.toFixed(2) || '0.00'}</p>
    </div>
  );
};

export default function StockMagicDashboard() {
  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authType, setAuthType] = useState<'admin' | 'demo' | null>(null);
  const [demoExpiry, setDemoExpiry] = useState<number | null>(null);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [filterType, setFilterType] = useState<'all' | 'buy' | 'sell' | 'favorites'>('all');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [gannLevels, setGannLevels] = useState<GannLevels | null>(null);

  const [isClient, setIsClient] = useState(false);
  const [themeColor, setThemeColor] = useState<'purple' | 'blue' | 'cyan' | 'orange'>('purple');
  
  const themeColors = {
    purple: { primary: '#a855f7', accent: 'rgba(168, 85, 247, 0.2)', border: 'rgba(168, 85, 247, 0.5)' },
    blue: { primary: '#3b82f6', accent: 'rgba(59, 130, 246, 0.2)', border: 'rgba(59, 130, 246, 0.5)' },
    cyan: { primary: '#06b6d4', accent: 'rgba(6, 182, 212, 0.2)', border: 'rgba(6, 182, 212, 0.5)' },
    orange: { primary: '#f97316', accent: 'rgba(249, 115, 22, 0.2)', border: 'rgba(249, 115, 22, 0.5)' },
  };
  
  // Check authentication on mount
  useEffect(() => {
    setIsClient(true);
    
    // Check stored authentication
    const storedAuth = localStorage.getItem('j8pro_auth');
    const storedAuthType = localStorage.getItem('j8pro_auth_type') as 'admin' | 'demo' | null;
    const storedExpiry = localStorage.getItem('j8pro_demo_expiry');
    
    if (storedAuth === 'true' && storedAuthType) {
      if (storedAuthType === 'admin') {
        setIsAuthenticated(true);
        setAuthType('admin');
      } else if (storedAuthType === 'demo' && storedExpiry) {
        const expiryTime = parseInt(storedExpiry);
        if (Date.now() < expiryTime) {
          setIsAuthenticated(true);
          setAuthType('demo');
          setDemoExpiry(expiryTime);
        } else {
          // Demo expired - clear storage
          localStorage.removeItem('j8pro_auth');
          localStorage.removeItem('j8pro_auth_type');
          localStorage.removeItem('j8pro_demo_expiry');
          setPasswordError('Demo period has expired. Please contact admin for access.');
        }
      }
    }
    
    setIsCheckingAuth(false);
    
    // Load favorites
    const savedFavorites = localStorage.getItem('stockFavorites');
    if (savedFavorites) setFavorites(JSON.parse(savedFavorites));
    const savedTheme = localStorage.getItem('themeColor') as 'purple' | 'blue' | 'cyan' | 'orange' | null;
    if (savedTheme) setThemeColor(savedTheme);
  }, []);

  // Handle password login
  const handleLogin = () => {
    setPasswordError('');
    
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      setAuthType('admin');
      localStorage.setItem('j8pro_auth', 'true');
      localStorage.setItem('j8pro_auth_type', 'admin');
      toast.success('Welcome Admin! Full access granted.');
    } else if (password === DEMO_PASSWORD) {
      const expiryTime = Date.now() + DEMO_DURATION_MS;
      setIsAuthenticated(true);
      setAuthType('demo');
      setDemoExpiry(expiryTime);
      localStorage.setItem('j8pro_auth', 'true');
      localStorage.setItem('j8pro_auth_type', 'demo');
      localStorage.setItem('j8pro_demo_expiry', expiryTime.toString());
      toast.success('Demo access granted for 24 hours.');
    } else {
      setPasswordError('Invalid password. Please try again.');
    }
    setPassword('');
  };

  // Handle logout
  const handleLogout = () => {
    setIsAuthenticated(false);
    setAuthType(null);
    setDemoExpiry(null);
    localStorage.removeItem('j8pro_auth');
    localStorage.removeItem('j8pro_auth_type');
    localStorage.removeItem('j8pro_demo_expiry');
    toast.success('Logged out successfully.');
  };

  // Get remaining demo time
  const getRemainingDemoTime = () => {
    if (!demoExpiry) return null;
    const remaining = demoExpiry - Date.now();
    if (remaining <= 0) return 'Expired';
    
    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m remaining`;
  };

  useEffect(() => {
    if (isClient && favorites.length > 0) localStorage.setItem('stockFavorites', JSON.stringify(favorites));
  }, [favorites, isClient]);

  useEffect(() => {
    if (isClient) localStorage.setItem('themeColor', themeColor);
  }, [themeColor, isClient]);

  const handleThemeChange = (color: 'purple' | 'blue' | 'cyan' | 'orange') => {
    setThemeColor(color);
    toast.success(`Theme changed to ${color}`);
  };

  const fetchAllStocks = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/yahoo?all=true');
      const result = await response.json();
      
      if (result.success && result.data) {
        setStocks(result.data);
        if (!selectedStock && result.data.length > 0) {
          const firstStock = result.data[0];
          setSelectedStock(firstStock);
          setGannLevels(calculateGann(firstStock.yClose || firstStock.price));
        }
      }
    } catch (error) {
      console.error('Error fetching stocks:', error);
      toast.error('Failed to fetch stock data');
    } finally {
      setIsLoading(false);
      setIsInitialLoad(false);
    }
  }, [selectedStock]);

  const fetchStock = async (symbol: string) => {
    try {
      const response = await fetch(`/api/yahoo?symbol=${encodeURIComponent(symbol)}`);
      const result = await response.json();
      if (result.success && result.data) return result.data as Stock;
    } catch (error) {
      console.error(`Error fetching ${symbol}:`, error);
    }
    return null;
  };

  useEffect(() => {
    if (isClient) fetchAllStocks();
  }, [isClient, fetchAllStocks]);

  const toggleFavorite = (symbol: string) => {
    if (favorites.includes(symbol)) {
      setFavorites(favorites.filter(f => f !== symbol));
      toast.success(`${symbol} removed from favorites`);
    } else {
      setFavorites([...favorites, symbol]);
      toast.success(`${symbol} added to favorites`);
    }
  };

  const handleIndexClick = async (index: typeof NIFTY_INDICES[0]) => {
    setIsLoading(true);
    const stockData = await fetchStock(index.symbol);
    if (stockData) {
      setSelectedStock(stockData);
      setGannLevels(calculateGann(stockData.yClose || stockData.price));
      toast.success(`Viewing ${index.name}`);
      setSidebarOpen(false);
    } else {
      toast.error(`Failed to load ${index.name}`);
    }
    setIsLoading(false);
  };

  const handleWatchlistClick = async (stock: Stock) => {
    setIsLoading(true);
    const stockData = await fetchStock(stock.symbol);
    if (stockData) {
      setSelectedStock(stockData);
      setGannLevels(calculateGann(stockData.yClose || stockData.price));
      setSidebarOpen(false);
    }
    setIsLoading(false);
  };

  const refreshData = async () => {
    setIsLoading(true);
    await fetchAllStocks();
    toast.success('Data refreshed');
  };

  const getFilteredStocks = () => {
    let filteredStocks = [...stocks];
    if (searchQuery) {
      filteredStocks = filteredStocks.filter(s => 
        s.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    if (filterType === 'buy') {
      filteredStocks = filteredStocks.filter(s => s.pChange > 0).sort((a, b) => b.pChange - a.pChange);
    } else if (filterType === 'sell') {
      filteredStocks = filteredStocks.filter(s => s.pChange < 0).sort((a, b) => a.pChange - b.pChange);
    } else if (filterType === 'favorites') {
      filteredStocks = filteredStocks.filter(s => favorites.includes(s.symbol));
    }
    return filteredStocks;
  };

  if (!isClient || isCheckingAuth) {
    return (
      <div className="min-h-screen bg-[#0a0f1c] flex items-center justify-center">
        <div className="text-center px-4">
          <Loader2 className="w-10 h-10 sm:w-12 sm:h-12 animate-spin mx-auto mb-4" style={{ color: themeColors[themeColor].primary }} />
          <p className="text-white text-base sm:text-lg">Loading J8PRO MAGIC SCANNER...</p>
        </div>
      </div>
    );
  }

  // Login Screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0a0f1c] flex items-center justify-center p-4">
        <Toaster position="bottom-right" theme="dark" />
        <Card className="w-full max-w-md bg-[#0f1629] border border-[#1e293b]">
          <CardContent className="p-6 sm:p-8">
            <div className="text-center mb-6">
              <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ backgroundColor: themeColors[themeColor].accent }}>
                <Lock className="w-8 h-8 sm:w-10 sm:h-10" style={{ color: themeColors[themeColor].primary }} />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">J8PRO MAGIC SCANNER</h1>
              <p className="text-slate-400 text-sm sm:text-base">Enter password to access</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs sm:text-sm text-slate-400 mb-1.5 block">Password</label>
                <Input
                  type="password"
                  placeholder="Enter access password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                  className="bg-black border-[#333] text-white h-11 sm:h-12 text-center text-lg"
                />
              </div>

              {passwordError && (
                <div className="flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg">
                  <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                  <p className="text-rose-400 text-xs sm:text-sm">{passwordError}</p>
                </div>
              )}

              <Button
                onClick={handleLogin}
                className="w-full h-11 sm:h-12 text-white font-bold text-sm sm:text-base hover:opacity-90"
                style={{ backgroundColor: themeColors[themeColor].primary }}
              >
                <Shield className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                UNLOCK ACCESS
              </Button>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800">
              <p className="text-center text-xs sm:text-sm text-slate-500">
                🔐 Admin: Full access | 👤 Demo: 24 hours
              </p>
              <p className="text-center text-[10px] sm:text-xs text-slate-600 mt-2">
                Contact admin for access credentials
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Demo Expired Check (in case it expires while using)
  if (authType === 'demo' && demoExpiry && Date.now() >= demoExpiry) {
    handleLogout();
    return null;
  }

  // Loading Screen
  if (isInitialLoad) {
    return (
      <div className="min-h-screen bg-[#0a0f1c] flex items-center justify-center">
        <div className="text-center px-4">
          <Loader2 className="w-10 h-10 sm:w-12 sm:h-12 animate-spin mx-auto mb-4" style={{ color: themeColors[themeColor].primary }} />
          <p className="text-white text-base sm:text-lg">Loading Real Stock Data...</p>
          <p className="text-slate-400 text-xs sm:text-sm mt-2">Fetching from Yahoo Finance</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0f1c] text-white flex flex-col">
      <Toaster position="bottom-right" theme="dark" />
      
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0a0f1c]/95 backdrop-blur border-b border-slate-800">
        <div className="flex items-center justify-between px-3 sm:px-4 py-2 sm:py-3">
          <div className="flex items-center gap-2 sm:gap-3">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden p-1.5 rounded-lg bg-slate-800/50 hover:bg-slate-700/50">
              {sidebarOpen ? <X className="w-5 h-5 text-slate-300" /> : <Menu className="w-5 h-5 text-slate-300" />}
            </button>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: themeColors[themeColor].primary }} />
              <h1 className="text-sm sm:text-lg font-bold" style={{ color: themeColors[themeColor].primary }}>J8PRO MAGIC SCANNER</h1>
            </div>
            <Badge className="hidden sm:inline-flex text-xs border" style={{ backgroundColor: themeColors[themeColor].accent, color: themeColors[themeColor].primary, borderColor: themeColors[themeColor].border }}>LIVE</Badge>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            {/* Demo Expiry Indicator */}
            {authType === 'demo' && (
              <div className="hidden sm:flex items-center gap-1.5 px-2 sm:px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/30">
                <Clock className="w-3 h-3 text-amber-400" />
                <span className="text-[10px] sm:text-xs text-amber-400 font-medium">{getRemainingDemoTime()}</span>
              </div>
            )}
            <div className="hidden sm:flex items-center gap-1.5">
              {(['purple', 'blue', 'cyan', 'orange'] as const).map((color) => (
                <button key={color} onClick={() => handleThemeChange(color)} className={`w-4 h-4 sm:w-5 sm:h-5 rounded-full transition-all hover:scale-125 ${themeColor === color ? 'ring-2 ring-white ring-offset-1 ring-offset-slate-900' : ''}`}
                  style={{ backgroundColor: color === 'purple' ? '#a855f7' : color === 'blue' ? '#3b82f6' : color === 'cyan' ? '#06b6d4' : '#f97316' }} />
              ))}
            </div>
            <div className="hidden md:flex items-center gap-1 text-xs text-slate-400" suppressHydrationWarning>
              <Clock className="w-3.5 h-3.5" />
              {isClient ? new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false }) + ' IST' : '--:--'}
            </div>
            <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-1.5 rounded-lg bg-slate-800/50 hover:bg-slate-700/50">
              {isDarkMode ? <Moon className="w-4 h-4 text-slate-300" /> : <Sun className="w-4 h-4 text-amber-400" />}
            </button>
            {/* Logout Button */}
            <button onClick={handleLogout} className="p-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30" title="Logout">
              <LogOut className="w-4 h-4 text-rose-400" />
            </button>
          </div>
        </div>
      </header>

      {/* Demo Banner */}
      {authType === 'demo' && (
        <div className="bg-amber-500/10 border-b border-amber-500/30 px-4 py-2 flex items-center justify-center gap-2">
          <Clock className="w-4 h-4 text-amber-400" />
          <span className="text-xs sm:text-sm text-amber-400">
            Demo Mode: <span className="font-bold">{getRemainingDemoTime()}</span>
          </span>
        </div>
      )}

      {/* Mobile Theme Selector */}
      <div className="sm:hidden flex items-center justify-center gap-3 py-2 border-b border-slate-800 bg-[#0a0f1c]">
        {(['purple', 'blue', 'cyan', 'orange'] as const).map((color) => (
          <button key={color} onClick={() => handleThemeChange(color)} className={`w-6 h-6 rounded-full transition-all ${themeColor === color ? 'ring-2 ring-white' : ''}`}
            style={{ backgroundColor: color === 'purple' ? '#a855f7' : color === 'blue' ? '#3b82f6' : color === 'cyan' ? '#06b6d4' : '#f97316' }} />
        ))}
      </div>

      {/* Main Layout */}
      <div className="flex flex-1 overflow-hidden relative">
        {sidebarOpen && <div className="lg:hidden fixed inset-0 bg-black/50 z-30" onClick={() => setSidebarOpen(false)} />}
        
        {/* Sidebar */}
        <aside className={`fixed lg:relative inset-y-0 left-0 z-40 w-72 sm:w-72 bg-[#0a0f1c] border-r border-slate-800 flex flex-col transform transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
          <div className="lg:hidden flex items-center justify-between p-3 border-b border-slate-800">
            <span className="text-sm font-semibold" style={{ color: themeColors[themeColor].primary }}>Menu</span>
            <button onClick={() => setSidebarOpen(false)} className="p-1.5 rounded-lg bg-slate-800/50"><ChevronLeft className="w-5 h-5 text-slate-300" /></button>
          </div>
          
          <div className="p-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <Input placeholder="Search stocks..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 bg-[#0f1629] border-slate-700 text-white placeholder:text-slate-500 h-9" />
            </div>
          </div>

          <div className="px-3 py-2">
            <div className="flex items-center gap-2 mb-2">
              <Grid3X3 className="w-4 h-4" style={{ color: themeColors[themeColor].primary }} />
              <span className="text-xs font-semibold" style={{ color: themeColors[themeColor].primary }}>QUICK ACCESS</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {NIFTY_INDICES.map((idx) => {
                const stockData = stocks.find(s => s.symbol === idx.symbol);
                return (
                  <div key={idx.name} onClick={() => handleIndexClick(idx)} className={`p-2 sm:p-2.5 rounded-lg cursor-pointer transition-all ${selectedStock?.symbol === idx.symbol ? 'border' : 'bg-[#0f1629] border border-[#1e293b] hover:border-purple-500/30'}`}
                    style={selectedStock?.symbol === idx.symbol ? { backgroundColor: themeColors[themeColor].accent, borderColor: themeColors[themeColor].border } : {}}>
                    <p className="text-[9px] sm:text-[10px] text-slate-400">{idx.name}</p>
                    {stockData ? (
                      <>
                        <p className="text-[10px] sm:text-xs font-bold text-white">₹{stockData.price?.toFixed(2)}</p>
                        <p className={`text-[9px] sm:text-[10px] font-semibold ${stockData.pChange >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{stockData.pChange >= 0 ? '+' : ''}{stockData.pChange?.toFixed(2)}%</p>
                      </>
                    ) : <p className="text-[10px] sm:text-xs font-bold text-slate-500">Loading...</p>}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex gap-1 px-3 py-2 sm:py-3">
            <Button size="sm" onClick={() => setFilterType('all')} className={`flex-1 font-semibold h-7 sm:h-8 text-[9px] sm:text-[10px] px-1 sm:px-2 ${filterType === 'all' ? 'text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`} style={filterType === 'all' ? { backgroundColor: themeColors[themeColor].primary } : {}}>All</Button>
            <Button size="sm" onClick={() => setFilterType('buy')} className={`flex-1 font-semibold h-7 sm:h-8 text-[9px] sm:text-[10px] px-1 sm:px-2 ${filterType === 'buy' ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}><TrendingUp className="w-3 h-3 mr-0.5" />Buy</Button>
            <Button size="sm" onClick={() => setFilterType('sell')} className={`flex-1 font-semibold h-7 sm:h-8 text-[9px] sm:text-[10px] px-1 sm:px-2 ${filterType === 'sell' ? 'bg-rose-500 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}><TrendingDown className="w-3 h-3 mr-0.5" />Sell</Button>
            <Button size="sm" onClick={() => setFilterType('favorites')} className={`font-semibold h-7 sm:h-8 px-1.5 sm:px-2 ${filterType === 'favorites' ? 'bg-amber-500 text-white' : 'bg-slate-800 text-amber-400 hover:bg-slate-700'}`}><Star className="w-3 h-3" /></Button>
          </div>

          <div className="flex-1 px-3 py-2 overflow-y-auto">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] sm:text-xs font-semibold text-slate-400">{filterType === 'favorites' ? 'FAVORITES' : filterType === 'buy' ? 'BUY SIGNALS' : filterType === 'sell' ? 'SELL SIGNALS' : 'WATCHLIST'} ({getFilteredStocks().length})</span>
              <RefreshCw onClick={refreshData} className={`w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-500 cursor-pointer hover:text-white ${isLoading ? 'animate-spin' : ''}`} />
            </div>
            <div className="space-y-1">
              {getFilteredStocks().map((stock) => (
                <div key={stock.symbol} onClick={() => handleWatchlistClick(stock)} className={`flex items-center justify-between p-2 sm:p-2.5 rounded-lg cursor-pointer transition-all ${selectedStock?.symbol === stock.symbol ? 'border' : 'hover:bg-slate-800/50'} ${stock.pChange > 0 ? 'border-l-2 border-l-emerald-500' : 'border-l-2 border-l-rose-500'}`}
                  style={selectedStock?.symbol === stock.symbol ? { backgroundColor: themeColors[themeColor].accent, borderColor: themeColors[themeColor].border } : {}}>
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <button onClick={(e) => { e.stopPropagation(); toggleFavorite(stock.symbol); }} className={`${favorites.includes(stock.symbol) ? 'text-amber-400' : 'text-slate-600'} hover:text-amber-400 transition-colors`}>
                      <Star className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${favorites.includes(stock.symbol) ? 'fill-amber-400' : ''}`} />
                    </button>
                    <div>
                      <p className="text-[11px] sm:text-sm font-semibold text-white">{stock.symbol}</p>
                      <p className="text-[9px] sm:text-[10px] text-slate-500">₹{stock.price?.toFixed(2)}</p>
                    </div>
                  </div>
                  <div className={`flex items-center gap-0.5 sm:gap-1 ${stock.pChange >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {stock.pChange >= 0 ? <ArrowUpRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> : <ArrowDownRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />}
                    <span className="text-[10px] sm:text-xs font-semibold">{stock.pChange >= 0 ? '+' : ''}{stock.pChange?.toFixed(2)}%</span>
                  </div>
                </div>
              ))}
              {getFilteredStocks().length === 0 && (
                <div className="text-center py-6 sm:py-8 text-slate-500">
                  <Heart className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-[10px] sm:text-xs">{filterType === 'favorites' ? 'No favorites yet' : 'No stocks found'}</p>
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-3 sm:p-5 overflow-y-auto">
          {selectedStock ? (
            <div className="space-y-3 sm:space-y-5">
              {/* Stock Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
                <div className="flex items-center gap-2 sm:gap-4">
                  <h2 className="text-xl sm:text-3xl font-bold text-white">{selectedStock.symbol}</h2>
                  <Badge variant="outline" className="border-slate-600 text-slate-300 text-[10px] sm:text-xs">{selectedStock.name}</Badge>
                  <button onClick={() => toggleFavorite(selectedStock.symbol)} className={`${favorites.includes(selectedStock.symbol) ? 'text-amber-400' : 'text-slate-500'} hover:text-amber-400`}>
                    <Star className={`w-4 h-4 sm:w-5 sm:h-5 ${favorites.includes(selectedStock.symbol) ? 'fill-amber-400' : ''}`} />
                  </button>
                  {isLoading && <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" style={{ color: themeColors[themeColor].primary }} />}
                </div>
                {isClient && (
                  <div className="text-left sm:text-right" suppressHydrationWarning>
                    <p className="text-xl sm:text-2xl font-bold text-white">₹{selectedStock.price?.toFixed(2)}</p>
                    <p className={`text-xs sm:text-sm font-semibold ${selectedStock.pChange >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {selectedStock.pChange >= 0 ? '+' : ''}{selectedStock.change?.toFixed(2)} ({selectedStock.pChange >= 0 ? '+' : ''}{selectedStock.pChange?.toFixed(2)}%)
                    </p>
                  </div>
                )}
              </div>

              {/* Data Grid */}
              <Card className="bg-[#0f1629] border border-[#1e293b]">
                <CardContent className="p-2 sm:p-4">
                  <div className="grid grid-cols-4 gap-1.5 sm:gap-3">
                    <DataCell label="Y.OPEN" value={selectedStock.yOpen} color="purple" />
                    <DataCell label="Y.HIGH" value={selectedStock.yHigh} color="green" />
                    <DataCell label="Y.LOW" value={selectedStock.yLow} color="red" />
                    <DataCell label="Y.CLOSE" value={selectedStock.yClose} color="cyan" />
                    <DataCell label="T.OPEN" value={selectedStock.tOpen} color="cyan" />
                    <DataCell label="T.HIGH" value={selectedStock.tHigh} color="green" />
                    <DataCell label="T.LOW" value={selectedStock.tLow} color="red" />
                    <DataCell label="T.CLOSE" value={selectedStock.tClose} color="purple" />
                    <DataCell label="PM.HIGH" value={selectedStock.pmHigh} color="orange" />
                    <DataCell label="PM.LOW" value={selectedStock.pmLow} color="orange" />
                    <DataCell label="PM.CLOSE" value={selectedStock.pmClose} color="cyan" />
                    <div className="hidden sm:block"></div>
                    <DataCell label="52W HIGH" value={selectedStock.week52High} color="green" />
                    <DataCell label="52W LOW" value={selectedStock.week52Low} color="red" />
                    <DataCell label="LIFE HI" value={selectedStock.lifetimeHigh} color="cyan" />
                    <DataCell label="LIFE LO" value={selectedStock.lifetimeLow} color="purple" />
                  </div>
                </CardContent>
              </Card>

              {/* Magic Levels */}
              <Card className="bg-[#0f1629] border border-[#1e293b]">
                <CardContent className="p-3 sm:p-5">
                  <div className="flex items-center justify-between mb-3 sm:mb-4">
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: themeColors[themeColor].primary }} />
                      <h3 className="text-sm sm:text-base font-bold">MAGIC LEVELS</h3>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-slate-400" suppressHydrationWarning>
                      <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                      {isClient ? new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) + ' | ' + new Date().toLocaleDateString('en-IN') : '--:--:-- | --/--/----'}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    {/* Buy Levels */}
                    <div className="bg-slate-800/30 rounded-lg p-2.5 sm:p-3">
                      <div className="flex items-center justify-between mb-2 sm:mb-3 pb-1.5 sm:pb-2 border-b border-emerald-500/30">
                        <h3 className="text-xs sm:text-sm font-bold text-emerald-400 flex items-center gap-1"><TrendingUp className="w-3 h-3 sm:w-4 sm:h-4" /> BUY</h3>
                        {gannLevels && (
                          <button 
                            onClick={() => {
                              const text = `🟢 *J8PRO MAGIC SCANNER*\n\n📊 *${selectedStock.symbol}* - ${selectedStock.name}\n💰 Price: ₹${selectedStock.price?.toFixed(2)} (${selectedStock.pChange >= 0 ? '+' : ''}${selectedStock.pChange?.toFixed(2)}%)\n\n🎯 *BUY LEVELS:*\nEntry: ₹${gannLevels.buy.entry.toFixed(2)}\nAvg: ₹${gannLevels.buy.avg.toFixed(2)}\nSL: ₹${gannLevels.buy.sl.toFixed(2)}\nT1: ₹${gannLevels.buy.t1.toFixed(2)}\nT2: ₹${gannLevels.buy.t2.toFixed(2)}\nT3: ₹${gannLevels.buy.t3.toFixed(2)}\n\n⚠️ *Disclaimer: For educational purposes only. Not financial advice.*`;
                              window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                            }}
                            className="flex items-center gap-1 px-2 py-1 bg-green-600 hover:bg-green-500 rounded text-[9px] sm:text-[10px] text-white transition-all"
                          >
                            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                            <span className="hidden sm:inline">Share</span>
                          </button>
                        )}
                      </div>
                      {gannLevels ? (
                        <div className="grid grid-cols-3 sm:grid-cols-1 gap-2 sm:space-y-2 sm:grid-cols-none">
                          <div className="flex justify-between text-[10px] sm:text-sm"><span className="text-slate-400">Entry</span><span className="text-emerald-400 font-bold">₹{gannLevels.buy.entry.toFixed(2)}</span></div>
                          <div className="flex justify-between text-[10px] sm:text-sm"><span className="text-slate-400">Avg</span><span className="text-emerald-400 font-bold">₹{gannLevels.buy.avg.toFixed(2)}</span></div>
                          <div className="flex justify-between text-[10px] sm:text-sm"><span className="text-slate-400">SL</span><span className="text-rose-400 font-bold">₹{gannLevels.buy.sl.toFixed(2)}</span></div>
                          <div className="flex justify-between text-[10px] sm:text-sm"><span className="text-slate-400">T1</span><span className="text-cyan-400 font-bold">₹{gannLevels.buy.t1.toFixed(2)}</span></div>
                          <div className="flex justify-between text-[10px] sm:text-sm"><span className="text-slate-400">T2</span><span className="text-cyan-400 font-bold">₹{gannLevels.buy.t2.toFixed(2)}</span></div>
                          <div className="flex justify-between text-[10px] sm:text-sm"><span className="text-slate-400">T3</span><span className="text-cyan-400 font-bold">₹{gannLevels.buy.t3.toFixed(2)}</span></div>
                        </div>
                      ) : <div className="text-slate-500 text-xs sm:text-sm text-center py-3 sm:py-4">Loading levels...</div>}
                    </div>
                    
                    {/* Sell Levels */}
                    <div className="bg-slate-800/30 rounded-lg p-2.5 sm:p-3">
                      <div className="flex items-center justify-between mb-2 sm:mb-3 pb-1.5 sm:pb-2 border-b border-rose-500/30">
                        <h3 className="text-xs sm:text-sm font-bold text-rose-400 flex items-center gap-1"><TrendingDown className="w-3 h-3 sm:w-4 sm:h-4" /> SELL</h3>
                        {gannLevels && (
                          <button 
                            onClick={() => {
                              const text = `🔴 *J8PRO MAGIC SCANNER*\n\n📊 *${selectedStock.symbol}* - ${selectedStock.name}\n💰 Price: ₹${selectedStock.price?.toFixed(2)} (${selectedStock.pChange >= 0 ? '+' : ''}${selectedStock.pChange?.toFixed(2)}%)\n\n🎯 *SELL LEVELS:*\nEntry: ₹${gannLevels.sell.entry.toFixed(2)}\nAvg: ₹${gannLevels.sell.avg.toFixed(2)}\nSL: ₹${gannLevels.sell.sl.toFixed(2)}\nT1: ₹${gannLevels.sell.t1.toFixed(2)}\nT2: ₹${gannLevels.sell.t2.toFixed(2)}\nT3: ₹${gannLevels.sell.t3.toFixed(2)}\n\n⚠️ *Disclaimer: For educational purposes only. Not financial advice.*`;
                              window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                            }}
                            className="flex items-center gap-1 px-2 py-1 bg-green-600 hover:bg-green-500 rounded text-[9px] sm:text-[10px] text-white transition-all"
                          >
                            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                            <span className="hidden sm:inline">Share</span>
                          </button>
                        )}
                      </div>
                      {gannLevels ? (
                        <div className="grid grid-cols-3 sm:grid-cols-1 gap-2 sm:space-y-2 sm:grid-cols-none">
                          <div className="flex justify-between text-[10px] sm:text-sm"><span className="text-slate-400">Entry</span><span className="text-rose-400 font-bold">₹{gannLevels.sell.entry.toFixed(2)}</span></div>
                          <div className="flex justify-between text-[10px] sm:text-sm"><span className="text-slate-400">Avg</span><span className="text-rose-400 font-bold">₹{gannLevels.sell.avg.toFixed(2)}</span></div>
                          <div className="flex justify-between text-[10px] sm:text-sm"><span className="text-slate-400">SL</span><span className="text-rose-400 font-bold">₹{gannLevels.sell.sl.toFixed(2)}</span></div>
                          <div className="flex justify-between text-[10px] sm:text-sm"><span className="text-slate-400">T1</span><span className="text-cyan-400 font-bold">₹{gannLevels.sell.t1.toFixed(2)}</span></div>
                          <div className="flex justify-between text-[10px] sm:text-sm"><span className="text-slate-400">T2</span><span className="text-cyan-400 font-bold">₹{gannLevels.sell.t2.toFixed(2)}</span></div>
                          <div className="flex justify-between text-[10px] sm:text-sm"><span className="text-slate-400">T3</span><span className="text-cyan-400 font-bold">₹{gannLevels.sell.t3.toFixed(2)}</span></div>
                        </div>
                      ) : <div className="text-slate-500 text-xs sm:text-sm text-center py-3 sm:py-4">Loading levels...</div>}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Disclaimer */}
              <Card className="bg-[#0f1629] border border-amber-500/30">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-amber-400 mb-1">DISCLAIMER</h4>
                      <p className="text-[10px] sm:text-xs text-slate-400 leading-relaxed">
                        J8PRO MAGIC SCANNER is for educational and informational purposes only. The data, levels, and signals provided are NOT financial advice. Stock market investments carry significant risks. Past performance does not guarantee future results. Always consult a certified financial advisor before making any investment decisions. We are not responsible for any financial losses incurred.
                      </p>
                      <p className="text-[9px] sm:text-[10px] text-slate-500 mt-2" suppressHydrationWarning>
                        Last Updated: {isClient ? new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'full', timeStyle: 'short' }) : '--'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Price Change Indicator */}
              {isClient && (
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4" suppressHydrationWarning>
                  <div className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg ${selectedStock.pChange >= 0 ? 'bg-emerald-500/10 border border-emerald-500/30' : 'bg-rose-500/10 border border-rose-500/30'}`}>
                    {selectedStock.pChange >= 0 ? <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" /> : <TrendingDown className="w-4 h-4 sm:w-5 sm:h-5 text-rose-400" />}
                    <span className={`text-sm sm:text-lg font-bold ${selectedStock.pChange >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {selectedStock.pChange >= 0 ? '+' : ''}{selectedStock.change?.toFixed(2)} ({selectedStock.pChange?.toFixed(2)}%)
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2 text-slate-400 text-xs sm:text-sm">
                    <BarChart3 className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span>Real-time data from Yahoo Finance</span>
                  </div>
                </div>
              )}

              {/* TradingView & Quick Links */}
              <Card className="bg-[#0f1629] border border-[#1e293b]">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex flex-wrap gap-2">
                    <button 
                      onClick={() => window.open(`https://in.tradingview.com/chart/?symbol=NSE%3A${selectedStock.symbol}`, '_blank')}
                      className="flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-xs sm:text-sm font-semibold text-white transition-all"
                    >
                      <svg className="w-4 h-4 sm:w-5 sm:h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M3 3h18v18H3V3zm16 16V5H5v14h14zM7 7h4v4H7V7zm0 6h4v4H7v-4zm6-6h4v4h-4V7zm0 6h4v4h-4v-4z"/></svg>
                      TradingView Chart
                    </button>
                    <button 
                      onClick={() => window.open(`https://www.google.com/search?q=${selectedStock.symbol}+stock+news`, '_blank')}
                      className="flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs sm:text-sm font-semibold text-white transition-all"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                      Google News
                    </button>
                    <button 
                      onClick={() => window.open(`https://www.moneycontrol.com/stocks/cptmarket/stocksearch.php?search_data=${selectedStock.symbol}`, '_blank')}
                      className="flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs sm:text-sm font-semibold text-white transition-all"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                      Moneycontrol
                    </button>
                    <button 
                      onClick={() => window.open(`https://www.nseindia.com/get-quotes/equity?symbol=${selectedStock.symbol}`, '_blank')}
                      className="flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs sm:text-sm font-semibold text-white transition-all"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>
                      NSE
                    </button>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="flex items-center justify-center h-[50vh] sm:h-[60vh]">
              <div className="text-center">
                <BarChart3 className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 text-slate-600" />
                <h3 className="text-lg sm:text-xl font-medium text-slate-300">Select a Stock</h3>
                <p className="text-xs sm:text-sm text-slate-500 mt-2">Choose from indices or watchlist</p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
