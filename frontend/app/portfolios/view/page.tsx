'use client';

import { useEffect, useState, useCallback } from 'react';
import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

export default function ViewPortfolio() {
    const [user, setUser] = useState<{
        user_id: number;
        username: string;
    } | null>(null);
    const [portfolios, setPortfolios] = useState<
        {
            portfolio_id: string;
            owner_id: string;
            name: string;
            balance: number;
        }[]
    >([]);
    const router = useRouter();

    const fetchPortfolios = useCallback(async () => {
        if (!user) return;
        try {
            const res = await fetch(
                `http://localhost:8000/portfolios/view?userId=${user?.user_id}`,
                { method: 'GET' }
            );
            const data = await res.json();
            setPortfolios(data.portfolios || []);
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

    function handleViewClick(portfolioId: string) {
        router.push(`/portfolios/${portfolioId}`);
    }

    return (
        <>
            <h1 className="pb-5 text-3xl font-bold text-center">
                View Portfolios
            </h1>

            {portfolios && portfolios.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {portfolios.map((portfolio) => (
                        <Card key={portfolio.portfolio_id}>
                            <CardHeader>
                                <CardTitle>{portfolio.name}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p>Balance: ${portfolio.balance}</p>
                            </CardContent>
                            <CardFooter>
                                <Button
                                    onClick={() =>
                                        handleViewClick(portfolio.portfolio_id)
                                    }
                                >
                                    View
                                </Button>
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
