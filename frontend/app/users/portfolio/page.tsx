import Cooltable from '@/components/cooltable'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

export default function ViewPortfolio() {
    return (
        <>
            <div className="grid w-full gap-2">
                <h1 className="pb-5 text-3xl font-bold text-center">
                    View Portfolio
                </h1>

                <Label>User ID</Label>
                <Input placeholder="Enter the user ID so we can get its portfolios" />
                <Button>Fetch portfolios</Button>

                <div className="p-2" />

                <Label>Requests: </Label>
                <Textarea />

                <Cooltable />
            </div>
        </>
    )
}
