import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

export default function EditReview() {
    return (
        <>
            <div className="grid w-full gap-2">
                <h1 className="pb-5 text-3xl font-bold text-center">
                    Edit Review
                </h1>

                <Label>Review ID</Label>
                <Input placeholder="Review ID of the review you want to edit" />
                <Button>Fetch review</Button>

                <div className="p-2" />

                <Label>Edit Review</Label>
                <Textarea />
                <Button>Save edited review</Button>
            </div>
        </>
    )
}
