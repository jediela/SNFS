'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

export default function CreatePortfolio() {
    const [user, setUser] = useState<{
        user_id: number;
        username: string;
    } | null>(null);
    const [portfolioName, setPortfolioName] = useState('');

    async function handleCreate(e: React.FormEvent) {
        e.preventDefault();
        if (!user) return;
        try {
            const res = await fetch('http://localhost:8000/portfolios/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: user.user_id,
                    portfolioName,
                }),
            });
            const data = await res.json();
            if (!res.ok) {
                toast.error(data.error);
                return;
            }
            toast.success(data.message, {
                description: `portfolio_id: ${data.portfolio.portfolio_id}, user_id: ${data.portfolio.user_id}, name: ${data.portfolio.name}, balance: ${data.portfolio.balance}`,
            });
            setPortfolioName('');
        } catch (error) {
            toast.error(String(error));
        }
    }

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) setUser(JSON.parse(storedUser));
    }, []);

    return (
        <>
            <h1 className="pb-5 text-3xl font-bold text-center">
                Create Portfolio
            </h1>
            <form onSubmit={handleCreate}>
                <div className="flex flex-col gap-6">
                    <div className="grid gap-2">
                        <div className="flex items-center">
                            <Label>Portfolio Name</Label>
                        </div>
                        <Input
                            placeholder="Name for your portfolio"
                            value={portfolioName}
                            required
                            onChange={(e) => setPortfolioName(e.target.value)}
                        />
                    </div>
                    <Button type="submit" className="w-full">
                        Create Portfolio
                    </Button>
                </div>
            </form>
        </>
    );
}
