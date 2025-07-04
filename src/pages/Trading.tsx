import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Plus, TrendingUp, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import Navigation from "@/components/Navigation";

interface CryptoData {
  symbol: string;
  price: number;
  change24h: number;
  ema50: number;
  emaPercentDiff: number;
  priceHistory: number[];
}

const Trading = () => {
  const [cryptos, setCryptos] = useState<CryptoData[]>([
    { symbol: "BTCUSDT", price: 0, change24h: 0, ema50: 0, emaPercentDiff: 0, priceHistory: [] },
    { symbol: "ETHUSDT", price: 0, change24h: 0, ema50: 0, emaPercentDiff: 0, priceHistory: [] },
    { symbol: "SOLUSDT", price: 0, change24h: 0, ema50: 0, emaPercentDiff: 0, priceHistory: [] },
    { symbol: "INJUSDT", price: 0, change24h: 0, ema50: 0, emaPercentDiff: 0, priceHistory: [] },
    { symbol: "HYPEUSDT", price: 0, change24h: 0, ema50: 0, emaPercentDiff: 0, priceHistory: [] },
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
        const newPriceHistory = [...crypto.priceHistory, price].slice(-100); // Keep last 100 prices
        const ema50 = calculateEMA(newPriceHistory, 50);
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

  useEffect(() => {
    // Fetch initial data and connect WebSocket
    const fetchInitialData = async () => {
      try {
        const symbols = cryptos.map(c => c.symbol).join(',');
        const response = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbols=["${symbols.split(',').join('","')}"]`);
        const data = await response.json();
        
        data.forEach((ticker: any) => {
          updateCryptoData(ticker.symbol, parseFloat(ticker.lastPrice), parseFloat(ticker.priceChangePercent));
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
      setCryptos(prev => [...prev, {
        symbol: newSymbol.toUpperCase(),
        price: 0,
        change24h: 0,
        ema50: 0,
        emaPercentDiff: 0,
        priceHistory: []
      }]);
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
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Live Crypto Monitor</h1>
            <p className="text-gray-400">Real-time prices with EMA 50% difference tracking</p>
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
          <h3 className="text-lg font-semibold mb-4">EMA 50% Difference Explained</h3>
          <p className="text-gray-400 text-sm">
            This indicator calculates the percentage difference between the current price and the 50-period 
            Exponential Moving Average using the formula: ((current_price - ema50) / ema50) × 100. 
            Positive values indicate the price is above the EMA, negative values indicate it's below.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Trading;