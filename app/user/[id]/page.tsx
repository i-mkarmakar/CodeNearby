/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Users,
  GitBranch,
  Star,
  LinkIcon,
  Github,
  Twitter,
  MessageSquare,
  Plus,
  GitFork,
  Calendar,
} from "lucide-react";
import Link from "next/link";
import type { UserProfile } from "@/types";
import { PostCard } from "@/components/post-card";
import { formatDistanceToNow } from "date-fns";
import { fetchGitHubActivities } from "@/lib/github";
import { useSession } from "next-auth/react";
import ProfileHeader from "@/components/home/ProfileHeader";
import { MasonryGrid } from "@/components/masonry-grid";
import { Session } from "next-auth";
import { toast } from "sonner";
import GithubCard from "@/components/github-card";
import { Spotlight } from "@/components/ui/spotlight-new";
import { ActivityHeatmap } from "@/components/activity-heatmap";

interface Post {
  _id: string;
  userId: string;
  content: string;
  imageUrl?: string;
  createdAt: string;
  votes: { up: number; down: number };
  userVotes: Record<string, number>;
  comments: Comment[];
  poll?: Poll;
  location?: { lat: number; lng: number };
  schedule?: string;
  user: {
    name: string;
    image: string;
    githubId: string;
  };
}

interface Comment {
  _id: string;
  userId: string;
  content: string;
  createdAt: string;
  votes: { up: number; down: number };
  userVotes: Record<string, number>;
  replies: Comment[];
  user?: {
    name: string;
    image: string;
  };
}

interface Poll {
  question: string;
  options: string[];
  votes: Record<string, number>;
}

export default function UserProfilePage() {
  const { data: session } = useSession() as { data: Session | null };
  const params = useParams();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const router = useRouter();

  const [appearance, setAppearance] = useState<{
    theme: "default" | "blue" | "green" | "purple" | "orange";
    showActivity: boolean;
    compactPosts: boolean;
    highlightCode: boolean;
    showSpotlight: boolean;
  }>({
    theme: "default",
    showActivity: false,
    compactPosts: false,
    highlightCode: false,
    showSpotlight: false,
  });

  const loadActivities = async (username: string) => {
    if (!username) return;

    try {
      if (appearance?.showActivity) return;
      const data = await fetchGitHubActivities(username);
      setActivities(data);
    } catch {
      toast.error("Error", {
        description: "Failed to fetch GitHub activities.",
      });
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [params.id]);

  useEffect(() => {
    if (profile) {
      fetchGitHubStats();
      fetchUserPosts();
      loadActivities(profile.githubUsername);
    }
  }, [profile]);

  const fetchProfile = async () => {
    try {
      const response = await fetch(`/api/user/${params.id}`);
      const data = await response.json();
      // if (data.status === 200) {
      // }
      if (response.ok) {
        setProfile(data);
        setAppearance(data.appearance);
      } else {
        setProfile(null);
        toast.error("Error", { description: "Failed to fetch profile." });
      }
    } catch {
      toast.error("Error", { description: "Failed to fetch profile." });
    } finally {
      setLoading(false);
    }
  };

  if (parseInt(session?.user?.githubId || "") === profile?.githubId) {
    router.push("/profile");
  }

  const fetchGitHubStats = async () => {
    if (!profile?.githubUsername) return;
    try {
      const response = await fetch(
        `https://api.github.com/users/${profile.githubUsername}`
      );
      const data = await response.json();
      setStats(data);
    } catch {
      toast.error("Error", {
        description: "Failed to fetch GitHub stats.",
      });
    }
  };

  const fetchUserPosts = async () => {
    if (!profile) {
      return;
    }
    try {
      const response = await fetch(`/api/posts/user/${profile._id}`);
      const data = await response.json();
      setPosts(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching posts:", error);

      toast.error("Error", {
        description: "Failed to fetch user posts.",
      });
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
      toast.error("Error", {
        description: "You must be logged in to vote",
      });
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

  const handleAddFriend = async () => {
    if (!profile) {
      return;
    }
    try {
      await fetch("/api/friends/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: profile.githubId,
          login: profile.githubUsername,
          avatar_url: profile.image,
          html_url: `https://github.com/${profile.githubUsername}`,
        }),
      });
      toast.success("Success", { description: "Friend request sent!" });
    } catch {
      toast.error("Error", { description: "Failed to send request." });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return <GithubCard userId={params.id as string} />;
  }

  return (
    <div className="max-w-7xl mx-auto">
      {appearance?.showSpotlight && (
        <div className="absolute top-0 right-0 w-full -z-50">
          <div className="w-full rounded-md -z-50 flex md:items-center md:justify-center antialiased dark:bg-transparent  relative overflow-hidden h-[calc(100vh-10rem)]">
            <Spotlight themeColor={appearance?.theme} />
          </div>
        </div>
      )}
      <ProfileHeader
        imageUrl={profile.image || "/placeholder.svg"}
        bannerUrl={profile.bannerImage || "/bg.webp"}
        appearance={appearance}
      />
      <div className="mt-20 px-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end">
          <div>
            <h1 className="text-3xl font-bold">{profile.name}</h1>
            <p className="text-muted-foreground">@{profile.githubUsername}</p>
            {profile.githubBio && (
              <p className="text-muted-foreground mt-1.5 max-w-2xl">
                {profile.githubBio}
              </p>
            )}
          </div>
          <div className="md:flex flex-wrap grid grid-cols-2 w-full md:w-auto items-center gap-2 mt-4 md:mt-0">
            <Link
              href={`https://github.com/${profile.githubUsername}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button
                variant={
                  appearance?.theme !== "default" ? "default" : "outline"
                }
                className={`w-full md:w-auto ${
                  appearance?.theme === "blue"
                    ? "bg-blue-900 text-white hover:bg-blue-950"
                    : appearance?.theme === "green"
                    ? "bg-green-900 text-white hover:bg-green-950"
                    : appearance?.theme === "purple"
                    ? "bg-purple-900 text-white hover:bg-purple-950"
                    : appearance?.theme === "orange"
                    ? "bg-orange-900 text-white hover:bg-orange-950"
                    : ""
                } transition-all duration-200`}
                size="sm"
              >
                <Github className="h-4 w-4 mr-2" />
                GitHub Profile
              </Button>
            </Link>
            {stats?.twitter_username && (
              <Link
                href={`https://twitter.com/${stats.twitter_username}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button
                  variant={
                    appearance?.theme !== "default" ? "default" : "outline"
                  }
                  className={`w-full md:w-auto ${
                    appearance?.theme === "blue"
                      ? "bg-blue-900 text-white hover:bg-blue-950"
                      : appearance?.theme === "green"
                      ? "bg-green-900 text-white hover:bg-green-950"
                      : appearance?.theme === "purple"
                      ? "bg-purple-900 text-white hover:bg-purple-950"
                      : appearance?.theme === "orange"
                      ? "bg-orange-900 text-white hover:bg-orange-950"
                      : ""
                  } transition-all duration-200`}
                  size="sm"
                >
                  <Twitter className="h-4 w-4 mr-2" />
                  Twitter
                </Button>
              </Link>
            )}
            {stats?.blog && (
              <Link href={stats.blog} target="_blank" rel="noopener noreferrer">
                <Button
                  variant={
                    appearance?.theme !== "default" ? "default" : "outline"
                  }
                  className={`w-full md:w-auto ${
                    appearance?.theme === "blue"
                      ? "bg-blue-900 text-white hover:bg-blue-950"
                      : appearance?.theme === "green"
                      ? "bg-green-900 text-white hover:bg-green-950"
                      : appearance?.theme === "purple"
                      ? "bg-purple-900 text-white hover:bg-purple-950"
                      : appearance?.theme === "orange"
                      ? "bg-orange-900 text-white hover:bg-orange-950"
                      : ""
                  } transition-all duration-200`}
                  size="sm"
                >
                  <LinkIcon className="h-4 w-4 mr-2" />
                  Website
                </Button>
              </Link>
            )}
            {profile.friends?.includes(
              session?.user?.githubId ? parseInt(session.user.githubId) : -1
            ) ? (
              <Link href={`/messages/${profile.githubId}`}>
                <Button
                  variant={
                    appearance?.theme !== "default" ? "default" : "outline"
                  }
                  className={`w-full md:w-auto ${
                    appearance?.theme === "blue"
                      ? "bg-blue-900 text-white hover:bg-blue-950"
                      : appearance?.theme === "green"
                      ? "bg-green-900 text-white hover:bg-green-950"
                      : appearance?.theme === "purple"
                      ? "bg-purple-900 text-white hover:bg-purple-950"
                      : appearance?.theme === "orange"
                      ? "bg-orange-900 text-white hover:bg-orange-950"
                      : ""
                  } transition-all duration-200`}
                  size="sm"
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Message
                </Button>
              </Link>
            ) : (
              <Button
                variant="default"
                size="sm"
                className="w-full md:w-auto"
                onClick={async () => {
                  await handleAddFriend();
                  const btn = document.getElementById(
                    `add-friend-${profile?.githubId}`
                  );
                  if (btn) {
                    btn.textContent = "Request Sent";
                    (btn as HTMLButtonElement).disabled = true;
                  }
                }}
                id={`add-friend-${profile?.githubId}`}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Friend
              </Button>
            )}
          </div>
        </div>
        {profile.skills && profile.skills.length > 0 && (
          <div className="my-4">
            <div className="flex flex-wrap gap-1.5">
              {profile.skills.map((skill: string, index: number) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className={`bg-primary/10 hover:bg-primary/15 text-primary font-semibold ${
                    appearance?.theme === "blue"
                      ? "bg-blue-500/10 hover:bg-blue-500/15 text-blue-500"
                      : appearance?.theme === "green"
                      ? "bg-green-500/10 hover:bg-green-500/15 text-green-500"
                      : appearance?.theme === "purple"
                      ? "bg-purple-500/10 hover:bg-purple-500/15 text-purple-500"
                      : appearance?.theme === "orange"
                      ? "bg-orange-500/10 hover:bg-orange-500/15 text-orange-500"
                      : ""
                  }`}
                >
                  {skill}
                </Badge>
              ))}
            </div>
          </div>
        )}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card
            className={
              appearance?.theme !== "default"
                ? `${
                    appearance?.theme === "blue"
                      ? "dark:bg-blue-500 bg-blue-300 bg-opacity-10 hover:bg-opacity-20 dark:bg-opacity-10 dark:hover:bg-opacity-20"
                      : appearance?.theme === "green"
                      ? "dark:bg-green-500 bg-green-300 bg-opacity-10 hover:bg-opacity-20 dark:bg-opacity-10 dark:hover:bg-opacity-20"
                      : appearance?.theme === "purple"
                      ? "dark:bg-purple-500 bg-purple-300 bg-opacity-10 hover:bg-opacity-20 dark:bg-opacity-10 dark:hover:bg-opacity-20"
                      : appearance?.theme === "orange"
                      ? "dark:bg-orange-500 bg-orange-300 bg-opacity-10 hover:bg-opacity-20 dark:bg-opacity-10 dark:hover:bg-opacity-20"
                      : ""
                  } transition-all duration-200`
                : ""
            }
          >
            <CardContent className="pt-6">
              <div className="flex flex-col items-center">
                <Users
                  className={`h-5 w-5 mb-2 text-primary ${
                    appearance?.theme === "blue"
                      ? "text-blue-500"
                      : appearance?.theme === "green"
                      ? "text-green-500"
                      : appearance?.theme === "purple"
                      ? "text-purple-500"
                      : appearance?.theme === "orange"
                      ? "text-orange-500"
                      : ""
                  }`}
                />
                <span className="text-2xl font-bold">
                  {profile?.friends?.length || 0}
                </span>
                <span className="text-sm dark:text-muted-foreground">
                  Friends
                </span>
              </div>
            </CardContent>
          </Card>
          <Card
            className={
              appearance?.theme !== "default"
                ? `${
                    appearance?.theme === "blue"
                      ? "dark:bg-blue-500 bg-blue-300 bg-opacity-10 hover:bg-opacity-20 dark:bg-opacity-10 dark:hover:bg-opacity-20"
                      : appearance?.theme === "green"
                      ? "dark:bg-green-500 bg-green-300 bg-opacity-10 hover:bg-opacity-20 dark:bg-opacity-10 dark:hover:bg-opacity-20"
                      : appearance?.theme === "purple"
                      ? "dark:bg-purple-500 bg-purple-300 bg-opacity-10 hover:bg-opacity-20 dark:bg-opacity-10 dark:hover:bg-opacity-20"
                      : appearance?.theme === "orange"
                      ? "dark:bg-orange-500 bg-orange-300 bg-opacity-10 hover:bg-opacity-20 dark:bg-opacity-10 dark:hover:bg-opacity-20"
                      : ""
                  } transition-all duration-200`
                : ""
            }
          >
            <CardContent className="pt-6">
              <div className="flex flex-col items-center">
                <GitBranch
                  className={`h-5 w-5 mb-2 text-primary ${
                    appearance?.theme === "blue"
                      ? "text-blue-500"
                      : appearance?.theme === "green"
                      ? "text-green-500"
                      : appearance?.theme === "purple"
                      ? "text-purple-500"
                      : appearance?.theme === "orange"
                      ? "text-orange-500"
                      : ""
                  }`}
                />
                <span className="text-2xl font-bold">
                  {stats?.public_repos || 0}
                </span>
                <span className="text-sm dark:text-muted-foreground">
                  Repositories
                </span>
              </div>
            </CardContent>
          </Card>
          <Card
            className={
              appearance?.theme !== "default"
                ? `${
                    appearance?.theme === "blue"
                      ? "dark:bg-blue-500 bg-blue-300 bg-opacity-10 hover:bg-opacity-20 dark:bg-opacity-10 dark:hover:bg-opacity-20"
                      : appearance?.theme === "green"
                      ? "dark:bg-green-500 bg-green-300 bg-opacity-10 hover:bg-opacity-20 dark:bg-opacity-10 dark:hover:bg-opacity-20"
                      : appearance?.theme === "purple"
                      ? "dark:bg-purple-500 bg-purple-300 bg-opacity-10 hover:bg-opacity-20 dark:bg-opacity-10 dark:hover:bg-opacity-20"
                      : appearance?.theme === "orange"
                      ? "dark:bg-orange-500 bg-orange-300 bg-opacity-10 hover:bg-opacity-20 dark:bg-opacity-10 dark:hover:bg-opacity-20"
                      : ""
                  } transition-all duration-200`
                : ""
            }
          >
            <CardContent className="pt-6">
              <div className="flex flex-col items-center">
                <Star
                  className={`h-5 w-5 mb-2 text-primary ${
                    appearance?.theme === "blue"
                      ? "text-blue-500"
                      : appearance?.theme === "green"
                      ? "text-green-500"
                      : appearance?.theme === "purple"
                      ? "text-purple-500"
                      : appearance?.theme === "orange"
                      ? "text-orange-500"
                      : ""
                  }`}
                />
                <span className="text-2xl font-bold">
                  {stats?.followers || 0}
                </span>
                <span className="text-sm dark:text-muted-foreground">
                  Followers
                </span>
              </div>
            </CardContent>
          </Card>
          <Card
            className={
              appearance?.theme !== "default"
                ? `${
                    appearance?.theme === "blue"
                      ? "dark:bg-blue-500 bg-blue-300 bg-opacity-10 hover:bg-opacity-20 dark:bg-opacity-10 dark:hover:bg-opacity-20"
                      : appearance?.theme === "green"
                      ? "dark:bg-green-500 bg-green-300 bg-opacity-10 hover:bg-opacity-20 dark:bg-opacity-10 dark:hover:bg-opacity-20"
                      : appearance?.theme === "purple"
                      ? "dark:bg-purple-500 bg-purple-300 bg-opacity-10 hover:bg-opacity-20 dark:bg-opacity-10 dark:hover:bg-opacity-20"
                      : appearance?.theme === "orange"
                      ? "dark:bg-orange-500 bg-orange-300 bg-opacity-10 hover:bg-opacity-20 dark:bg-opacity-10 dark:hover:bg-opacity-20"
                      : ""
                  } transition-all duration-200`
                : ""
            }
          >
            <CardContent className="pt-6">
              <div className="flex flex-col items-center">
                <Calendar
                  className={`h-5 w-5 mb-2 text-primary ${
                    appearance?.theme === "blue"
                      ? "text-blue-500"
                      : appearance?.theme === "green"
                      ? "text-green-500"
                      : appearance?.theme === "purple"
                      ? "text-purple-500"
                      : appearance?.theme === "orange"
                      ? "text-orange-500"
                      : ""
                  }`}
                />
                <span className="text-2xl font-bold">
                  {new Date(stats?.created_at || Date.now()).getFullYear()}
                </span>
                <span className="text-sm dark:text-muted-foreground">
                  Joined GitHub
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
        {/* Pinned Repositories Section */}
        {profile.pinnedRepos && profile.pinnedRepos.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Pinned Repositories</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {profile.pinnedRepos.map((repo) => (
                <Card key={repo.id}>
                  <CardContent className="p-5">
                    <div className="flex flex-col h-full">
                      <div className="flex items-start gap-3 mb-3">
                        <div>
                          <h3 className="font-medium">
                            <Link
                              href={repo.html_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:text-primary transition-colors hover:underline"
                            >
                              {repo.name}
                            </Link>
                          </h3>
                          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                            {repo.description || "No description available"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-sm mt-auto">
                        {repo.language && (
                          <div className="flex items-center">
                            <span
                              className={`h-3 w-3 rounded-full mr-1.5 
                              ${
                                appearance?.theme === "blue"
                                  ? "bg-blue-500/70"
                                  : appearance?.theme === "green"
                                  ? "bg-green-500/70"
                                  : appearance?.theme === "purple"
                                  ? "bg-purple-500/70"
                                  : appearance?.theme === "orange"
                                  ? "bg-orange-500/70"
                                  : "bg-primary/70"
                              }`}
                            />
                            <span>{repo.language}</span>
                          </div>
                        )}
                        <div className="flex items-center">
                          <Star className="h-4 w-4 mr-1" />
                          <span>{repo.stargazers_count}</span>
                        </div>
                        <div className="flex items-center">
                          <GitFork className="h-4 w-4 mr-1" />
                          <span>{repo.forks_count}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
        <Tabs defaultValue="posts">
          <TabsList>
            <TabsTrigger value="posts">Posts</TabsTrigger>
            {appearance?.showActivity && (
              <TabsTrigger value="activity">Recent Activity</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="activity">
            <Card>
              <CardContent className="p-6">
                {activities.length === 0 ? (
                  <p className="text-muted-foreground">
                    No recent GitHub activity found.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {activities.map((activity) => (
                      <div
                        key={activity.id}
                        className="flex items-start gap-4 py-3 border-b"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {activity.type.replace("Event", "")}
                            </span>
                            <span className="text-muted-foreground text-sm">
                              {formatDistanceToNow(
                                new Date(activity.created_at),
                                { addSuffix: true }
                              )}
                            </span>
                          </div>
                          <Link
                            href={`https://github.com/${activity.repo.name}`}
                            className="text-sm hover:underline text-muted-foreground"
                            target="_blank"
                          >
                            {activity.repo.name}
                          </Link>
                          {activity.payload?.commits && (
                            <div className="mt-2 space-y-1">
                              {activity.payload.commits.map((commit: any) => (
                                <div key={commit.sha} className="text-sm">
                                  <Link
                                    href={`https://github.com/${activity.repo.name}/commit/${commit.sha}`}
                                    className="text-xs font-mono text-muted-foreground hover:underline"
                                    target="_blank"
                                  >
                                    {commit.sha.substring(0, 7)}
                                  </Link>
                                  <span className="ml-2">{commit.message}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="posts">
            <div className="space-y-6">
              {posts.length > 0 ? (
                <MasonryGrid>
                  {posts.map((post) => (
                    <PostCard
                      key={post._id}
                      post={post}
                      onVote={handleVote}
                      onAddComment={handleAddComment}
                      onVotePoll={handleVotePoll}
                      onCommentVote={handleCommentVote}
                      compactView={appearance?.compactPosts}
                    />
                  ))}
                </MasonryGrid>
              ) : (
                <p className="text-muted-foreground w-full text-center">
                  No posts found.
                </p>
              )}
            </div>
          </TabsContent>
        </Tabs>
        <div className="mt-8">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">
            Activity Overview
          </h1>
          <ActivityHeatmap data={{ posts, themeColor: appearance?.theme }} />
        </div>
      </div>
    </div>
  );
}
