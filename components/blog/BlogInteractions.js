"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input"; 
import { Badge } from "@/components/ui/badge"; 
import { useToast } from "@/hooks/use-toast";
import { addBlogReview, deleteBlogReview } from "@/actions/blog.actions";
import { Trash2, MessageSquare, Star, ShieldCheck, BadgeCheck } from "lucide-react"; // 🚀 Added BadgeCheck
import StarRating from "@/components/common/StarRating";
import { formatDate } from "@/lib/utils";

export default function BlogInteractions({ blogId, initialComments = [] }) {
  const { data: session } = useSession();
  const { toast } = useToast();
  
  const [reviews, setReviews] = useState(initialComments);
  const [comment, setComment] = useState("");
  const [rating, setRating] = useState(0); 
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [replyingTo, setReplyingTo] = useState(null); 
  const [replyComment, setReplyComment] = useState("");

  const getAvatarUrl = (user) => {
    if (!user || !user.name) return `https://ui-avatars.com/api/?name=Deleted+User&background=random`;
    return user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random`;
  };

  const handleSubmit = async (e, parentId = null) => {
    e.preventDefault();
    const textToSubmit = parentId ? replyComment : comment;
    
    if (!session) return toast({ title: "Please login to comment", variant: "destructive" });
    if (!textToSubmit.trim()) return;

    if (!parentId && rating === 0) {
      return toast({ 
        title: "Rating Required", 
        description: "Please select a star rating for your review.", 
        variant: "destructive" 
      });
    }

    setIsSubmitting(true);
    
    // Logic: rating is sent as 0 for replies
    const res = await addBlogReview(
        blogId, 
        session.user.id, 
        parentId ? 0 : rating, 
        textToSubmit, 
        parentId
    );
    
    if (res.success) {
      setReviews(res.reviews);
      if (parentId) {
          setReplyComment("");
          setReplyingTo(null);
      } else {
          setComment("");
          setRating(0);
      }
      toast({ title: parentId ? "Reply posted" : "Review posted" });
    } else {
      toast({ title: "Error", description: res.error, variant: "destructive" });
    }
    setIsSubmitting(false);
  };

  const handleDelete = async (reviewId) => {
    if (!confirm("Delete this comment?")) return;
    const res = await deleteBlogReview(blogId, reviewId);
    if (res.success) {
      setReviews(res.reviews);
      toast({ title: "Deleted" });
    }
  };

  const topLevelReviews = reviews.filter(r => !r.parentReviewId);
  const replies = reviews.filter(r => r.parentReviewId);

  return (
    <div className="space-y-8">
      <h3 className="text-xl font-bold">Comments ({topLevelReviews.length})</h3>

      {/* Main Comment Form */}
      <form onSubmit={(e) => handleSubmit(e, null)} className="space-y-4">
        <div className="flex gap-4">
          <Avatar className="w-10 h-10 mt-1">
            <AvatarImage src={session?.user?.image || session?.user?.avatar} />
            <AvatarFallback>{session?.user?.name?.charAt(0) || "?"}</AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-3">
            <div className="flex flex-col gap-1">
                <span className="text-xs font-medium text-muted-foreground">Your Rating:</span>
                <StarRating 
                    rating={rating} 
                    onRatingChange={setRating} 
                    interactive={true} 
                    size="md" 
                />
            </div>
            <Textarea 
              placeholder="Write a review..." 
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="resize-none"
            />
            <Button type="submit" disabled={isSubmitting || !comment.trim()}>
                {isSubmitting ? "Posting..." : "Post Review"}
            </Button>
          </div>
        </div>
      </form>

      {/* Comment List */}
      <div className="space-y-6">
        {topLevelReviews.map((review) => {
          const childReplies = replies.filter(r => r.parentReviewId === review._id);

          return (
            <div key={review._id} className="flex gap-4 group">
              {/* 🚀 Clickable Avatar */}
              {review.user?._id ? (
                <Link href={`/profile/${review.user._id}`} className="shrink-0">
                  <Avatar className="w-10 h-10 border border-transparent hover:border-cyan-400 transition-all cursor-pointer">
                    <AvatarImage src={getAvatarUrl(review.user)} alt={review.user.name} />
                    <AvatarFallback>{review.user.name?.charAt(0)}</AvatarFallback>
                  </Avatar>
                </Link>
              ) : (
                <Avatar className="w-10 h-10 opacity-50 shrink-0">
                  <AvatarImage src={getAvatarUrl(null)} />
                  <AvatarFallback>?</AvatarFallback>
                </Avatar>
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* 🚀 Clickable Name + Verified Badge */}
                    {review.user?._id ? (
                       <div className="flex items-center gap-1">
                          <Link href={`/profile/${review.user._id}`} className="font-bold text-sm text-foreground hover:text-cyan-400 transition-colors truncate max-w-[150px] sm:max-w-xs">
                            {review.user.name}
                          </Link>
                          {/* 🚀 VERIFIED EDUCATOR BADGE */}
                          {review.user.isVerifiedEducator && (
                            <BadgeCheck className="w-4 h-4 text-blue-400 drop-shadow-[0_0_8px_rgba(96,165,250,0.8)] shrink-0" title="Verified Expert Educator" />
                          )}
                       </div>
                    ) : (
                      <span className="font-bold text-sm text-muted-foreground">Deleted User</span>
                    )}

                    {/* 🚀 Admin Badge */}
                    {review.user?.role === 'admin' && (
                      <Badge variant="outline" className="h-4.5 px-1.5 py-0 text-[9px] font-black uppercase tracking-widest bg-cyan-500/10 text-cyan-400 border-cyan-500/30 flex items-center gap-1">
                        <ShieldCheck className="w-2.5 h-2.5" /> Admin
                      </Badge>
                    )}

                    <span className="text-xs text-muted-foreground ml-1">{formatDate(review.createdAt)}</span>
                  </div>

                  {(session?.user?.id === (review.user?._id || review.user) || session?.user?.role === 'admin') && (
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleDelete(review._id)} 
                        className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                
                {review.rating > 0 && (
                    <div className="flex mb-1 mt-1">
                        {[...Array(5)].map((_, i) => (
                            <Star 
                                key={i} 
                                className={`w-3 h-3 ${i < review.rating ? "fill-yellow-500 text-yellow-500" : "text-muted-foreground/30"}`} 
                            />
                        ))}
                    </div>
                )}
                <p className="text-sm mt-1 text-white/90 leading-relaxed">{review.comment}</p>

                <button 
                  onClick={() => {
                    setReplyingTo(replyingTo === review._id ? null : review._id);
                    setReplyComment(`@${review.user?.name || 'User'} `);
                  }}
                  className="text-xs text-muted-foreground font-semibold hover:text-cyan-400 mt-2 flex items-center gap-1.5 transition-colors"
                >
                  <MessageSquare className="w-3 h-3" /> Reply
                </button>

                {/* Reply Form */}
                {replyingTo === review._id && (
                    <form onSubmit={(e) => handleSubmit(e, review._id)} className="flex gap-3 mt-4">
                        <Avatar className="w-8 h-8 shrink-0">
                            <AvatarImage src={session?.user?.image || session?.user?.avatar} />
                            <AvatarFallback>?</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 flex flex-col sm:flex-row gap-2">
                            <Input 
                              value={replyComment}
                              onChange={(e) => setReplyComment(e.target.value)}
                              className="h-9 text-sm focus-visible:ring-cyan-500"
                              autoFocus
                            />
                            <Button type="submit" size="sm" disabled={isSubmitting || !replyComment.trim()} className="w-full sm:w-auto">
                                {isSubmitting ? "..." : "Reply"}
                            </Button>
                        </div>
                    </form>
                )}

                {/* YouTube Style Thread */}
                {childReplies.length > 0 && (
                  <div className="mt-4 space-y-4 pl-4 sm:pl-8 border-l-2 border-white/5">
                    {childReplies.map(reply => (
                      <div key={reply._id} className="flex gap-3 relative group/reply">
                        
                        {/* 🚀 Clickable Avatar (Reply) */}
                        {reply.user?._id ? (
                          <Link href={`/profile/${reply.user._id}`} className="shrink-0">
                            <Avatar className="w-8 h-8 border border-transparent hover:border-cyan-400 transition-all cursor-pointer">
                              <AvatarImage src={getAvatarUrl(reply.user)} alt={reply.user.name} />
                              <AvatarFallback>{reply.user.name?.charAt(0)}</AvatarFallback>
                            </Avatar>
                          </Link>
                        ) : (
                          <Avatar className="w-8 h-8 opacity-50 shrink-0">
                            <AvatarImage src={getAvatarUrl(null)} />
                            <AvatarFallback>?</AvatarFallback>
                          </Avatar>
                        )}

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            
                            <div className="flex items-center gap-2 flex-wrap">
                                {/* 🚀 Clickable Name + Verified Badge (Reply) */}
                                {reply.user?._id ? (
                                   <div className="flex items-center gap-1">
                                      <Link href={`/profile/${reply.user._id}`} className="font-bold text-xs hover:text-cyan-400 transition-colors truncate max-w-[120px] sm:max-w-[200px]">
                                        {reply.user.name}
                                      </Link>
                                      {/* 🚀 VERIFIED EDUCATOR BADGE */}
                                      {reply.user.isVerifiedEducator && (
                                        <BadgeCheck className="w-3 h-3 text-blue-400 shrink-0" title="Verified Expert Educator" />
                                      )}
                                   </div>
                                ) : (
                                  <span className="font-bold text-xs text-muted-foreground">Deleted User</span>
                                )}

                                {/* 🚀 Admin Badge (Reply) */}
                                {reply.user?.role === 'admin' && (
                                  <Badge variant="outline" className="h-4 px-1 py-0 text-[8px] font-black uppercase tracking-widest bg-cyan-500/10 text-cyan-400 border-cyan-500/30 flex items-center gap-1">
                                    <ShieldCheck className="w-2.5 h-2.5" /> Admin
                                  </Badge>
                                )}

                                <span className="text-[10px] text-muted-foreground ml-1">{formatDate(reply.createdAt)}</span>
                            </div>
                            {(session?.user?.id === (reply.user?._id || reply.user) || session?.user?.role === 'admin') && (
                              <button onClick={() => handleDelete(reply._id)} className="text-destructive opacity-0 group-hover/reply:opacity-100 transition-opacity">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                          
                          <p className="text-sm mt-1 text-white/80 leading-relaxed">
                            {/* 🚀 SMART EXACT-NAME MATCHING ALGORITHM TO PREVENT DUPLICATES */}
                            {(() => {
                                // 1. Gather all unique names from this specific thread
                                const threadNames = [review.user?.name, ...childReplies.map(r => r.user?.name)].filter(Boolean);
                                // 2. Sort them by longest string first so "Aditya Choudhary" matches before "Aditya"
                                const uniqueNames = [...new Set(threadNames)].sort((a, b) => b.length - a.length);
                                
                                // 3. Try to match the exact name at the start of the comment
                                for (const name of uniqueNames) {
                                    const mention = `@${name} `;
                                    if (reply.comment.startsWith(mention)) {
                                        return (
                                            <>
                                                <span className="text-cyan-400 font-medium text-xs mr-1.5">@{name}</span>
                                                {reply.comment.substring(mention.length)}
                                            </>
                                        );
                                    }
                                }

                                // 4. Fallback if they manually typed a different name: highlight the first word if it starts with @
                                if (reply.comment.startsWith('@')) {
                                    const spaceIdx = reply.comment.indexOf(' ');
                                    if (spaceIdx > 0) {
                                        return (
                                            <>
                                                <span className="text-cyan-400 font-medium text-xs mr-1.5">{reply.comment.substring(0, spaceIdx)}</span>
                                                {reply.comment.substring(spaceIdx + 1)}
                                            </>
                                        );
                                    }
                                }

                                // 5. Safe default: just render text
                                return reply.comment;
                            })()}
                          </p>
                          
                          <button 
                            onClick={() => {
                                setReplyingTo(review._id); 
                                setReplyComment(`@${reply.user?.name || 'User'} `); 
                            }}
                            className="text-[10px] text-muted-foreground font-bold hover:text-cyan-400 mt-2 transition-colors"
                          >
                            Reply
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      
      {topLevelReviews.length === 0 && (
        <p className="text-center text-muted-foreground text-sm py-12 border border-dashed border-white/10 rounded-2xl bg-white/[0.01]">
            No discussions yet. Start the conversation!
        </p>
      )}
    </div>
  );
}