import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function ViewPortfolio() {
    return (
        <>
            <h1 className="pb-5 text-3xl font-bold text-center">
                View Portfolios
            </h1>

            <form className="flex flex-col gap-6">
                <div className="flex-1 space-y-2">
                    <Label>User ID</Label>
                    <Input placeholder="Enter your user ID" />
                </div>
                <div className="flex-1 space-y-2">
                    <Label>Portfolio ID</Label>
                    <Input placeholder="Enter the portfolio ID" />
                </div>
                <div className="flex items-end">
                    <Button type="submit" className="w-full">
                        Get portfolio information
                    </Button>
                </div>
            </form>
        </>
    );
}
