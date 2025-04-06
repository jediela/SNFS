'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState } from 'react';

export default function CreatePortfolio() {
    const [userId, setUserId] = useState('');
    const [portfolioName, setPortfolioName] = useState('');

    async function handleCreate(e: React.FormEvent) {
        e.preventDefault();
    }

    return (
        <>
            <h1 className="pb-5 text-3xl font-bold text-center">
                Create Portfolio
            </h1>
            <form onSubmit={handleCreate}>
                <div className="flex flex-col gap-6">
                    <div className="grid gap-2">
                        <Label>Your User ID</Label>
                        <Input
                            placeholder="Your User ID"
                            value={userId}
                            required
                            onChange={(e) => setUserId(e.target.value)}
                        />
                    </div>
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
