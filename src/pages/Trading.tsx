import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Plus, TrendingUp, TrendingDown, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Navigation from "@/components/Navigation";

interface CryptoData {
  symbol: string;
  price: number;
  change24h: number;
  ema50: number;
  emaPercentDiff: number;
  priceHistory: { [key: string]: number[] }; // timeframe -> prices
}

type Timeframe = '1h' | '2h' | '4h' | '1d';

const timeframeLabels: Record<Timeframe, string> = {
  '1h': '1 Hour',
  '2h': '2 Hours', 
  '4h': '4 Hours',
  '1d': '1 Day'
};

const timeframeIntervals: Record<Timeframe, string> = {
  '1h': '1h',
  '2h': '2h',
  '4h': '4h',
  '1d': '1d'
};

const Trading = () => {
  const [selectedTimeframe, setSelectedTimeframe] = useState<Timeframe>('1h');
  const [cryptos, setCryptos] = useState<CryptoData[]>([
    { symbol: "BTCUSDT", price: 0, change24h: 0, ema50: 0, emaPercentDiff: 0, priceHistory: {} },
    { symbol: "ETHUSDT", price: 0, change24h: 0, ema50: 0, emaPercentDiff: 0, priceHistory: {} },
    { symbol: "SOLUSDT", price: 0, change24h: 0, ema50: 0, emaPercentDiff: 0, priceHistory: {} },
    { symbol: "INJUSDT", price: 0, change24h: 0, ema50: 0, emaPercentDiff: 0, priceHistory: {} },
    { symbol: "HYPEUSDT", price: 0, change24h: 0, ema50: 0, emaPercentDiff: 0, priceHistory: {} },
  ]);
  
  const [newSymbol, setNewSymbol] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  // Calculate EMA using the Pine Script formula logic
  const calculateEMA = (prices: number[], period: number = 50): number => {
    if (prices.length < period) return 0;
    
    const multiplier = 2 / (period + 1);
    let ema = prices.slice(0, period).reduce((sum, price) => sum + price, 0) / period;
    
    for (let i = period; i < prices.length; i++) {
      ema = (prices[i] * multiplier) + (ema * (1 - multiplier));
    }
    
    return ema;
  };

  // Calculate percentage difference: ((close - ema50) / ema50) * 100
  const calculateEMAPercentDiff = (currentPrice: number, ema50: number): number => {
    if (ema50 === 0) return 0;
    return ((currentPrice - ema50) / ema50) * 100;
  };

  const updateCryptoData = (symbol: string, price: number, change24h: number) => {
    setCryptos(prev => prev.map(crypto => {
      if (crypto.symbol === symbol) {
        const newPriceHistory = { ...crypto.priceHistory };
        
        // Update price history for current timeframe
        if (!newPriceHistory[selectedTimeframe]) {
          newPriceHistory[selectedTimeframe] = [];
        }
        newPriceHistory[selectedTimeframe] = [...newPriceHistory[selectedTimeframe], price].slice(-100);
        
        const ema50 = calculateEMA(newPriceHistory[selectedTimeframe] || [], 50);
        const emaPercentDiff = calculateEMAPercentDiff(price, ema50);
        
        return {
          ...crypto,
          price,
          change24h,
          ema50,
          emaPercentDiff,
          priceHistory: newPriceHistory
        };
      }
      return crypto;
    }));
  };

  const connectWebSocket = () => {
    // Create individual WebSocket connections for each symbol
    cryptos.forEach(crypto => {
      const wsUrl = `wss://stream.binance.com:9443/ws/${crypto.symbol.toLowerCase()}@ticker`;
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        console.log(`WebSocket connected for ${crypto.symbol}`);
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.s && data.c && data.P) {
            updateCryptoData(data.s, parseFloat(data.c), parseFloat(data.P));
          }
        } catch (error) {
          console.error('WebSocket message error:', error);
        }
      };
      
      ws.onclose = () => {
        console.log(`WebSocket closed for ${crypto.symbol}, reconnecting...`);
        setTimeout(() => connectWebSocket(), 3000);
      };
      
      ws.onerror = (error) => {
        console.error(`WebSocket error for ${crypto.symbol}:`, error);
      };
    });
  };

  // Fetch historical data for selected timeframe
  const fetchHistoricalData = async (symbol: string, timeframe: Timeframe) => {
    try {
      const interval = timeframeIntervals[timeframe];
      const response = await fetch(
        `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=100`
      );
      const data = await response.json();
      
      if (Array.isArray(data)) {
        const prices = data.map((kline: any) => parseFloat(kline[4])); // closing prices
        
        setCryptos(prev => prev.map(crypto => {
          if (crypto.symbol === symbol) {
            const newPriceHistory = { ...crypto.priceHistory };
            newPriceHistory[timeframe] = prices;
            
            const ema50 = calculateEMA(prices, 50);
            const emaPercentDiff = calculateEMAPercentDiff(crypto.price, ema50);
            
            return {
              ...crypto,
              ema50,
              emaPercentDiff,
              priceHistory: newPriceHistory
            };
          }
          return crypto;
        }));
      }
    } catch (error) {
      console.error(`Error fetching historical data for ${symbol}:`, error);
    }
  };

  useEffect(() => {
    // Fetch historical data for all cryptos when timeframe changes
    cryptos.forEach(crypto => {
      fetchHistoricalData(crypto.symbol, selectedTimeframe);
    });
  }, [selectedTimeframe]);

  useEffect(() => {
    // Fetch initial data and connect WebSocket
    const fetchInitialData = async () => {
      try {
        // Use alternative approach due to CORS issues
        cryptos.forEach(crypto => {
          // Fetch current price
          fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${crypto.symbol}`)
            .then(res => res.json())
            .then(data => {
              if (data.price) {
                updateCryptoData(crypto.symbol, parseFloat(data.price), 0);
              }
            })
            .catch(console.error);
          
          // Fetch historical data for initial timeframe
          fetchHistoricalData(crypto.symbol, selectedTimeframe);
        });
      } catch (error) {
        console.error('Error fetching initial data:', error);
      }
    };

    fetchInitialData();
    connectWebSocket();
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const addNewCrypto = () => {
    if (newSymbol && !cryptos.find(c => c.symbol === newSymbol.toUpperCase())) {
      const newCrypto = {
        symbol: newSymbol.toUpperCase(),
        price: 0,
        change24h: 0,
        ema50: 0,
        emaPercentDiff: 0,
        priceHistory: {}
      };
      
      setCryptos(prev => [...prev, newCrypto]);
      
      // Fetch historical data for the new crypto
      fetchHistoricalData(newSymbol.toUpperCase(), selectedTimeframe);
      
      setNewSymbol("");
      setIsDialogOpen(false);
    }
  };

  const formatPrice = (price: number, symbol: string) => {
    if (symbol.includes("USDT")) {
      return price < 1 ? price.toFixed(6) : price.toFixed(2);
    }
    return price.toFixed(8);
  };

  const getEMAColor = (diff: number) => {
    if (diff > 0) return "text-green-400";
    if (diff < 0) return "text-red-400";
    return "text-gray-400";
  };

  const getEMABgColor = (diff: number) => {
    if (diff > 0) return "bg-green-500/10 border-green-500/20";
    if (diff < 0) return "bg-red-500/10 border-red-500/20";
    return "bg-gray-500/10 border-gray-500/20";
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <Navigation />
      
      <div className="container mx-auto px-4 pt-20">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-4">
          <div>
            <h1 className="text-4xl font-bold mb-2">Live Crypto Monitor</h1>
            <p className="text-gray-400">Real-time prices with EMA 50% difference tracking</p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-400">Timeframe:</span>
              <Select value={selectedTimeframe} onValueChange={(value: Timeframe) => setSelectedTimeframe(value)}>
                <SelectTrigger className="w-32 bg-gray-800 border-gray-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-600">
                  {Object.entries(timeframeLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value} className="text-white hover:bg-gray-700">
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="button-gradient">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Crypto
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-gray-900 border-gray-700">
                <DialogHeader>
                  <DialogTitle>Add New Cryptocurrency</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Input
                    placeholder="Enter symbol (e.g., ADAUSDT)"
                    value={newSymbol}
                    onChange={(e) => setNewSymbol(e.target.value)}
                    className="bg-gray-800 border-gray-600"
                  />
                  <Button onClick={addNewCrypto} className="w-full button-gradient">
                    Add to Monitor
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cryptos.map((crypto, index) => (
            <motion.div
              key={crypto.symbol}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="bg-gray-900/50 border-gray-700 hover:border-gray-600 transition-colors">
                <CardHeader className="pb-2">
                  <CardTitle className="flex justify-between items-center">
                    <span className="text-lg font-bold">
                      {crypto.symbol.replace("USDT", "")}
                    </span>
                    <Badge 
                      variant={crypto.change24h >= 0 ? "default" : "destructive"}
                      className={crypto.change24h >= 0 ? "bg-green-500/20 text-green-400" : ""}
                    >
                      {crypto.change24h >= 0 ? "+" : ""}{crypto.change24h.toFixed(2)}%
                    </Badge>
                  </CardTitle>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <div className="text-2xl font-mono font-bold">
                    ${formatPrice(crypto.price, crypto.symbol)}
                  </div>
                  
                  <div className="space-y-2">
                    <div className="text-sm text-gray-400">EMA 50</div>
                    <div className="font-mono text-lg">
                      ${formatPrice(crypto.ema50, crypto.symbol)}
                    </div>
                  </div>
                  
                  <div className={`p-3 rounded-lg border ${getEMABgColor(crypto.emaPercentDiff)}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">EMA 50% Diff</span>
                      {crypto.emaPercentDiff > 0 ? 
                        <TrendingUp className="w-4 h-4 text-green-400" /> : 
                        <TrendingDown className="w-4 h-4 text-red-400" />
                      }
                    </div>
                    <div className={`text-xl font-bold font-mono ${getEMAColor(crypto.emaPercentDiff)}`}>
                      {crypto.emaPercentDiff > 0 ? "+" : ""}{crypto.emaPercentDiff.toFixed(2)}%
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
        
        <div className="mt-12 p-6 bg-gray-900/30 rounded-lg border border-gray-700">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5" />
            EMA 50% Difference - {timeframeLabels[selectedTimeframe]}
          </h3>
          <p className="text-gray-400 text-sm">
            This indicator calculates the percentage difference between the current price and the 50-period 
            Exponential Moving Average for the selected timeframe using the formula: ((current_price - ema50) / ema50) × 100. 
            Positive values indicate the price is above the EMA, negative values indicate it's below.
            <br /><br />
            <strong>Timeframes:</strong> Switch between 1h, 2h, 4h, and 1d to analyze different market trends and volatility patterns.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Trading;