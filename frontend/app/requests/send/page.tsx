import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function SendRequest() {
    return (
        <>
            <div className="grid w-full gap-2">
                <h1 className="pb-5 text-3xl font-bold text-center">
                    Send Request
                </h1>

                <Label>User ID</Label>
                <Input placeholder="Enter the user ID of the person you would like to send a request to" />
                <Button>Send Request</Button>
            </div>
        </>
    );
}
