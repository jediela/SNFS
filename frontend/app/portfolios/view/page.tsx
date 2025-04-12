'use client';

import { useEffect, useState, useCallback } from 'react';
import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectItem,
    SelectContent,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface Portfolio {
    portfolio_id: string;
    owner_id: string;
    name: string;
    balance: number;
}

interface PortfolioData {
    portfolio_id: string;
    owner_id: string;
    name: string;
    balance: number | string;
}

export default function ViewPortfolio() {
    const [user, setUser] = useState<{
        user_id: number;
        username: string;
    } | null>(null);
    const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
    const router = useRouter();
    const [selectedTarget, setSelectedTarget] = useState<Portfolio | null>(
        null
    );
    const [sourceId, setSourceId] = useState<string | null>(null);
    const [amount, setAmount] = useState('');

    const fetchPortfolios = useCallback(async () => {
        if (!user) return;
        try {
            const res = await fetch(
                `http://localhost:8000/portfolios/view?userId=${user?.user_id}`,
                { method: 'GET' }
            );
            const data = await res.json();

            // Ensure all portfolios have numeric balance values
            if (data.portfolios) {
                const parsedPortfolios = data.portfolios.map(
                    (portfolio: PortfolioData) => ({
                        ...portfolio,
                        balance: Number(portfolio.balance),
                    })
                );
                setPortfolios(parsedPortfolios);
            } else {
                setPortfolios([]);
            }
        } catch {
            toast.error('Failed to refresh portfolios');
            setPortfolios([]);
        }
    }, [user]);

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) setUser(JSON.parse(storedUser));
    }, []);

    useEffect(() => {
        if (user) fetchPortfolios();
    }, [user, fetchPortfolios]);

    function handleViewCashTransactions(portfolioId: string) {
        router.push(`/portfolios/${portfolioId}/cashTransactions`);
    }

    function handleViewPortfolioStocks(portfolioId: string) {
        router.push(`/portfolios/${portfolioId}/stocks`);
    }

    async function handleTransfer() {
        try {
            const res = await fetch(
                'http://localhost:8000/portfolios/transfer',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        fromPortfolioId: sourceId,
                        toPortfolioId: selectedTarget?.portfolio_id,
                        amount: parseFloat(amount),
                    }),
                }
            );

            const data = await res.json();

            if (!res.ok) {
                toast.error(data.error || 'Transfer failed');
                return;
            }

            toast.success(data.message || 'Transfer successful');
            fetchPortfolios();
        } catch (error) {
            toast.error('Failed to connect to server');
        }

        setSelectedTarget(null);
        setSourceId(null);
        setAmount('');
    }

    return (
        <>
            <h1 className="pb-5 text-3xl font-bold text-center">
                View Portfolios
            </h1>

            <Dialog
                open={!!selectedTarget}
                onOpenChange={() => setSelectedTarget(null)}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Transfer Between Portfolios</DialogTitle>
                    </DialogHeader>

                    <div className="flex flex-col gap-6">
                        <div className="flex flex-col sm:flex-row sm:justify-between gap-6">
                            {/* Deposit Target */}
                            <div className="flex-1 bg-muted p-4 rounded-md shadow-inner">
                                <p className="text-sm text-muted-foreground">
                                    Deposit To:
                                </p>
                                <p className="text-lg font-semibold">
                                    {selectedTarget?.name}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    Balance: $
                                    {selectedTarget?.balance.toFixed(2)}
                                </p>
                            </div>

                            {/* Withdrawal Source */}
                            <div className="flex-1">
                                <Label className="mb-2 block">
                                    Withdraw From:
                                </Label>
                                <Select
                                    onValueChange={(value) =>
                                        setSourceId(value)
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Choose a portfolio" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {portfolios
                                            .filter(
                                                (p) =>
                                                    p.portfolio_id !==
                                                    selectedTarget?.portfolio_id
                                            )
                                            .map((p) => (
                                                <SelectItem
                                                    key={p.portfolio_id}
                                                    value={p.portfolio_id}
                                                >
                                                    {p.name} — ${p.balance}
                                                </SelectItem>
                                            ))}
                                    </SelectContent>
                                </Select>
                                <div className="mt-4">
                                    <Label className="mb-1 block">Amount</Label>
                                    <Input
                                        type="number"
                                        min="0.01"
                                        step="0.01"
                                        placeholder="Enter amount"
                                        value={amount}
                                        onChange={(e) =>
                                            setAmount(e.target.value)
                                        }
                                    />
                                </div>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button
                                disabled={
                                    !sourceId || !amount || Number(amount) <= 0
                                }
                                onClick={handleTransfer}
                            >
                                Confirm Transfer
                            </Button>
                        </DialogFooter>
                    </div>
                </DialogContent>
            </Dialog>

            {portfolios && portfolios.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {portfolios.map((portfolio) => (
                        <Card key={portfolio.portfolio_id}>
                            <CardHeader>
                                <CardTitle>{portfolio.name}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p>
                                    Balance: $
                                    {Number(portfolio.balance).toFixed(2)}
                                </p>
                            </CardContent>
                            <CardFooter className="flex flex-col items-start gap-2">
                                <Button
                                    onClick={() =>
                                        handleViewCashTransactions(
                                            portfolio.portfolio_id
                                        )
                                    }
                                >
                                    View Cash Transactions
                                </Button>
                                <Button
                                    onClick={() =>
                                        handleViewPortfolioStocks(
                                            portfolio.portfolio_id
                                        )
                                    }
                                >
                                    View Stock Transactions
                                </Button>
                                {portfolios.length >= 2 && (
                                    <Button
                                        variant="default"
                                        onClick={() =>
                                            setSelectedTarget(portfolio)
                                        }
                                    >
                                        Transfer Money to this Portfolio
                                    </Button>
                                )}
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="text-center py-4">
                    <p className="text-lg">No portfolios found</p>
                </div>
            )}
        </>
    );
}
