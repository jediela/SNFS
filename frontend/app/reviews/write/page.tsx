import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export default function WriteReview() {
    return (
        <>
            <div className="grid w-full gap-2">
                <h1 className="pb-5 text-3xl font-bold text-center">
                    Write Review
                </h1>

                <Label>Stock List ID</Label>
                <Input placeholder="Stock list ID of the stock list you want to review" />
                <Button>Check stock list existence</Button>

                <div className="p-2" />
                <Label htmlFor="message">Your Review</Label>
                <Textarea placeholder="Write your review." />
                <Button>Submit review</Button>
            </div>
        </>
    );
}
