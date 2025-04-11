'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { 
    Chart as ChartJS, 
    CategoryScale, 
    LinearScale, 
    PointElement, 
    LineElement, 
    Title, 
    Tooltip, 
    Legend 
} from 'chart.js';
import { Line } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
);

interface StockPrice {
    timestamp: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    symbol: string;
}

type TimeInterval = 'week' | 'month' | 'quarter' | 'year' | '5years';

export default function StocksHistory() {
    const [symbol, setSymbol] = useState('');
    const [selectedInterval, setSelectedInterval] = useState<TimeInterval>('month');
    const [stockData, setStockData] = useState<StockPrice[]>([]);
    const [loading, setLoading] = useState(false);
    const [availableSymbols, setAvailableSymbols] = useState<string[]>([]);
    const [symbolSearch, setSymbolSearch] = useState('');

    // Fixed date bounds for stock data
    const MIN_DATE = '2013-02-08'; // Lower bound date
    const MAX_DATE = '2018-02-07'; // Upper bound date

    // Calculate start date based on selected interval within bounds
    const calculateStartDate = (interval: TimeInterval): string => {
        // Use MAX_DATE as reference point instead of current date
        const endDate = new Date(MAX_DATE);
        const startDate = new Date(MAX_DATE);
        const minDate = new Date(MIN_DATE);
        
        switch (interval) {
            case 'week':
                startDate.setDate(endDate.getDate() - 7);
                break;
            case 'month':
                startDate.setMonth(endDate.getMonth() - 1);
                break;
            case 'quarter':
                startDate.setMonth(endDate.getMonth() - 3);
                break;
            case 'year':
                startDate.setFullYear(endDate.getFullYear() - 1);
                break;
            case '5years':
                // For 5 years, use the entire available range
                return MIN_DATE;
            default:
                startDate.setMonth(endDate.getMonth() - 1); // Default to month
        }
        
        // Ensure start date is not earlier than minDate
        if (startDate < minDate) {
            return MIN_DATE;
        }
        
        return startDate.toISOString().split('T')[0];
    };

    // Fetch available symbols for autocomplete
    useEffect(() => {
        async function fetchSymbols() {
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

        if (symbolSearch) {
            fetchSymbols();
        }
    }, [symbolSearch]);

    // Fetch stock data for the selected symbol and time interval
    const fetchStockData = useCallback(async () => {
        if (!symbol) {
            toast.error('Please select a stock symbol');
            return;
        }

        setLoading(true);
        try {
            const startDate = calculateStartDate(selectedInterval);
            
            const url = `http://localhost:8000/stocks/?symbol=${symbol}&start_date=${startDate}&end_date=${MAX_DATE}&per_page=1000`;
            
            const res = await fetch(url);
            if (!res.ok) {
                throw new Error('Failed to fetch stock data');
            }

            const data = await res.json();
            if (!data.stocks || data.stocks.length === 0) {
                toast.info('No stock data found for the specified criteria');
                setStockData([]);
            } else {
                // Sort by timestamp in ascending order for proper charting
                const sortedData = [...data.stocks].sort((a, b) => 
                    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
                );
                setStockData(sortedData);
                toast.success(`Loaded ${sortedData.length} data points for ${symbol}`);
            }
        } catch (error) {
            console.error('Error fetching stock data:', error);
            toast.error('Failed to load stock data');
            setStockData([]);
        } finally {
            setLoading(false);
        }
    }, [symbol, selectedInterval]);

    // When symbol or interval changes, fetch data
    useEffect(() => {
        if (symbol) {
            fetchStockData();
        }
    }, [symbol, selectedInterval, fetchStockData]);

    // Format interval label for display
    const formatIntervalLabel = (interval: TimeInterval): string => {
        switch (interval) {
            case 'week': return '1 Week';
            case 'month': return '1 Month';
            case 'quarter': return '3 Months';
            case 'year': return '1 Year';
            case '5years': return '5 Years';
            default: return interval;
        }
    };

    // Chart data preparation
    const chartData = {
        labels: stockData.map(item => new Date(item.timestamp).toLocaleDateString()),
        datasets: [
            {
                label: `${symbol} Close Price`,
                data: stockData.map(item => item.close),
                borderColor: 'rgb(75, 192, 192)',
                backgroundColor: 'rgba(75, 192, 192, 0.5)',
                tension: 0.1
            }
        ]
    };

    // Chart options
    const chartOptions = {
        responsive: true,
        plugins: {
            legend: {
                position: 'top' as const,
            },
            title: {
                display: true,
                text: `${symbol || 'Stock'} Price History (${formatIntervalLabel(selectedInterval)}) - Historical Data`
            },
        },
        scales: {
            y: {
                beginAtZero: false,
                title: {
                    display: true,
                    text: 'Price ($)'
                }
            },
            x: {
                title: {
                    display: true,
                    text: 'Date'
                }
            }
        }
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl">Stock Price History (2013-2018)</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="symbol">Stock Symbol</Label>
                            <div className="relative">
                                <Input
                                    id="symbol"
                                    placeholder="e.g., AAPL"
                                    value={symbol}
                                    onChange={(e) => {
                                        const value = e.target.value.toUpperCase();
                                        setSymbol(value);
                                        setSymbolSearch(value);
                                    }}
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

                        <div className="space-y-2">
                            <Label>Time Interval</Label>
                            <div className="flex flex-wrap gap-2">
                                {(['week', 'month', 'quarter', 'year', '5years'] as TimeInterval[]).map((interval) => (
                                    <Button
                                        key={interval}
                                        type="button"
                                        variant={selectedInterval === interval ? "default" : "outline"}
                                        onClick={() => setSelectedInterval(interval)}
                                    >
                                        {formatIntervalLabel(interval)}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {loading ? (
                <Card>
                    <CardContent className="flex justify-center items-center py-20">
                        <div className="animate-pulse text-lg">Loading chart data...</div>
                    </CardContent>
                </Card>
            ) : symbol && stockData.length > 0 ? (
                <>
                    <Card>
                        <CardContent className="pt-6">
                            <div className="h-[400px]">
                                <Line data={chartData} options={chartOptions} />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Statistical Summary</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="space-y-1">
                                    <p className="text-sm text-muted-foreground">Starting Price</p>
                                    <p className="font-medium">${stockData[0]?.close.toFixed(2)}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm text-muted-foreground">Current Price</p>
                                    <p className="font-medium">${stockData[stockData.length - 1]?.close.toFixed(2)}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm text-muted-foreground">Highest Price</p>
                                    <p className="font-medium">${Math.max(...stockData.map(d => d.close)).toFixed(2)}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm text-muted-foreground">Lowest Price</p>
                                    <p className="font-medium">${Math.min(...stockData.map(d => d.close)).toFixed(2)}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </>
            ) : symbol ? (
                <Card>
                    <CardContent className="py-10 text-center">
                        <p className="text-muted-foreground">No stock data available for {symbol} in the selected time period.</p>
                    </CardContent>
                </Card>
            ) : (
                <Card>
                    <CardContent className="py-10 text-center">
                        <p className="text-muted-foreground">Please select a stock symbol to view its price history.</p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
