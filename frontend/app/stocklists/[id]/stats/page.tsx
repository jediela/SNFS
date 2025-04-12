'use client';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export default function StockListStatsPage() {
    const params = useParams();
    const router = useRouter();
    const { id } = params;
    return (
        <div>
            <Button
                variant="outline"
                onClick={() => router.push('/stocklists/view')}
                className="mb-4"
            >
                ← Back to Stock Lists
            </Button>
            <h1>Stock List Stats</h1>
            <p>This is the stats page for a stock list.</p>
        </div>
    );
}
