'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function PortfolioDetails() {
    const [user, setUser] = useState<{
        user_id: number;
        username: string;
    } | null>(null);
    const { id } = useParams();

    async function fetchPortfolioData() {}

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) setUser(JSON.parse(storedUser));
    }, []);
    useEffect(() => {
        if (user) fetchPortfolioData();
    }, [user]);

    return (
        <div>
            <h1>Portfolio Details</h1>
            <p>Portfolio ID: {id}</p>
        </div>
    );
}
