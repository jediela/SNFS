'use client';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import {
    Table,
    TableHeader,
    TableRow,
    TableHead,
    TableBody,
    TableCell,
} from '@/components/ui/table';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from '@/components/ui/card';
import { BarChart, AlertCircle, LineChart } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip as ChartTooltip,
    Legend,
} from 'chart.js';

// Register ChartJS components
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    ChartTooltip,
    Legend
);

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

interface StockTransaction {
    transaction_id: number;
    symbol: string;
    company_name: string;
    type: 'buy' | 'sell';
    num_shares: number;
    price: number;
    timestamp: string;
}

interface HoldingData {
    symbol: string;
    num_shares: number | string;
    company_name: string;
    current_price: number | string | null;
    total_value: number | string | null;
}

interface TransactionData {
    transaction_id: number;
    symbol: string;
    company_name: string;
    type: 'buy' | 'sell';
    num_shares: number | string;
    price: number | string;
    timestamp: string;
}

interface PortfolioStatistics {
    portfolio_id: number;
    date_range: {
        start_date: string;
        end_date: string;
    };
    stock_statistics: {
        symbol: string;
        mean_return: number;
        stddev_return: number;
        coefficient_of_variation: number;
        days: number;
        beta: number;
    }[];
    portfolio_beta: number;
    correlation_matrix: {
        symbol: string;
        correlations: {
            [key: string]: number;
        };
    }[];
}

export default function ViewStocks() {
    const router = useRouter();
    const { id } = useParams();
    const [loading, setLoading] = useState(true);
    const [statsLoading, setStatsLoading] = useState(false);
    const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
    const [holdings, setHoldings] = useState<StockHolding[]>([]);
    const [transactions, setTransactions] = useState<StockTransaction[]>([]);
    const [statistics, setStatistics] = useState<PortfolioStatistics | null>(
        null
    );
    const [activeTab, setActiveTab] = useState('holdings');
    const [dateRange] = useState({
        start_date: '',
        end_date: '',
    });
    const [user, setUser] = useState<{
        user_id: number;
        username: string;
    } | null>(null);

    const fetchPortfolioData = useCallback(async () => {
        if (!id || !user) return;
        setLoading(true);
        try {
            // Get portfolio basic info
            const portfolioRes = await fetch(
                `http://localhost:8000/portfolios/${id}?userId=${user.user_id}`,
                { method: 'GET' }
            );
            const portfolioData = await portfolioRes.json();

            // Make sure balance is a number
            if (portfolioData.portfolio) {
                portfolioData.portfolio.balance = Number(
                    portfolioData.portfolio.balance
                );
            }

            setPortfolio(portfolioData.portfolio);

            // Get portfolio holdings
            const holdingsRes = await fetch(
                `http://localhost:8000/portfolios/${id}/holdings?user_id=${user.user_id}`,
                { method: 'GET' }
            );
            const holdingsData = await holdingsRes.json();
            if (holdingsRes.ok && holdingsData.holdings) {
                // Ensure all numeric values are actually numbers
                const parsedHoldings = holdingsData.holdings.map(
                    (holding: HoldingData) => ({
                        ...holding,
                        num_shares: Number(holding.num_shares),
                        current_price: holding.current_price
                            ? Number(holding.current_price)
                            : null,
                        total_value: holding.total_value
                            ? Number(holding.total_value)
                            : null,
                    })
                );
                setHoldings(parsedHoldings);
            }

            // Get stock transactions
            const transactionsRes = await fetch(
                `http://localhost:8000/portfolios/${id}/stock-transactions?user_id=${user.user_id}`,
                { method: 'GET' }
            );
            const transactionsData = await transactionsRes.json();
            if (transactionsRes.ok && transactionsData.transactions) {
                // Ensure all numeric values are actually numbers
                const parsedTransactions = transactionsData.transactions.map(
                    (txn: TransactionData) => ({
                        ...txn,
                        num_shares: Number(txn.num_shares),
                        price: Number(txn.price),
                    })
                );
                setTransactions(parsedTransactions);
            }
        } catch (error) {
            toast.error('Failed to fetch data');
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, [id, user]);

    // Fetch portfolio statistics
    const fetchPortfolioStatistics = useCallback(async () => {
        if (!id || !user || holdings.length === 0) return;

        setStatsLoading(true);
        try {
            let url = `http://localhost:8000/portfolios/${id}/statistics?user_id=${user.user_id}`;

            if (dateRange.start_date) {
                url += `&start_date=${dateRange.start_date}`;
            }

            if (dateRange.end_date) {
                url += `&end_date=${dateRange.end_date}`;
            }

            const res = await fetch(url);
            const data = await res.json();

            if (res.ok) {
                setStatistics(data);
            } else {
                toast.error(
                    data.error || 'Failed to load portfolio statistics'
                );
                setStatistics(null);
            }
        } catch (error) {
            console.error('Error fetching portfolio statistics:', error);
            toast.error('Error loading statistics');
            setStatistics(null);
        } finally {
            setStatsLoading(false);
        }
    }, [id, user, holdings, dateRange]);

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) setUser(JSON.parse(storedUser));
    }, []);

    useEffect(() => {
        if (user) fetchPortfolioData();
    }, [user, fetchPortfolioData]);

    useEffect(() => {
        if (activeTab === 'statistics') {
            fetchPortfolioStatistics();
        }
    }, [activeTab, fetchPortfolioStatistics]);

    const calculateTotalValue = () => {
        return holdings.reduce(
            (total, holding) => total + (holding.total_value || 0),
            0
        );
    };

    // Navigate to stock view page with pre-selected symbol
    const viewStockHistory = (symbol: string) => {
        router.push(`/stocks/view?symbol=${symbol}`);
    };

    // Navigate to stock predictions page with pre-selected symbol
    const viewStockPredictions = (symbol: string) => {
        router.push(`/stocks/view?symbol=${symbol}&tab=prediction`);
    };

    // Format a correlation value with color coding
    const formatCorrelation = (value: number) => {
        let color = 'text-gray-600';
        if (value > 0.7) color = 'text-red-600';
        else if (value > 0.3) color = 'text-orange-600';
        else if (value < -0.7) color = 'text-green-600';
        else if (value < -0.3) color = 'text-blue-600';

        return <span className={color}>{value.toFixed(2)}</span>;
    };

    // Format a beta value with color coding
    const formatBeta = (value: number) => {
        let color = 'text-gray-600';
        if (value > 1.5) color = 'text-red-600';
        else if (value > 1.2) color = 'text-orange-600';
        else if (value < 0) color = 'text-green-600';
        else if (value < 0.8) color = 'text-blue-600';

        return <span className={color}>{value.toFixed(2)}</span>;
    };

    // Format COV with color coding
    const formatCOV = (value: number | null) => {
        if (value === null) return 'N/A';

        let color = 'text-gray-600';
        if (value > 5) color = 'text-red-600';
        else if (value > 3) color = 'text-orange-600';
        else if (value < 1) color = 'text-blue-600';

        return <span className={color}>{value.toFixed(2)}</span>;
    };

    if (loading) {
        return (
            <div className="p-6 space-y-4">
                <Skeleton className="h-8 w-[200px]" />
                <div className="space-y-2">
                    <Skeleton className="h-4 w-[250px]" />
                    <Skeleton className="h-4 w-[200px]" />
                </div>
                <Skeleton className="h-[300px] w-full" />
            </div>
        );
    }

    const portfolioBalance = portfolio?.balance ? Number(portfolio.balance) : 0;
    const totalStockValue = calculateTotalValue();

    return (
        <div className="p-6">
            <Button
                variant="outline"
                onClick={() => router.push('/portfolios/view')}
                className="mb-4"
            >
                ← Back to Portfolios
            </Button>
            <div className="mb-6">
                <h1 className="text-3xl font-bold">
                    {portfolio?.name} - Stock Holdings
                </h1>
                <span className="inline-block text-sm text-muted-foreground bg-gray-100 px-2 py-0.5 rounded mt-1">
                    ID: {portfolio?.portfolio_id}
                </span>
            </div>

            {/* Portfolio Summary - Modified to remove Beta card */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-muted-foreground">
                            Cash Balance
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl">
                            ${portfolioBalance.toFixed(2)}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-muted-foreground">
                            Stock Value
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl">
                            ${totalStockValue.toFixed(2)}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-muted-foreground">
                            Total Value
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl">
                            ${(portfolioBalance + totalStockValue).toFixed(2)}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Trade Button */}
            <div className="flex justify-end mb-6">
                <Button
                    onClick={() =>
                        router.push(`/portfolios/${id}/stocks/trade`)
                    }
                >
                    Buy/Sell Stocks
                </Button>
            </div>

            {/* Tabs for different views */}
            <Tabs
                defaultValue="holdings"
                value={activeTab}
                onValueChange={setActiveTab}
                className="space-y-6"
            >
                <TabsList className="grid grid-cols-2 mb-4">
                    <TabsTrigger value="holdings">Holdings</TabsTrigger>
                    <TabsTrigger value="statistics">Statistics</TabsTrigger>
                </TabsList>

                {/* Holdings Tab */}
                <TabsContent value="holdings" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Stock Holdings</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {holdings.length > 0 ? (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Symbol</TableHead>
                                            <TableHead className="text-right">
                                                Shares
                                            </TableHead>
                                            <TableHead className="text-right">
                                                Price
                                            </TableHead>
                                            <TableHead className="text-right">
                                                Value
                                            </TableHead>
                                            <TableHead className="w-[50px]">
                                                History
                                            </TableHead>
                                            <TableHead className="w-[50px]">
                                                Predict
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {holdings.map((holding, index) => (
                                            <TableRow key={index}>
                                                <TableCell className="font-medium">
                                                    <Button
                                                        variant="link"
                                                        className="p-0 h-auto font-medium text-blue-600 dark:text-blue-400"
                                                        onClick={() =>
                                                            viewStockHistory(
                                                                holding.symbol
                                                            )
                                                        }
                                                    >
                                                        {holding.symbol}
                                                    </Button>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {holding.num_shares}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    $
                                                    {holding.current_price
                                                        ? Number(
                                                              holding.current_price
                                                          ).toFixed(2)
                                                        : 'N/A'}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    $
                                                    {holding.total_value
                                                        ? Number(
                                                              holding.total_value
                                                          ).toFixed(2)
                                                        : 'N/A'}
                                                </TableCell>
                                                <TableCell>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() =>
                                                            viewStockHistory(
                                                                holding.symbol
                                                            )
                                                        }
                                                        title="View Historical Performance"
                                                    >
                                                        <BarChart className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                                <TableCell>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() =>
                                                            viewStockPredictions(
                                                                holding.symbol
                                                            )
                                                        }
                                                        title="View Price Predictions"
                                                    >
                                                        <LineChart className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            ) : (
                                <div className="text-center py-6 text-muted-foreground">
                                    No stock holdings found. Buy some stocks to
                                    get started!
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Transactions Table */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Recent Stock Transactions</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {transactions.length > 0 ? (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Type</TableHead>
                                            <TableHead>Symbol</TableHead>
                                            <TableHead className="text-right">
                                                Shares
                                            </TableHead>
                                            <TableHead className="text-right">
                                                Price
                                            </TableHead>
                                            <TableHead className="text-right">
                                                Total
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {transactions.map((transaction) => (
                                            <TableRow
                                                key={transaction.transaction_id}
                                            >
                                                <TableCell>
                                                    {new Date(
                                                        transaction.timestamp
                                                    ).toLocaleDateString()}
                                                </TableCell>
                                                <TableCell
                                                    className={
                                                        transaction.type ===
                                                        'buy'
                                                            ? 'text-blue-600'
                                                            : 'text-green-600'
                                                    }
                                                >
                                                    {transaction.type.toUpperCase()}
                                                </TableCell>
                                                <TableCell>
                                                    {transaction.symbol}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {transaction.num_shares}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    $
                                                    {Number(
                                                        transaction.price
                                                    ).toFixed(2)}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    $
                                                    {(
                                                        Number(
                                                            transaction.num_shares
                                                        ) *
                                                        Number(
                                                            transaction.price
                                                        )
                                                    ).toFixed(2)}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            ) : (
                                <div className="text-center py-6 text-muted-foreground">
                                    No transactions found.
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Statistics Tab */}
                <TabsContent value="statistics" className="space-y-6">
                    {statsLoading ? (
                        <Card>
                            <CardContent className="py-10 text-center">
                                <p className="text-muted-foreground">
                                    Loading portfolio statistics...
                                </p>
                            </CardContent>
                        </Card>
                    ) : statistics ? (
                        <>
                            <Card>
                                <CardHeader>
                                    <CardTitle>Stock Risk Metrics</CardTitle>
                                    <CardDescription>
                                        Statistical indicators for each stock in
                                        your portfolio
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Symbol</TableHead>
                                                <TableHead className="text-right">
                                                    Beta (β)
                                                </TableHead>
                                                <TableHead className="text-right">
                                                    CoV
                                                </TableHead>
                                                <TableHead className="text-right">
                                                    Mean Return
                                                </TableHead>
                                                <TableHead className="text-right">
                                                    Volatility
                                                </TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {statistics.stock_statistics.map(
                                                (stat) => (
                                                    <TableRow key={stat.symbol}>
                                                        <TableCell className="font-medium">
                                                            {stat.symbol}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            {formatBeta(
                                                                stat.beta
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            {formatCOV(
                                                                stat.coefficient_of_variation
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            {(
                                                                stat.mean_return *
                                                                100
                                                            ).toFixed(2)}
                                                            %
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            {(
                                                                stat.stddev_return *
                                                                100
                                                            ).toFixed(2)}
                                                            %
                                                        </TableCell>
                                                    </TableRow>
                                                )
                                            )}
                                        </TableBody>
                                    </Table>

                                    <div className="flex items-center gap-2 mt-4 text-sm text-muted-foreground">
                                        <AlertCircle size={14} />
                                        <p>
                                            Based on data from{' '}
                                            {statistics.date_range.start_date}{' '}
                                            to {statistics.date_range.end_date}
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle>
                                        Stock Correlation Matrix
                                    </CardTitle>
                                    <CardDescription>
                                        How the stocks in your portfolio move in
                                        relation to each other
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Symbol</TableHead>
                                                {statistics
                                                    .correlation_matrix[0]
                                                    ?.correlations &&
                                                    Object.keys(
                                                        statistics
                                                            .correlation_matrix[0]
                                                            .correlations
                                                    ).map((symbol) => (
                                                        <TableHead
                                                            key={symbol}
                                                            className="text-right"
                                                        >
                                                            {symbol}
                                                        </TableHead>
                                                    ))}
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {statistics.correlation_matrix.map(
                                                (row) => (
                                                    <TableRow key={row.symbol}>
                                                        <TableCell className="font-medium">
                                                            {row.symbol}
                                                        </TableCell>
                                                        {Object.entries(
                                                            row.correlations
                                                        ).map(
                                                            ([
                                                                symbol,
                                                                value,
                                                            ]) => (
                                                                <TableCell
                                                                    key={symbol}
                                                                    className="text-right"
                                                                >
                                                                    {formatCorrelation(
                                                                        value
                                                                    )}
                                                                </TableCell>
                                                            )
                                                        )}
                                                    </TableRow>
                                                )
                                            )}
                                        </TableBody>
                                    </Table>

                                    <div className="mt-4 p-3 bg-muted rounded-md text-sm">
                                        <p className="font-medium mb-1">
                                            How to read this matrix:
                                        </p>
                                        <ul className="list-disc list-inside space-y-1">
                                            <li>
                                                <span className="text-red-600 font-medium">
                                                    Highly positive (0.7+)
                                                </span>
                                                : Stocks move strongly together
                                            </li>
                                            <li>
                                                <span className="text-orange-600 font-medium">
                                                    Moderately positive
                                                    (0.3-0.7)
                                                </span>
                                                : Stocks tend to move together
                                            </li>
                                            <li>
                                                <span className="text-gray-600 font-medium">
                                                    Low correlation (-0.3 to
                                                    0.3)
                                                </span>
                                                : Little relationship
                                            </li>
                                            <li>
                                                <span className="text-blue-600 font-medium">
                                                    Moderately negative (-0.3 to
                                                    -0.7)
                                                </span>
                                                : Stocks tend to move opposite
                                            </li>
                                            <li>
                                                <span className="text-green-600 font-medium">
                                                    Highly negative (below -0.7)
                                                </span>
                                                : Stocks move strongly opposite
                                            </li>
                                        </ul>
                                        <p className="mt-2 text-xs text-muted-foreground">
                                            Lower correlation between stocks
                                            helps reduce portfolio risk through
                                            diversification.
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        </>
                    ) : (
                        <Card>
                            <CardContent className="py-10 text-center">
                                <p className="text-muted-foreground">
                                    No statistics available. Please ensure you
                                    have stock holdings in this portfolio.
                                </p>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}
