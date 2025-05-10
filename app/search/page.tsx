/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/exhaustive-deps */
"use client";

interface Comment {
  _id: string;
  replies?: Comment[];
  [key: string]: any;
}

import { Suspense, useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, UserPlus } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { PostCard } from "@/components/post-card";
import { MasonryGrid } from "@/components/masonry-grid";
import { useInView } from "react-intersection-observer";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

function SearchPage() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || "";
  const [loading, setLoading] = useState(false);
  const [developers, setDevelopers] = useState([]);
  const [posts, setPosts] = useState<Array<any>>([]);
  const [page, setPage] = useState(1);
  const { ref, inView } = useInView();

  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    if (session) {
      setIsLoggedIn(true);
    }
  }, [session]);

  useEffect(() => {
    if (query) {
      searchDevelopers();
      searchPosts();
    } else {
      // Clear results when query is empty
      setDevelopers([]);
      setPosts([]);
    }
  }, [query]);

  useEffect(() => {
    if (inView && query) {
      // Only load more if there's a query
      loadMorePosts();
    }
  }, [inView, query]); // Added query as a dependency

  const searchDevelopers = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/search?q=${encodeURIComponent(query)}`
      );
      const data = await response.json();
      setDevelopers(data.slice(0, 20));
    } catch {
      toast.error("Failed to search developers. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const searchPosts = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/posts/search?q=${encodeURIComponent(query)}&page=1`
      );
      const data = await response.json();
      setPosts(Array.isArray(data) ? data : []);
      setPage(2);
    } catch {
      toast.error("Failed to search posts. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const loadMorePosts = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const response = await fetch(
        `/api/posts/search?q=${encodeURIComponent(query)}&page=${page}`
      );
      const newPosts = await response.json();
      setPosts((prevPosts) => [
        ...prevPosts,
        ...(Array.isArray(newPosts) ? newPosts : []),
      ]);
      setPage((prevPage) => prevPage + 1);
    } catch {
      toast.error("Failed to load more posts. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const sendFriendRequest = async (developer: any) => {
    try {
      const response = await fetch("/api/friends/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(developer),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to send friend request");
      }

      toast.success("Friend request sent!");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to send friend request";
      toast.error(errorMessage);
    }
  };

  const handleVote = async (postId: string, voteType: "up" | "down") => {
    if (!session) {
      toast.error("You must be logged in to vote");
      return;
    }

    try {
      const response = await fetch(`/api/posts/${postId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voteType }),
      });

      if (!response.ok) {
        throw new Error("Failed to vote");
      }

      const updatedPost = await response.json();
      setPosts((prevPosts) =>
        prevPosts.map((post) => {
          if (post._id === postId) {
            return {
              ...post,
              votes: updatedPost.votes,
              userVotes: updatedPost.userVotes,
            };
          }
          return post;
        })
      );
    } catch {
      toast.error("Failed to vote");
    }
  };

  const handleAddComment = async (
    postId: string,
    content: string,
    parentCommentId?: string
  ) => {
    if (!session) {
      toast.error("You must be logged in to comment");
      return;
    }
    try {
      const response = await fetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, parentCommentId }),
      });

      if (!response.ok) {
        throw new Error("Failed to add comment");
      }

      const updatedPost = await response.json();
      const newComment = updatedPost.comment;
      const addCommentToHierarchy = (
        comments: Comment[],
        newComment: Comment,
        parentId?: string
      ): Comment[] => {
        if (!parentId) {
          return [...comments, newComment];
        }

        return comments.map((comment) => {
          if (comment._id === parentId) {
            return {
              ...comment,
              replies: [...(comment.replies || []), newComment],
            };
          }
          if (comment.replies && comment.replies.length > 0) {
            return {
              ...comment,
              replies: addCommentToHierarchy(
                comment.replies,
                newComment,
                parentId
              ),
            };
          }
          return comment;
        });
      };

      setPosts((prevPosts) =>
        prevPosts.map((post) => {
          if (post._id === postId) {
            return {
              ...post,
              comments: addCommentToHierarchy(
                post.comments,
                newComment,
                parentCommentId
              ),
            };
          }
          return post;
        })
      );

      toast.success("Comment added successfully");
    } catch {
      toast.error("Failed to add comment");
    }
  };
  const handleVotePoll = async (postId: string, optionIndex: number) => {
    if (!session) {
      toast.error("You must be logged in to vote");
      return;
    }

    try {
      const response = await fetch(`/api/posts/${postId}/poll-vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ optionIndex }),
      });

      if (!response.ok) {
        throw new Error("Failed to vote on poll");
      }

      const updatedPost = await response.json();
      setPosts((prevPosts) =>
        prevPosts.map((post) => {
          if (post._id === postId) {
            return { ...post, poll: updatedPost.poll };
          }
          return post;
        })
      );
    } catch {
      toast.error("Failed to vote on poll");
    }
  };

  const handleCommentVote = async (
    postId: string,
    commentId: string,
    voteType: "up" | "down"
  ) => {
    if (!session) {
      toast.error("You must be logged in to vote");
      return;
    }

    try {
      const response = await fetch(
        `/api/posts/${postId}/comments/${commentId}/vote`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ voteType }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to vote on comment");
      }

      const updatedComment = await response.json();
      const updateCommentVotes = (
        comments: Comment[],
        targetId: string
      ): Comment[] => {
        return comments.map((comment) => {
          if (comment._id === targetId) {
            return {
              ...comment,
              votes: updatedComment.votes,
              userVotes: updatedComment.userVotes,
            };
          }
          if (comment.replies && comment.replies.length > 0) {
            return {
              ...comment,
              replies: updateCommentVotes(comment.replies, targetId),
            };
          }
          return comment;
        });
      };

      setPosts((prevPosts) =>
        prevPosts.map((post) => {
          if (post._id === postId) {
            return {
              ...post,
              comments: updateCommentVotes(post.comments, commentId),
            };
          }
          return post;
        })
      );
    } catch {
      toast.error("Failed to vote on comment");
    }
  };
  return (
    <div className="container mx-auto px-4 py-8">
      {query ? (
        <>
          <h1 className="text-3xl font-bold mb-6">
            Search Results for &quot;{query}&quot;
          </h1>

          <div className="space-y-8">
            <section>
              <h2 className="text-2xl font-semibold mb-4">GitHub Profiles</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                {developers.map((dev: any) => (
                  <Card
                    key={dev.id}
                    className="flex items-center space-x-4 p-4  shadow-md rounded-lg hover:shadow-lg transition-all duration-200"
                  >
                    <Image
                      src={dev.avatar_url || "/placeholder.svg"}
                      alt={dev.login}
                      width={80}
                      height={80}
                      className="rounded-full border border-muted"
                    />

                    <div className="flex-1">
                      <CardHeader className="p-0">
                        <CardTitle className="text-lg font-semibold">
                          {dev.login}
                        </CardTitle>
                      </CardHeader>

                      <CardContent className="p-0 mt-2">
                        <div className="flex space-x-3">
                          <Link
                            href={dev.html_url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Button variant="outline" size="sm">
                              View Profile
                            </Button>
                          </Link>

                          {isLoggedIn && (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => sendFriendRequest(dev)}
                            >
                              <UserPlus className="h-4 w-4 mr-2" />
                              Add Friend
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </div>
                  </Card>
                ))}
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Posts</h2>
              <MasonryGrid>
                {posts.map((post) => (
                  <PostCard
                    key={post._id}
                    post={post}
                    onVote={handleVote}
                    onAddComment={handleAddComment}
                    onVotePoll={handleVotePoll}
                    onCommentVote={handleCommentVote}
                  />
                ))}
              </MasonryGrid>
              {loading && (
                <div className="flex justify-center my-4">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              )}
              <div ref={ref} className="h-10" />
            </section>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center min-h-[50vh]">
          <h1 className="text-2xl font-bold mb-4">
            Search for users and posts
          </h1>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const searchInput = e.currentTarget.querySelector("input");
              if (searchInput) {
                const searchQuery = searchInput.value.trim();
                if (searchQuery) {
                  window.location.href = `/search?q=${encodeURIComponent(
                    searchQuery
                  )}`;
                }
              }
            }}
            className="w-full max-w-md"
          >
            <Input
              type="text"
              placeholder="Enter your search query"
              className="w-full"
            />
          </form>
        </div>
      )}
    </div>
  );
}

export default function SearchMain() {
  return (
    <Suspense fallback="Loading...">
      <SearchPage />
    </Suspense>
  );
}
