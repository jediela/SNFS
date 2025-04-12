'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardHeader,
    CardTitle,
    CardContent,
    CardDescription,
} from '@/components/ui/card';
import {
    Table,
    TableHeader,
    TableRow,
    TableHead,
    TableBody,
    TableCell,
} from '@/components/ui/table';
import { AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface StockStats {
    symbol: string;
    mean_return: number;
    stddev_return: number;
    coefficient_of_variation: number;
    beta: number;
}

interface CorrelationMatrixRow {
    symbol: string;
    correlations: {
        [symbol: string]: number;
    };
}

interface StatisticsResponse {
    stock_statistics: StockStats[];
    correlation_matrix: CorrelationMatrixRow[];
    date_range: {
        start_date: string;
        end_date: string;
    };
}

export default function StockListStatsPage() {
    const params = useParams();
    const router = useRouter();
    const [statistics, setStatistics] = useState<StatisticsResponse | null>(
        null
    );
    const { id } = params;

    useEffect(() => {
        async function fetchStatistics() {
            const storedUser = localStorage.getItem('user');
            const user = storedUser ? JSON.parse(storedUser) : null;

            const query = user?.user_id ? `?user_id=${user.user_id}` : '';

            try {
                const res = await fetch(
                    `http://localhost:8000/stocklists/${id}/statistics${query}`
                );

                const data = await res.json();

                if (!res.ok) {
                    toast.error(data.error || 'Failed to load statistics');
                    return;
                }

                setStatistics(data);
            } catch (err) {
                console.error('Error fetching statistics:', err);
                toast.error('Failed to load statistics');
            }
        }

        fetchStatistics();
    }, [id]);

    return (
        <div className="p-6">
            <Button
                variant="outline"
                onClick={() => router.push('/stocklists/view')}
                className="mb-4"
            >
                ← Back to Stock Lists
            </Button>

            <h1 className="text-3xl font-bold mb-2">Stock List Statistics</h1>
            {statistics && (
                <p className="text-sm text-muted-foreground mb-6">
                    Based on data from {statistics.date_range.start_date} to{' '}
                    {statistics.date_range.end_date}
                </p>
            )}

            {statistics ? (
                <>
                    <Card className="mb-6">
                        <CardHeader>
                            <CardTitle>Stock Risk Metrics</CardTitle>
                            <CardDescription>
                                Statistical indicators for each stock in your
                                portfolio
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
                                    {statistics.stock_statistics.map((stat) => (
                                        <TableRow key={stat.symbol}>
                                            <TableCell>{stat.symbol}</TableCell>
                                            <TableCell className="text-right">
                                                {stat.beta.toFixed(2)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {stat.coefficient_of_variation?.toFixed(
                                                    2
                                                ) ?? 'N/A'}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {(
                                                    stat.mean_return * 100
                                                ).toFixed(2)}
                                                %
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {(
                                                    stat.stddev_return * 100
                                                ).toFixed(2)}
                                                %
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Stock Correlation Matrix</CardTitle>
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
                                        {Object.keys(
                                            statistics.correlation_matrix[0]
                                                ?.correlations || {}
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
                                                <TableCell>
                                                    {row.symbol}
                                                </TableCell>
                                                {Object.values(
                                                    row.correlations
                                                ).map((val, i) => (
                                                    <TableCell
                                                        key={i}
                                                        className="text-right"
                                                    >
                                                        {val.toFixed(2)}
                                                    </TableCell>
                                                ))}
                                            </TableRow>
                                        )
                                    )}
                                </TableBody>
                            </Table>
                            <div className="mt-4 text-sm text-muted-foreground">
                                <AlertCircle
                                    className="inline mr-1"
                                    size={16}
                                />
                                Lower correlation values may indicate better
                                diversification.
                            </div>
                        </CardContent>
                    </Card>
                </>
            ) : (
                <p className="text-muted-foreground mt-6">
                    Loading or no statistics available.
                </p>
            )}
        </div>
    );
}
