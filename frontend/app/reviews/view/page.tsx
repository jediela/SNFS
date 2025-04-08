'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, useCallback, Suspense, useRef } from 'react';
import { toast } from 'sonner';
import { Trash2, Pencil, Check, X } from 'lucide-react';

interface Review {
    review_id: number;
    user_id: number;
    list_id: number;
    content: string;
    timestamp: string;
    username: string;
    list_name?: string;
}

interface StockList {
    list_id: number;
    name: string;
    visibility: string;
    creator_name: string;
}

function ReviewsContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [listId, setListId] = useState('');
    const [reviews, setReviews] = useState<Review[]>([]);
    const [stockList, setStockList] = useState<StockList | null>(null);
    const [loading, setLoading] = useState(false);
    const [user, setUser] = useState<{user_id: number, username: string} | null>(null);
    const [viewMode, setViewMode] = useState<'list' | 'user'>('list');
    const [isDeletingReview, setIsDeletingReview] = useState(false);
    const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
    const [editReviewId, setEditReviewId] = useState<number | null>(null);
    const [editedContent, setEditedContent] = useState('');
    const [isEditingReview, setIsEditingReview] = useState(false);
    const fetchedListsRef = useRef<Set<string>>(new Set());
    const initialLoadDoneRef = useRef(false);
    const isLoadingRef = useRef(false);
    const initialRenderRef = useRef(true);

    const fetchReviewsForList = useCallback(async (id = listId) => {
        if (!id) {
            toast.error('Please enter a stock list ID');
            return;
        }
        
        // Skip if we're already loading or have fetched this list before in this session
        const cacheKey = `list-${id}-${user?.user_id || 'guest'}`;
        if (isLoadingRef.current || fetchedListsRef.current.has(cacheKey)) {
            return;
        }
        
        isLoadingRef.current = true;
        setLoading(true);
        
        try {
            const url = `http://localhost:8000/reviews/list/${id}${user ? `?user_id=${user.user_id}` : ''}`;
            const res = await fetch(url);
            const data = await res.json();
            
            if (!res.ok) {
                toast.error(data.error || 'Failed to fetch reviews');
                setReviews([]);
                setStockList(null);
                return;
            }
            
            // Ensure reviews is always an array, even if the API returns null
            const reviewsArray = Array.isArray(data.reviews) ? data.reviews : [];
            
            setReviews(reviewsArray);
            setStockList(data.stockList);
            setViewMode('list');
            fetchedListsRef.current.add(cacheKey);
            
            // Only show info toast on manual searches, not initial load
            if (initialLoadDoneRef.current && reviewsArray.length === 0) {
                toast.info('No reviews found for this stock list');
            }
        } catch (error) {
            toast.error(String(error));
            setReviews([]);
            setStockList(null);
        } finally {
            setLoading(false);
            isLoadingRef.current = false;
            initialLoadDoneRef.current = true;
        }
    }, [listId, user]);
    
    const fetchUserReviews = useCallback(async (userId: number) => {
        if (!userId) return;
        
        const cacheKey = `user-${userId}`;
        if (isLoadingRef.current || fetchedListsRef.current.has(cacheKey)) {
            return;
        }
        
        isLoadingRef.current = true;
        setLoading(true);
        
        try {
            const res = await fetch(`http://localhost:8000/reviews/user/${userId}`);
            const data = await res.json();
            
            if (!res.ok) {
                toast.error(data.error || 'Failed to fetch your reviews');
                setReviews([]);
                return;
            }
            
            // Ensure reviews is always an array
            const reviewsArray = Array.isArray(data.reviews) ? data.reviews : [];
            setReviews(reviewsArray);
            setStockList(null);
            setViewMode('user');
            fetchedListsRef.current.add(cacheKey);
            
            // Only show info toast on manual actions, not initial load
            if (initialLoadDoneRef.current && reviewsArray.length === 0) {
                toast.info('You have not written any reviews yet');
            }
        } catch (error) {
            toast.error(String(error));
            setReviews([]);
        } finally {
            setLoading(false);
            isLoadingRef.current = false;
            initialLoadDoneRef.current = true;
        }
    }, []);

    // Use a separate effect for the initial data load
    useEffect(() => {
        if (!initialRenderRef.current) return;
        
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
        
        // Check if we have a list_id in the URL
        const listIdParam = searchParams.get('list_id');
        if (listIdParam) {
            setListId(listIdParam);
            setViewMode('list');
                    }
        
        initialRenderRef.current = false;
    }, [searchParams]);
    
    useEffect(() => {
        if (initialRenderRef.current) return;
        
        if (viewMode === 'list' && listId) {
            fetchReviewsForList();
        } else if (viewMode === 'user' && user) {
            fetchUserReviews(user.user_id);
        }
    }, [listId, user, viewMode, fetchReviewsForList, fetchUserReviews]);

    function handleSearch(e: React.FormEvent) {
        e.preventDefault();
        // Clear the cache before a manual search
        fetchedListsRef.current.clear();
        fetchReviewsForList();
    }
    
    // Reset the cache when switching views
    function handleViewModeSwitch(userId: number) {
        fetchedListsRef.current.clear();
        setViewMode('user');
        fetchUserReviews(userId);
    }
    
    function formatDate(dateString: string) {
        return new Date(dateString).toLocaleString();
    }

    function handleWriteReview() {
        if (listId) {
            router.push(`/reviews/write?list_id=${listId}`);
        } else {
            router.push('/reviews/write');
        }
    }

    // Add function to handle review deletion
    async function handleDeleteReview(reviewId: number) {
        if (!user) return;
        
        setIsDeletingReview(true);
        try {
            const res = await fetch(`http://localhost:8000/reviews/${reviewId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    user_id: user.user_id,
                }),
            });
            
            const data = await res.json();
            
            if (!res.ok) {
                toast.error(data.error || 'Failed to delete review');
                return;
            }
            
            toast.success('Review deleted successfully');
            
            // Remove the deleted review from the local state
            setReviews(prevReviews => prevReviews.filter(review => review.review_id !== reviewId));
            setDeleteConfirmId(null);
        } catch (error) {
            toast.error(String(error));
        } finally {
            setIsDeletingReview(false);
        }
    }

    // Add function to handle starting edit mode
    function handleStartEdit(review: Review) {
        setEditReviewId(review.review_id);
        setEditedContent(review.content);
    }

    // Add function to handle canceling edit
    function handleCancelEdit() {
        setEditReviewId(null);
        setEditedContent('');
    }

    // Add function to handle submitting edited review
    async function handleSubmitEdit(reviewId: number) {
        if (!user || !editedContent.trim()) return;
        
        setIsEditingReview(true);
        try {
            const res = await fetch(`http://localhost:8000/reviews/update/${reviewId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    user_id: user.user_id,
                    content: editedContent
                }),
            });
            
            const data = await res.json();
            
            if (!res.ok) {
                toast.error(data.error || 'Failed to update review');
                return;
            }
            
            toast.success('Review updated successfully');
            
            // Update the review in the local state
            setReviews(prevReviews => 
                prevReviews.map(review => 
                    review.review_id === reviewId 
                        ? { ...review, content: editedContent }
                        : review
                )
            );
            
            setEditReviewId(null);
            setEditedContent('');
            
        } catch (error) {
            toast.error(String(error));
        } finally {
            setIsEditingReview(false);
        }
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center flex-col sm:flex-row gap-4">
                        <div>
                            <CardTitle className="text-2xl font-bold">
                                {viewMode === 'list' ? 'Stock List Reviews' : 'My Reviews'}
                            </CardTitle>
                            <CardDescription>
                                {viewMode === 'list' 
                                    ? 'View all reviews for a specific stock list' 
                                    : 'Reviews you\'ve written for stock lists'}
                            </CardDescription>
                        </div>
                        
                        {user && (
                            <div className="flex gap-2">
                                <Button
                                    variant={viewMode === 'user' ? 'default' : 'outline'}
                                    onClick={() => handleViewModeSwitch(user.user_id)}
                                >
                                    My Reviews
                                </Button>
                                <Button onClick={handleWriteReview}>
                                    Write a Review
                                </Button>
                            </div>
                        )}
                    </div>
                </CardHeader>
                
                {viewMode === 'list' && (
                    <CardContent>
                        <form onSubmit={handleSearch} className="flex gap-2 mb-6">
                            <Input
                                value={listId}
                                onChange={(e) => setListId(e.target.value)}
                                placeholder="Enter stock list ID to view reviews"
                                className="flex-1"
                                disabled={loading}
                            />
                            <Button type="submit" disabled={loading}>
                                {loading ? 'Loading...' : 'Search'}
                            </Button>
                        </form>

                        {stockList && (
                            <div className="bg-muted p-4 rounded-md mb-6">
                                <h3 className="font-medium text-lg">{stockList.name}</h3>
                                <p className="text-sm text-muted-foreground">
                                    Created by: {stockList.creator_name} | Visibility: {stockList.visibility}
                                </p>
                            </div>
                        )}
                    </CardContent>
                )}
            </Card>

            {loading ? (
                <div className="flex justify-center p-12">
                    <div className="animate-pulse space-y-4 w-full max-w-2xl">
                        <div className="h-4 bg-muted rounded w-3/4"></div>
                        <div className="h-10 bg-muted rounded"></div>
                        <div className="h-20 bg-muted rounded"></div>
                        <div className="h-4 bg-muted rounded w-1/2"></div>
                    </div>
                </div>
            ) : reviews.length > 0 ? (
                <div className="space-y-4">
                    {reviews.map((review) => (
                        <Card key={review.review_id}>
                            <CardContent className="pt-6">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <p className="font-medium">{review.username}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {formatDate(review.timestamp)}
                                        </p>
                                    </div>
                                    
                                    <div className="flex items-center gap-2">
                                        {viewMode === 'user' && (
                                            <div className="bg-muted text-xs px-2 py-1 rounded">
                                                List: {review.list_name}
                                            </div>
                                        )}
                                        
                                        {/* Show edit/delete buttons only for user's own reviews */}
                                        {user && user.user_id === review.user_id && (
                                            <>
                                                {deleteConfirmId === review.review_id ? (
                                                    <div className="flex items-center gap-2 ml-2 bg-red-50 dark:bg-red-950/30 px-2 py-1 rounded-md">
                                                        <span className="text-xs text-red-600 dark:text-red-400">
                                                            Delete this review?
                                                        </span>
                                                        <Button
                                                            variant="destructive"
                                                            size="sm"
                                                            disabled={isDeletingReview}
                                                            onClick={() => handleDeleteReview(review.review_id)}
                                                        >
                                                            {isDeletingReview ? 'Deleting...' : 'Yes, Delete'}
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => setDeleteConfirmId(null)}
                                                        >
                                                            Cancel
                                                        </Button>
                                                    </div>
                                                ) : editReviewId === review.review_id ? (
                                                    <div className="flex items-center gap-2">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="text-green-600 hover:text-green-800 hover:bg-green-50 dark:hover:bg-green-950/30"
                                                            onClick={() => handleSubmitEdit(review.review_id)}
                                                            disabled={isEditingReview}
                                                        >
                                                            <Check className="h-4 w-4 mr-1" />
                                                            Save
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="text-gray-500 hover:text-gray-700"
                                                            onClick={handleCancelEdit}
                                                        >
                                                            <X className="h-4 w-4 mr-1" />
                                                            Cancel
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                                                            onClick={() => handleStartEdit(review)}
                                                        >
                                                            <Pencil className="h-4 w-4 mr-1" />
                                                            Edit
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                                                            onClick={() => setDeleteConfirmId(review.review_id)}
                                                        >
                                                            <Trash2 className="h-4 w-4 mr-1" />
                                                            Delete
                                                        </Button>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>
                                
                                {editReviewId === review.review_id ? (
                                    <div className="mt-2">
                                        <Textarea
                                            value={editedContent}
                                            onChange={(e) => setEditedContent(e.target.value)}
                                            placeholder="Edit your review..."
                                            className="w-full min-h-[120px]"
                                            maxLength={4000}
                                            disabled={isEditingReview}
                                        />
                                        <p className="text-xs text-muted-foreground text-right mt-1">
                                            {editedContent.length}/4000 characters
                                        </p>
                                    </div>
                                ) : (
                                    <div className="mt-2 whitespace-pre-wrap bg-muted/50 p-4 rounded-md">
                                        {review.content}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <p className="text-muted-foreground mb-4">
                            {viewMode === 'list' 
                                ? (stockList ? 'No reviews found for this stock list.' : 'Enter a stock list ID to view reviews.')
                                : 'You haven\'t written any reviews yet.'}
                        </p>
                        {user && (
                            <Button onClick={handleWriteReview}>
                                Write a Review
                            </Button>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

export default function ViewReviewsPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-pulse flex space-x-4">
                    <div className="h-10 w-10 bg-muted rounded-full"></div>
                    <div className="space-y-4 flex-1">
                        <div className="h-4 bg-muted rounded w-3/4"></div>
                        <div className="h-4 bg-muted rounded"></div>
                        <div className="h-4 bg-muted rounded w-5/6"></div>
                    </div>
                </div>
            </div>
        }>
            <ReviewsContent />
        </Suspense>
    );
}
