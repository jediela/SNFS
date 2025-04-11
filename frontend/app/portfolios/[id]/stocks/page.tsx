'use client';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';

interface Portfolio {
    portfolio_id: number;
    name: string;
    balance: number;
}

export default function ViewStocks() {
    const router = useRouter();
    const { id } = useParams();
    const [loading, setLoading] = useState(true);
    const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
    const [user, setUser] = useState<{
        user_id: number;
        username: string;
    } | null>(null);

    // Use useCallback to wrap fetchPortfolioData so it can be safely included in the dependency array
    const fetchPortfolioData = useCallback(async () => {
        if (!id || !user) return;
        setLoading(true);
        try {
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
    }, [id, user]);

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) setUser(JSON.parse(storedUser));
    }, []);
    
    useEffect(() => {
        if (user) fetchPortfolioData();
    }, [user, fetchPortfolioData]);

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
                {portfolio?.name} (ID: {portfolio?.portfolio_id})
            </h1>

            {/* Balance Display */}
            <div className="mb-8 p-4 bg-card rounded-lg shadow">
                <h2 className="text-xl font-semibold mb-2">Current Balance</h2>
                <p className="text-2xl">${portfolio?.balance}</p>
            </div>

            {/* Transactions Section */}
            <div className="mb-8">
                <h2 className="text-xl font-semibold mb-4">
                    Recent Stock Transactions
                </h2>
            </div>
        </div>
    );
}
