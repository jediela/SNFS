'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { 
    Table, TableHeader, TableRow, TableHead, 
    TableBody, TableCell 
} from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, BarChart } from 'lucide-react';

interface Portfolio {
    portfolio_id: number;
    name: string;
    balance: number;
}

interface StockHolding {
    symbol: string;
    num_shares: number;
    company_name: string;
    current_price: number | null;
    total_value: number | null;
}

interface HoldingData {
    symbol: string;
    num_shares: number | string;
    company_name: string;
    current_price: number | string | null;
    total_value: number | string | null;
}

interface StockPrice {
    symbol: string;
    timestamp: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

export default function TradeStocks() {
    const router = useRouter();
    const { id } = useParams();
    const [user, setUser] = useState<{ user_id: number; username: string } | null>(null);
    const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
    const [symbol, setSymbol] = useState('');
    const [stockPrice, setStockPrice] = useState<StockPrice | null>(null);
    const [loading, setLoading] = useState(false);
    const [priceLoading, setPriceLoading] = useState(false);
    const [shares, setShares] = useState('');
    const [transactionType, setTransactionType] = useState<'buy' | 'sell'>('buy');
    const [availableSymbols, setAvailableSymbols] = useState<string[]>([]);
    const [symbolSearch, setSymbolSearch] = useState('');
    const [currentHoldings, setCurrentHoldings] = useState<StockHolding[]>([]);
    
    const fetchPortfolioData = useCallback(async () => {
        if (!id || !user) return;
        try {
            const res = await fetch(
                `http://localhost:8000/portfolios/${id}?userId=${user.user_id}`,
                { method: 'GET' }
            );
            const data = await res.json();
            if (res.ok && data.portfolio) {
                data.portfolio.balance = Number(data.portfolio.balance);
                setPortfolio(data.portfolio);
            } else {
                toast.error('Failed to load portfolio');
                router.push('/portfolios/view');
            }
        } catch (error) {
            toast.error('Error loading portfolio');
            console.error(error);
        }
    }, [id, user, router]);
    
    const fetchCurrentHoldings = useCallback(async () => {
        if (!id || !user) return;
        try {
            const res = await fetch(
                `http://localhost:8000/portfolios/${id}/holdings?user_id=${user.user_id}`,
                { method: 'GET' }
            );
            const data = await res.json();
            if (res.ok && data.holdings) {
                const parsedHoldings = data.holdings.map((holding: HoldingData) => ({
                    ...holding,
                    num_shares: Number(holding.num_shares),
                    current_price: holding.current_price ? Number(holding.current_price) : null,
                    total_value: holding.total_value ? Number(holding.total_value) : null
                }));
                setCurrentHoldings(parsedHoldings);
            }
        } catch (error) {
            console.error('Error fetching holdings:', error);
            toast.error('Failed to load current holdings');
        }
    }, [id, user]);
    
    const fetchCurrentPrice = useCallback(async () => {
        if (!symbol) return;
        setPriceLoading(true);
        try {
            const res = await fetch(`http://localhost:8000/stocks/current-price/${symbol}`);
            const data = await res.json();
            if (res.ok && data.price_data) {
                data.price_data.open = Number(data.price_data.open);
                data.price_data.high = Number(data.price_data.high);
                data.price_data.low = Number(data.price_data.low);
                data.price_data.close = Number(data.price_data.close);
                data.price_data.volume = Number(data.price_data.volume);
                
                setStockPrice(data.price_data);
            } else {
                setStockPrice(null);
                toast.error(`No price data available for ${symbol}`);
            }
        } catch (error) {
            setStockPrice(null);
            console.error('Error fetching stock price:', error);
        } finally {
            setPriceLoading(false);
        }
    }, [symbol]);
    
    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) setUser(JSON.parse(storedUser));
    }, []);
    
    useEffect(() => {
        if (user && id) {
            fetchPortfolioData();
            fetchCurrentHoldings();
        }
    }, [user, id, fetchPortfolioData, fetchCurrentHoldings]);
    
    useEffect(() => {
        if (symbol) {
            fetchCurrentPrice();
        } else {
            setStockPrice(null);
        }
    }, [symbol, fetchCurrentPrice]);
    
    useEffect(() => {
        async function fetchSymbols() {
            if (!symbolSearch) return;
            
            try {
                const res = await fetch(
                    `http://localhost:8000/stocks/symbols?search=${symbolSearch}&limit=20`
                );
                if (!res.ok) {
                    throw new Error('Failed to fetch symbols');
                }
                const data = await res.json();
                setAvailableSymbols(data.symbols || []);
            } catch (error) {
                console.error('Error fetching symbols:', error);
            }
        }

        fetchSymbols();
    }, [symbolSearch]);
    
    async function handleTransaction(type: 'buy' | 'sell') {
        if (!user || !portfolio) {
            toast.error('Please log in');
            return;
        }
        
        if (!symbol) {
            toast.error('Please select a stock symbol');
            return;
        }
        
        if (!stockPrice) {
            toast.error('Stock price information not available');
            return;
        }
        
        const numShares = parseInt(shares);
        if (isNaN(numShares) || numShares <= 0) {
            toast.error('Please enter a valid number of shares');
            return;
        }
        
        if (type === 'sell') {
            const holding = currentHoldings.find(h => h.symbol === symbol);
            if (!holding || holding.num_shares < numShares) {
                toast.error(`You don't own enough shares of ${symbol}`);
                return;
            }
        }
        
        const portfolioBalance = Number(portfolio.balance);
        const totalCost = numShares * stockPrice.close;
        if (type === 'buy' && totalCost > portfolioBalance) {
            toast.error(`Insufficient funds. Cost: $${totalCost.toFixed(2)}, Balance: $${portfolioBalance.toFixed(2)}`);
            return;
        }
        
        setLoading(true);
        try {
            const res = await fetch('http://localhost:8000/portfolios/stock-transaction', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    portfolio_id: portfolio.portfolio_id,
                    user_id: user.user_id,
                    symbol: symbol,
                    transaction_type: type,
                    num_shares: numShares,
                    price_per_share: stockPrice.close
                })
            });
            
            const data = await res.json();
            
            if (res.ok) {
                toast.success(`Successfully ${type === 'buy' ? 'bought' : 'sold'} ${numShares} shares of ${symbol}`);
                setShares('');
                fetchPortfolioData();
                fetchCurrentHoldings();
            } else {
                toast.error(data.error || 'Transaction failed');
            }
        } catch (error) {
            toast.error('Error processing transaction');
            console.error(error);
        } finally {
            setLoading(false);
        }
    }

    // Navigate to stock view page with pre-selected symbol
    const viewStockHistory = (symbol: string) => {
        router.push(`/stocks/view?symbol=${symbol}`);
    };

    if (!portfolio) {
        return <div className="p-6">Loading portfolio information...</div>;
    }

    const portfolioBalance = Number(portfolio.balance);

    return (
        <div className="p-6">
            <Button
                variant="outline"
                onClick={() => router.push(`/portfolios/${id}/stocks`)}
                className="mb-4"
            >
                <ArrowLeft className="h-4 w-4 mr-2" /> Back to Holdings
            </Button>

            <h1 className="text-3xl font-bold mb-6">
                Trade Stocks - {portfolio.name}
            </h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-muted-foreground">Available Cash</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl">${portfolioBalance.toFixed(2)}</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Trade Stocks</CardTitle>
                        <CardDescription>Buy or sell stocks in your portfolio</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Tabs defaultValue="buy" onValueChange={(v) => setTransactionType(v as 'buy' | 'sell')}>
                            <TabsList className="grid w-full grid-cols-2 mb-6">
                                <TabsTrigger value="buy">Buy Shares</TabsTrigger>
                                <TabsTrigger value="sell">Sell Shares</TabsTrigger>
                            </TabsList>

                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Stock Symbol</label>
                                    <div className="relative">
                                        <Input
                                            value={symbol}
                                            onChange={(e) => {
                                                const value = e.target.value.toUpperCase();
                                                setSymbol(value);
                                                setSymbolSearch(value);
                                            }}
                                            placeholder="Enter symbol (e.g., AAPL)"
                                        />
                                        {availableSymbols.length > 0 && symbolSearch && (
                                            <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-md shadow-lg max-h-60 overflow-auto">
                                                {availableSymbols.map((s) => (
                                                    <div
                                                        key={s}
                                                        className="px-4 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                                                        onClick={() => {
                                                            setSymbol(s);
                                                            setSymbolSearch('');
                                                        }}
                                                    >
                                                        {s}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {priceLoading ? (
                                    <div className="text-center py-3">Loading price data...</div>
                                ) : stockPrice ? (
                                    <div className="bg-muted rounded-lg p-4 space-y-2">
                                        <div className="flex justify-between items-center">
                                            <span className="font-medium text-sm text-muted-foreground">Current Price:</span>
                                            <span className="font-semibold text-xl">${stockPrice.close.toFixed(2)}</span>
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            Last updated: {new Date(stockPrice.timestamp).toLocaleDateString()}
                                        </div>
                                    </div>
                                ) : symbol ? (
                                    <div className="bg-muted/30 rounded-lg p-4 text-center text-muted-foreground">
                                        No price data available for {symbol}
                                    </div>
                                ) : null}

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Number of Shares</label>
                                    <Input
                                        type="number"
                                        value={shares}
                                        onChange={(e) => setShares(e.target.value)}
                                        min="1"
                                        step="1"
                                        placeholder="Enter quantity"
                                    />
                                </div>

                                {stockPrice && shares && !isNaN(parseInt(shares)) && parseInt(shares) > 0 && (
                                    <div className="bg-muted rounded-lg p-4 space-y-3">
                                        <h4 className="font-medium">Order Summary</h4>
                                        <div className="grid grid-cols-2 text-sm gap-2">
                                            <span className="text-muted-foreground">Symbol:</span>
                                            <span>{symbol}</span>

                                            <span className="text-muted-foreground">Price per Share:</span>
                                            <span>${stockPrice.close.toFixed(2)}</span>

                                            <span className="text-muted-foreground">Shares:</span>
                                            <span>{parseInt(shares)}</span>

                                            <span className="text-muted-foreground">Total Value:</span>
                                            <span className="font-bold">${(stockPrice.close * parseInt(shares)).toFixed(2)}</span>
                                        </div>
                                    </div>
                                )}

                                {transactionType === 'buy' ? (
                                    <Button 
                                        onClick={() => handleTransaction('buy')} 
                                        className="w-full"
                                        variant="default"
                                        disabled={loading || !stockPrice || !shares || isNaN(parseInt(shares)) || parseInt(shares) <= 0}
                                    >
                                        {loading ? 'Buying...' : 'Buy Shares'}
                                    </Button>
                                ) : (
                                    <Button 
                                        onClick={() => handleTransaction('sell')} 
                                        className="w-full"
                                        variant="destructive"
                                        disabled={loading || !stockPrice || !shares || isNaN(parseInt(shares)) || parseInt(shares) <= 0}
                                    >
                                        {loading ? 'Selling...' : 'Sell Shares'}
                                    </Button>
                                )}
                            </div>
                        </Tabs>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Your Current Holdings</CardTitle>
                        <CardDescription>Stocks you currently own in this portfolio</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {currentHoldings.length > 0 ? (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Symbol</TableHead>
                                        <TableHead>Shares</TableHead>
                                        <TableHead className="text-right">Current Price</TableHead>
                                        <TableHead className="text-right">Value</TableHead>
                                        <TableHead className="w-[50px]">History</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {currentHoldings.map((holding) => (
                                        <TableRow 
                                            key={holding.symbol}
                                            className="cursor-pointer"
                                            onClick={() => {
                                                setSymbol(holding.symbol);
                                                setSymbolSearch('');
                                            }}
                                        >
                                            <TableCell className="font-medium">
                                                <Button 
                                                    variant="link" 
                                                    className="p-0 h-auto font-medium text-blue-600 dark:text-blue-400"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        viewStockHistory(holding.symbol);
                                                    }}
                                                >
                                                    {holding.symbol}
                                                </Button>
                                            </TableCell>
                                            <TableCell>{holding.num_shares}</TableCell>
                                            <TableCell className="text-right">
                                                ${holding.current_price ? Number(holding.current_price).toFixed(2) : 'N/A'}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                ${holding.total_value ? Number(holding.total_value).toFixed(2) : 'N/A'}
                                            </TableCell>
                                            <TableCell>
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        viewStockHistory(holding.symbol);
                                                    }}
                                                    title="View Historical Performance"
                                                >
                                                    <BarChart className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        ) : (
                            <div className="text-center py-6 text-muted-foreground">
                                You don&apos;t own any stocks in this portfolio yet.
                            </div>
                        )}

                        {currentHoldings.length > 0 && (
                            <div className="mt-6 pt-4 border-t">
                                <div className="flex justify-between items-center">
                                    <span className="font-medium">Total Stock Value:</span>
                                    <span className="font-bold text-lg">
                                        ${currentHoldings.reduce((total, holding) => 
                                            total + (holding.total_value || 0), 0).toFixed(2)}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center mt-2">
                                    <span className="font-medium">Cash Balance:</span>
                                    <span className="font-bold text-lg">
                                        ${portfolio?.balance ? Number(portfolio.balance).toFixed(2) : '0.00'}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center mt-2 pt-2 border-t">
                                    <span className="font-medium">Total Portfolio Value:</span>
                                    <span className="font-bold text-lg text-green-600 dark:text-green-400">
                                        ${(currentHoldings.reduce((total, holding) => 
                                            total + (holding.total_value || 0), 0) + 
                                            (portfolio?.balance || 0)).toFixed(2)}
                                    </span>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
