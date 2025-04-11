'use client';

import { Skeleton } from '@/components/ui/skeleton';
import {
    TableHeader,
    TableRow,
    TableHead,
    TableBody,
    TableCell,
} from '@/components/ui/table';
import { Table } from '@/components/ui/table';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

import {
    Dialog,
    DialogTrigger,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

interface CashTransaction {
    transaction_id: number;
    type: 'deposit' | 'withdrawal';
    amount: string;
    timestamp: string;
}

interface Portfolio {
    portfolio_id: number;
    name: string;
    balance: number;
}

export default function PortfolioDetails() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<{
        user_id: number;
        username: string;
    } | null>(null);
    const [transactions, setTransactions] = useState<CashTransaction[]>([]);
    const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
    const [openDialog, setOpenDialog] = useState(false);
    const [transactionType, setTransactionType] = useState<
        'deposit' | 'withdrawal'
    >('deposit');
    const [amount, setAmount] = useState('');

    const { id } = useParams();

    async function fetchPortfolioData() {
        if (!id || !user) return;
        setLoading(true);
        try {
            const transactionsRes = await fetch(
                `http://localhost:8000/transactions/${id}?userId=${user.user_id}`,
                { method: 'GET' }
            );
            const transactionsData = await transactionsRes.json();
            console.log(transactionsData.transactions);
            setTransactions(transactionsData.transactions);

            const portfolioRes = await fetch(
                `http://localhost:8000/portfolios/${id}?userId=${user.user_id}`,
                { method: 'GET' }
            );
            const portfolioData = await portfolioRes.json();
            setPortfolio(portfolioData.portfolio);
        } catch {
            toast.error('Failed to fetch data');
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) setUser(JSON.parse(storedUser));
    }, []);
    useEffect(() => {
        if (user) fetchPortfolioData();
    }, [user]);

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
                PORTFOLIO: {portfolio?.name}
            </h1>

            {/* Balance Display */}
            <div className="mb-8 p-4 bg-card rounded-lg shadow">
                <h2 className="text-xl font-semibold mb-2">Current Balance</h2>
                <p className="text-2xl">${portfolio?.balance}</p>
            </div>

            {/* Transaction Action Buttons */}
            <div className="mb-6 flex gap-4">
                <Dialog open={openDialog} onOpenChange={setOpenDialog}>
                    <DialogTrigger asChild>
                        <Button onClick={() => setTransactionType('deposit')}>
                            Deposit
                        </Button>
                    </DialogTrigger>
                    <DialogTrigger asChild>
                        <Button
                            variant="destructive"
                            onClick={() => setTransactionType('withdrawal')}
                        >
                            Withdraw
                        </Button>
                    </DialogTrigger>

                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>
                                {transactionType.charAt(0).toUpperCase() +
                                    transactionType.slice(1)}
                            </DialogTitle>
                        </DialogHeader>

                        <div className="space-y-4">
                            <Input
                                type="number"
                                placeholder="Amount"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                min="0.01"
                                step="0.01"
                            />
                            <Button
                                onClick={() => {
                                    // Placeholder logic for now
                                    toast.success(
                                        `${transactionType} of $${amount} ready to send`
                                    );
                                    setOpenDialog(false);
                                    setAmount('');
                                }}
                                disabled={!amount}
                            >
                                Confirm
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Transactions Section */}
            <div className="mb-8">
                <h2 className="text-xl font-semibold mb-4">Transactions</h2>

                {transactions.length === 0 ? (
                    <div className="text-center text-muted-foreground py-6">
                        No transactions found.
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Type</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Date</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {transactions.map((transaction) => (
                                <TableRow key={transaction.transaction_id}>
                                    <TableCell className="capitalize">
                                        {transaction.type}
                                    </TableCell>
                                    <TableCell
                                        className={
                                            transaction.type === 'deposit'
                                                ? 'text-green-500'
                                                : 'text-red-500'
                                        }
                                    >
                                        ${transaction.amount}
                                    </TableCell>
                                    <TableCell>
                                        {new Date(
                                            transaction.timestamp
                                        ).toLocaleDateString('en-US', {
                                            year: 'numeric',
                                            month: 'short',
                                            day: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit',
                                        })}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </div>
        </div>
    );
}
