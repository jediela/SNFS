import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export default function ViewRequests() {
    return (
        <>
            <div className="grid w-full gap-2">
                <h1 className="pb-5 text-3xl font-bold text-center">
                    View Requests
                </h1>

                <Label>User ID</Label>
                <Input placeholder="Enter the user ID so we can get its requests" />
                <Button>Fetch requests</Button>

                <div className="p-2" />

                <Label>Requests: </Label>
                <Textarea />
            </div>
        </>
    );
}
