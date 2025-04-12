'use client';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { 
    Table, TableHeader, TableRow, TableHead, 
    TableBody, TableCell 
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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

export default function ViewStocks() {
    const router = useRouter();
    const { id } = useParams();
    const [loading, setLoading] = useState(true);
    const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
    const [holdings, setHoldings] = useState<StockHolding[]>([]);
    const [transactions, setTransactions] = useState<StockTransaction[]>([]);
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
                portfolioData.portfolio.balance = Number(portfolioData.portfolio.balance);
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
                const parsedHoldings = holdingsData.holdings.map((holding: HoldingData) => ({
                    ...holding,
                    num_shares: Number(holding.num_shares),
                    current_price: holding.current_price ? Number(holding.current_price) : null,
                    total_value: holding.total_value ? Number(holding.total_value) : null
                }));
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
                const parsedTransactions = transactionsData.transactions.map((txn: TransactionData) => ({
                    ...txn,
                    num_shares: Number(txn.num_shares),
                    price: Number(txn.price)
                }));
                setTransactions(parsedTransactions);
            }
        } catch (error) {
            toast.error('Failed to fetch data');
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, [id, user]);

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) setUser(JSON.parse(storedUser));
    }, []);
    
    useEffect(() => {
        if (user) fetchPortfolioData();
    }, [user, fetchPortfolioData]);

    const calculateTotalValue = () => {
        return holdings.reduce((total, holding) => 
            total + (holding.total_value || 0), 0);
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
            <h1 className="text-3xl font-bold mb-6">
                {portfolio?.name} - Stock Holdings
            </h1>

            {/* Portfolio Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-muted-foreground">Cash Balance</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl">${portfolioBalance.toFixed(2)}</p>
                    </CardContent>
                </Card>
                
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-muted-foreground">Stock Value</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl">${totalStockValue.toFixed(2)}</p>
                    </CardContent>
                </Card>
                
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-muted-foreground">Total Value</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl">${(portfolioBalance + totalStockValue).toFixed(2)}</p>
                    </CardContent>
                </Card>
            </div>

            {/* Buy/Sell Button */}
            <div className="flex justify-end mb-6">
                <Button onClick={() => router.push(`/portfolios/${id}/stocks/trade`)}>
                    Buy/Sell Stocks
                </Button>
            </div>

            {/* Holdings Table */}
            <Card className="mb-8">
                <CardHeader>
                    <CardTitle>Stock Holdings</CardTitle>
                </CardHeader>
                <CardContent>
                    {holdings.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Symbol</TableHead>
                                    <TableHead className="text-right">Shares</TableHead>
                                    <TableHead className="text-right">Price</TableHead>
                                    <TableHead className="text-right">Value</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {holdings.map((holding, index) => (
                                    <TableRow key={index}>
                                        <TableCell className="font-medium">{holding.symbol}</TableCell>
                                        <TableCell className="text-right">{holding.num_shares}</TableCell>
                                        <TableCell className="text-right">${holding.current_price ? Number(holding.current_price).toFixed(2) : 'N/A'}</TableCell>
                                        <TableCell className="text-right">${holding.total_value ? Number(holding.total_value).toFixed(2) : 'N/A'}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <div className="text-center py-6 text-muted-foreground">
                            No stock holdings found. Buy some stocks to get started!
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
                                    <TableHead className="text-right">Shares</TableHead>
                                    <TableHead className="text-right">Price</TableHead>
                                    <TableHead className="text-right">Total</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {transactions.map((transaction) => (
                                    <TableRow key={transaction.transaction_id}>
                                        <TableCell>
                                            {new Date(transaction.timestamp).toLocaleDateString()}
                                        </TableCell>
                                        <TableCell className={
                                            transaction.type === 'buy' ? 'text-blue-600' : 'text-green-600'
                                        }>
                                            {transaction.type.toUpperCase()}
                                        </TableCell>
                                        <TableCell>{transaction.symbol}</TableCell>
                                        <TableCell className="text-right">{transaction.num_shares}</TableCell>
                                        <TableCell className="text-right">${Number(transaction.price).toFixed(2)}</TableCell>
                                        <TableCell className="text-right">
                                            ${(Number(transaction.num_shares) * Number(transaction.price)).toFixed(2)}
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
        </div>
    );
}
