'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useEffect, useState, useCallback, Suspense } from 'react';
import { toast } from 'sonner';
import { useSearchParams } from 'next/navigation';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
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

interface PredictedPrice {
    timestamp: string;
    predicted_close: number;
    symbol: string;
}

type TimeInterval = 'week' | 'month' | 'quarter' | 'year' | '5years';
type PredictionInterval = '7' | '30' | '90' | '180' | '365';
type ViewMode = 'historical' | 'prediction';

// Inner component that uses useSearchParams
function StockViewContent() {
    const formatIntervalLabel = (interval: TimeInterval): string => {
        switch (interval) {
            case 'week':
                return '1 Week';
            case 'month':
                return '1 Month';
            case 'quarter':
                return '3 Months';
            case 'year':
                return '1 Year';
            case '5years':
                return '5 Years';
            default:
                return interval;
        }
    };

    const formatPredictionLabel = (days: PredictionInterval): string => {
        switch (days) {
            case '7':
                return '1 Week';
            case '30':
                return '1 Month';
            case '90':
                return '3 Months';
            case '180':
                return '6 Months';
            case '365':
                return '1 Year';
            default:
                return `${days} Days`;
        }
    };

    const [symbol, setSymbol] = useState('');
    const [selectedInterval, setSelectedInterval] =
        useState<TimeInterval>('month');
    const [predictionDays, setPredictionDays] =
        useState<PredictionInterval>('30');
    const [stockData, setStockData] = useState<StockPrice[]>([]);
    const [predictionData, setPredictionData] = useState<PredictedPrice[]>([]);
    const [loading, setLoading] = useState(false);
    const [availableSymbols, setAvailableSymbols] = useState<string[]>([]);
    const [symbolSearch, setSymbolSearch] = useState('');
    const [viewMode, setViewMode] = useState<ViewMode>('historical');

    const searchParams = useSearchParams();

    // Check for symbol in URL params (for direct linking)
    useEffect(() => {
        const symbolFromUrl = searchParams?.get('symbol');
        if (symbolFromUrl && !symbol) {
            setSymbol(symbolFromUrl);
        }
    }, [searchParams, symbol]);

    // Fixed date bounds for stock data
    const MIN_DATE = '2013-02-08'; // Lower bound date
    const MAX_DATE = '2018-02-07'; // Upper bound date

    // Calculate start date based on selected interval within bounds
    const calculateStartDate = (interval: TimeInterval): string => {
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
                startDate.setMonth(endDate.getMonth() - 1);
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
                const sortedData = [...data.stocks].sort(
                    (a, b) =>
                        new Date(a.timestamp).getTime() -
                        new Date(b.timestamp).getTime()
                );
                setStockData(sortedData);
                toast.success(
                    `Loaded ${sortedData.length} data points for ${symbol}`
                );
            }
        } catch (error) {
            console.error('Error fetching stock data:', error);
            toast.error('Failed to load stock data');
            setStockData([]);
        } finally {
            setLoading(false);
        }
    }, [symbol, selectedInterval, MAX_DATE]);

    // Fetch prediction data for the selected symbol
    const fetchPredictionData = useCallback(async () => {
        if (!symbol) {
            toast.error('Please select a stock symbol');
            return;
        }

        setLoading(true);
        try {
            const url = `http://localhost:8000/stocks/predict/${symbol}?days=${predictionDays}`;

            const res = await fetch(url);
            if (!res.ok) {
                throw new Error('Failed to fetch prediction data');
            }

            const data = await res.json();
            if (!data.predictions || data.predictions.length === 0) {
                toast.info('No prediction data could be generated');
                setPredictionData([]);
            } else {
                setPredictionData(data.predictions);
                toast.success(
                    `Generated ${data.predictions.length} predictions for ${symbol}`
                );
            }
        } catch (error) {
            console.error('Error fetching prediction data:', error);
            toast.error('Failed to generate predictions');
            setPredictionData([]);
        } finally {
            setLoading(false);
        }
    }, [symbol, predictionDays]);

    // When symbol or interval changes, fetch appropriate data
    useEffect(() => {
        if (symbol) {
            if (viewMode === 'historical') {
                fetchStockData();
            } else {
                fetchPredictionData();
            }
        }
    }, [
        symbol,
        selectedInterval,
        predictionDays,
        viewMode,
        fetchStockData,
        fetchPredictionData,
    ]);

    // When view mode changes, fetch the appropriate data
    useEffect(() => {
        if (symbol) {
            if (viewMode === 'historical') {
                fetchStockData();
            } else {
                fetchPredictionData();
            }
        }
    }, [viewMode, symbol, fetchStockData, fetchPredictionData]);

    // Chart data preparation for historical view
    const historicalChartData = {
        labels: stockData.map((item) =>
            new Date(item.timestamp).toLocaleDateString()
        ),
        datasets: [
            {
                label: `${symbol} Close Price`,
                data: stockData.map((item) => item.close),
                borderColor: 'rgb(75, 192, 192)',
                backgroundColor: 'rgba(75, 192, 192, 0.5)',
                tension: 0.1,
            },
        ],
    };

    // Chart data preparation for prediction view
    const predictionChartData = {
        labels: predictionData.map((item) =>
            new Date(item.timestamp).toLocaleDateString()
        ),
        datasets: [
            {
                label: `${symbol} Predicted Price`,
                data: predictionData.map((item) => item.predicted_close),
                borderColor: 'rgb(255, 99, 132)',
                backgroundColor: 'rgba(255, 99, 132, 0.5)',
                tension: 0.1,
            },
        ],
    };

    // Historical chart options
    const historicalChartOptions = {
        responsive: true,
        plugins: {
            legend: {
                position: 'top' as const,
            },
            title: {
                display: true,
                text: `${symbol || 'Stock'} Price History (${formatIntervalLabel(selectedInterval)}) - Historical Data`,
            },
        },
        scales: {
            y: {
                beginAtZero: false,
                title: {
                    display: true,
                    text: 'Price ($)',
                },
            },
            x: {
                title: {
                    display: true,
                    text: 'Date',
                },
            },
        },
    };

    // Prediction chart options
    const predictionChartOptions = {
        responsive: true,
        plugins: {
            legend: {
                position: 'top' as const,
            },
            title: {
                display: true,
                text: `${symbol || 'Stock'} Price Prediction (${formatPredictionLabel(predictionDays)}) - A-Priori Optimization`,
            },
        },
        scales: {
            y: {
                beginAtZero: false,
                title: {
                    display: true,
                    text: 'Predicted Price ($)',
                },
            },
            x: {
                title: {
                    display: true,
                    text: 'Date',
                },
            },
        },
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl">
                        Stock Price Analysis
                    </CardTitle>
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
                                        const value =
                                            e.target.value.toUpperCase();
                                        setSymbol(value);
                                        setSymbolSearch(value);
                                    }}
                                />
                                {availableSymbols.length > 0 &&
                                    symbolSearch && (
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

                        <Tabs
                            defaultValue="historical"
                            onValueChange={(v) => setViewMode(v as ViewMode)}
                            className="w-full"
                        >
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="historical">
                                    Historical Data
                                </TabsTrigger>
                                <TabsTrigger value="prediction">
                                    Price Prediction
                                </TabsTrigger>
                            </TabsList>
                            <TabsContent value="historical" className="mt-4">
                                <div className="space-y-2">
                                    <Label>Time Interval</Label>
                                    <div className="flex flex-wrap gap-2">
                                        {(
                                            [
                                                'week',
                                                'month',
                                                'quarter',
                                                'year',
                                                '5years',
                                            ] as TimeInterval[]
                                        ).map((interval) => (
                                            <Button
                                                key={interval}
                                                type="button"
                                                variant={
                                                    selectedInterval ===
                                                    interval
                                                        ? 'default'
                                                        : 'outline'
                                                }
                                                onClick={() =>
                                                    setSelectedInterval(
                                                        interval
                                                    )
                                                }
                                            >
                                                {formatIntervalLabel(interval)}
                                            </Button>
                                        ))}
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-2">
                                        Historical data available from{' '}
                                        {MIN_DATE} to {MAX_DATE}
                                    </p>
                                </div>
                            </TabsContent>
                            <TabsContent value="prediction" className="mt-4">
                                <div className="space-y-2">
                                    <Label>Prediction Period</Label>
                                    <div className="flex flex-wrap gap-2">
                                        {(
                                            [
                                                '7',
                                                '30',
                                                '90',
                                                '180',
                                                '365',
                                            ] as PredictionInterval[]
                                        ).map((days) => (
                                            <Button
                                                key={days}
                                                type="button"
                                                variant={
                                                    predictionDays === days
                                                        ? 'default'
                                                        : 'outline'
                                                }
                                                onClick={() =>
                                                    setPredictionDays(days)
                                                }
                                            >
                                                {formatPredictionLabel(days)}
                                            </Button>
                                        ))}
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-2">
                                        Predictions are made using A-Priori
                                        Optimization based on historical
                                        patterns
                                    </p>
                                </div>
                            </TabsContent>
                        </Tabs>
                    </div>
                </CardContent>
            </Card>

            {loading ? (
                <Card>
                    <CardContent className="flex justify-center items-center py-20">
                        <div className="animate-pulse text-lg">
                            Loading data...
                        </div>
                    </CardContent>
                </Card>
            ) : symbol &&
              (viewMode === 'historical'
                  ? stockData.length > 0
                  : predictionData.length > 0) ? (
                <>
                    <Card>
                        <CardContent className="pt-6">
                            <div className="h-[400px]">
                                {viewMode === 'historical' ? (
                                    <Line
                                        data={historicalChartData}
                                        options={historicalChartOptions}
                                    />
                                ) : (
                                    <Line
                                        data={predictionChartData}
                                        options={predictionChartOptions}
                                    />
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">
                                {viewMode === 'historical'
                                    ? 'Statistical Summary'
                                    : 'Prediction Summary'}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {viewMode === 'historical' ? (
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="space-y-1">
                                        <p className="text-sm text-muted-foreground">
                                            Starting Price
                                        </p>
                                        <p className="font-medium">
                                            ${stockData[0]?.close.toFixed(2)}
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm text-muted-foreground">
                                            Ending Price
                                        </p>
                                        <p className="font-medium">
                                            $
                                            {stockData[
                                                stockData.length - 1
                                            ]?.close.toFixed(2)}
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm text-muted-foreground">
                                            Highest Price
                                        </p>
                                        <p className="font-medium">
                                            $
                                            {Math.max(
                                                ...stockData.map((d) => d.close)
                                            ).toFixed(2)}
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm text-muted-foreground">
                                            Lowest Price
                                        </p>
                                        <p className="font-medium">
                                            $
                                            {Math.min(
                                                ...stockData.map((d) => d.close)
                                            ).toFixed(2)}
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="space-y-1">
                                        <p className="text-sm text-muted-foreground">
                                            Starting Prediction
                                        </p>
                                        <p className="font-medium">
                                            $
                                            {predictionData[0]?.predicted_close.toFixed(
                                                2
                                            )}
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm text-muted-foreground">
                                            Final Prediction
                                        </p>
                                        <p className="font-medium">
                                            $
                                            {predictionData[
                                                predictionData.length - 1
                                            ]?.predicted_close.toFixed(2)}
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm text-muted-foreground">
                                            Highest Prediction
                                        </p>
                                        <p className="font-medium">
                                            $
                                            {Math.max(
                                                ...predictionData.map(
                                                    (d) => d.predicted_close
                                                )
                                            ).toFixed(2)}
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm text-muted-foreground">
                                            Lowest Prediction
                                        </p>
                                        <p className="font-medium">
                                            $
                                            {Math.min(
                                                ...predictionData.map(
                                                    (d) => d.predicted_close
                                                )
                                            ).toFixed(2)}
                                        </p>
                                    </div>
                                </div>
                            )}
                            {viewMode === 'prediction' && (
                                <div className="mt-4 p-3 bg-muted rounded-md">
                                    <p className="text-sm">
                                        <strong>Note:</strong> These predictions
                                        are generated using A-Priori
                                        Optimization, which analyzes historical
                                        patterns to forecast future prices.
                                        Actual market performance may vary due
                                        to unforeseen events and market
                                        conditions.
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </>
            ) : symbol ? (
                <Card>
                    <CardContent className="py-10 text-center">
                        <p className="text-muted-foreground">
                            No{' '}
                            {viewMode === 'historical'
                                ? 'historical data'
                                : 'prediction data'}{' '}
                            available for {symbol} in the selected time period.
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <Card>
                    <CardContent className="py-10 text-center">
                        <p className="text-muted-foreground">
                            Please select a stock symbol to view its data.
                        </p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

// Main component that wraps the inner component with Suspense
export default function StocksHistory() {
    return (
        <Suspense
            fallback={
                <div className="flex items-center justify-center py-10">
                    <div className="animate-pulse space-y-4 w-full max-w-4xl">
                        <div className="h-10 bg-muted rounded-md w-3/4"></div>
                        <div className="h-6 bg-muted rounded-md w-1/2"></div>
                        <div className="h-[400px] bg-muted rounded-md w-full"></div>
                    </div>
                </div>
            }
        >
            <StockViewContent />
        </Suspense>
    );
}
