import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export default function ViewReviews() {
    return (
        <>
            <div className="grid w-full gap-2">
                <h1 className="pb-5 text-3xl font-bold text-center">
                    View Reviews
                </h1>

                <Label>Stock List ID</Label>
                <Input placeholder="Enter the stock list ID so we can get its reviews" />
                <Button>Fetch review</Button>

                <div className="p-2" />

                <Label>Reviews: </Label>
                <Textarea disabled />
            </div>
        </>
    );
}
