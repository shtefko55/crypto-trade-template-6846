import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navigation from "@/components/Navigation";
import { Link } from "react-router-dom";

const Index = () => {
  return (
    <div className="min-h-screen bg-black text-foreground">
      <Navigation />
      
      {/* Hero Section */}
      <motion.section 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative container px-4 pt-40 pb-20 flex items-center justify-center min-h-screen"
      >
        <div className="text-center max-w-4xl">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-6xl md:text-8xl font-bold mb-8 tracking-tight"
          >
            <span className="text-white">Live Crypto</span>
            <br />
            <span className="bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
              Trading Monitor
            </span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-xl md:text-2xl text-gray-300 mb-12 max-w-3xl mx-auto"
          >
            Real-time криптовалутен мониторинг с live цени от Binance, 
            EMA 50% калкулации и професионална аналитика.
          </motion.p>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="flex flex-col sm:flex-row gap-6 items-center justify-center"
          >
            <Link to="/trading">
              <Button size="lg" className="button-gradient text-lg px-8 py-4">
                Започни Сега
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <Link to="/trading">
              <Button size="lg" variant="outline" className="text-lg px-8 py-4 border-gray-600 text-white hover:bg-gray-800">
                Live Цени
              </Button>
            </Link>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="mt-16 text-sm text-gray-500"
          >
            Поддържа BTC • ETH • SOL • INJ • HYPE
          </motion.div>
        </div>
      </motion.section>
    </div>
  );
};

export default Index;
