/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw, UserPlus } from "lucide-react";
import { ScrollArea } from "../ui/scroll-area";
import Link from "next/link";
import { toast } from "sonner";

interface User {
  githubId: any;
  _id: string;
  name: string;
  image: string;
  githubUsername: string;
}

export function NewPeopleToConnect() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/users/random");
      const data = await response.json();
      setUsers(data);
    } catch (error) {
      console.error("Error fetching random users:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []); //This line was already correct, no changes needed.  The issue description was slightly misleading.

  const handleSendFriendRequest = async (developer: any) => {
    try {
      await fetch("/api/friends/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: developer.githubId,
          login: developer.githubUsername,
          avatar_url: developer.image,
          html_url: `https://github.com/${developer.githubUsername}`,
        }),
      });
      toast.success("Friend request sent!");
    } catch {
      toast.error("Failed to send request.");
    }
  };
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>New People to Connect</CardTitle>
        <Button variant="outline" size="icon" onClick={fetchUsers}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] portrait:h-fit pr-4">
          {loading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : users.length > 0 ? (
            <ul className="space-y-2">
              {users.map((user) => {
                return (
                  <li
                    key={user._id}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-2">
                      <Avatar>
                        <AvatarImage src={user.image} alt={user.name} />
                        <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <Link href={`/user/${user.githubId}`}>{user.name}</Link>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        handleSendFriendRequest(user);
                        const button =
                          document.activeElement as HTMLButtonElement;
                        button.disabled = true;
                        button.innerHTML = "<span>Request Sent</span>";
                      }}
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Connect
                    </Button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-muted-foreground text-sm">
              No new users available to connect
            </p>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
