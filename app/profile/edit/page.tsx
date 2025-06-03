/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Loader2,
  Save,
  Camera,
  ArrowLeft,
  X,
  Check,
  ImageIcon,
  Trash2,
  Star,
  GitFork,
  Search,
  Pin,
  Github,
  CodeIcon,
} from "lucide-react";
import { toast } from "sonner";
import type { UserProfile, PinnedRepo } from "@/types";
import ReactCrop, { type Crop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Image from "next/image";
import { fetchUserRepositories } from "@/lib/github";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { AnimatePresence, motion } from "framer-motion";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

// List of popular programming skills
const popularSkills = [
  "JavaScript",
  "TypeScript",
  "React",
  "Next.js",
  "Node.js",
  "Python",
  "Java",
  "C#",
  "Go",
  "Rust",
  "PHP",
  "Ruby",
  "Swift",
  "Kotlin",
  "HTML",
  "CSS",
  "SQL",
  "MongoDB",
  "GraphQL",
  "Docker",
  "AWS",
  "Azure",
  "Git",
  "DevOps",
  "TailwindCSS",
  "Vue.js",
  "Angular",
  "Svelte",
  "Flutter",
  "React Native",
];

// Component to safely use search parameters with Suspense
function TabParamReader({
  onParamLoad,
}: {
  onParamLoad: (param: string | null) => void;
}) {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");

  useEffect(() => {
    onParamLoad(tabParam);
  }, [tabParam, onParamLoad]);

  return null;
}

export default function EditProfilePage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [activeTab, setActiveTab] = useState<string>("information");
  const [skills, setSkills] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [customSkill, setCustomSkill] = useState("");

  // For repositories
  const [repositories, setRepositories] = useState<PinnedRepo[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [pinnedRepos, setPinnedRepos] = useState<PinnedRepo[]>([]);

  // For profile image cropping
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [imageType, setImageType] = useState<"profile" | "banner">("profile");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [crop, setCrop] = useState<Crop>({
    unit: "%",
    width: 90,
    height: 90,
    x: 5,
    y: 5,
  });
  const [completedCrop, setCompletedCrop] = useState<Crop | null>(null);
  const [croppedProfileImage, setCroppedProfileImage] = useState<string | null>(
    null
  );
  const [croppedBannerImage, setCroppedBannerImage] = useState<string | null>(
    null
  );

  // For image preview modal
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);

  const imageRef = useRef<HTMLImageElement | null>(null);
  const profileInputRef = useRef<HTMLInputElement | null>(null);
  const bannerInputRef = useRef<HTMLInputElement | null>(null);

  // Appearance settings
  const [appearance, setAppearance] = useState({
    theme: "default",
    showActivity: true,
    compactPosts: false,
    highlightCode: true,
    showSpotlight: true,
  });

  // Handler for tab parameter
  const handleTabParamLoad = (param: string | null) => {
    if (param) {
      setActiveTab(param);
    }
  };

  useEffect(() => {
    if (!session) {
      router.push("/profile");
      return;
    }

    fetchProfile();
  }, [session, router]);

  // Fetch the GitHub repositories when the profile loads
  useEffect(() => {
    if (profile?.githubUsername) {
      loadRepositories();
    }
  }, [profile]);

  const fetchProfile = async () => {
    try {
      const response = await fetch("/api/profile");
      const data = await response.json();
      setProfile(data);
      setName(data.name || "");
      setBio(data.githubBio || "");
      setLocation(data.githubLocation || "");
      setSkills(data.skills || []);

      // Initialize pinned repos if they exist
      if (data.pinnedRepos && data.pinnedRepos.length > 0) {
        setPinnedRepos(data.pinnedRepos);
      }

      // Initialize appearance settings if they exist
      if (data.appearance) {
        setAppearance(data.appearance);
      }
    } catch {
      toast.error("Failed to fetch profile.");
    } finally {
      setLoading(false);
    }
  };

  const loadRepositories = async () => {
    if (!profile?.githubUsername) return;

    setLoadingRepos(true);
    try {
      const repos = await fetchUserRepositories(profile.githubUsername);
      setRepositories(repos);
    } catch {
      toast.error("Failed to load repositories.");
    } finally {
      setLoadingRepos(false);
    }
  };

  const handleSave = async () => {
    if (!session) return;

    setSaving(true);
    try {
      let profileImageUrl = profile?.image;
      let bannerImageUrl = profile?.bannerImage;

      // If there's a cropped profile image, upload it first
      if (croppedProfileImage) {
        profileImageUrl = await uploadImage(croppedProfileImage);
      }

      // If there's a cropped banner image, upload it
      if (croppedBannerImage) {
        bannerImageUrl = await uploadImage(croppedBannerImage);
      }

      const response = await fetch("/api/profile/update", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          githubBio: bio,
          githubLocation: location,
          image: profileImageUrl,
          bannerImage: bannerImageUrl,
          pinnedRepos,
          appearance,
          skills,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update profile");
      }

      toast.success("Profile updated successfully!");
      router.push("/profile");
    } catch {
      toast.error("Failed to update profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const uploadImage = async (base64Image: string) => {
    // Convert base64 to blob
    const fetchResponse = await fetch(base64Image);
    const blob = await fetchResponse.blob();

    // Create form data
    const formData = new FormData();
    formData.append("file", blob, "image.jpg");

    // Upload to server
    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error("Failed to upload image");
    }

    const data = await response.json();
    return data.imageUrl;
  };

  const handleImageChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "profile" | "banner"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setImagePreview(reader.result);
        setImageType(type);

        // Set different crop settings for profile vs banner
        if (type === "profile") {
          setCrop({
            unit: "%",
            width: 90,
            height: 90,
            x: 5,
            y: 5,
          });
        } else {
          setCrop({
            unit: "%",
            width: 90,
            height: 40,
            x: 5,
            y: 5,
          });
        }

        setCropDialogOpen(true);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCropComplete = (crop: Crop) => {
    setCompletedCrop(crop);
  };

  const getCroppedImg = () => {
    if (!imageRef.current || !completedCrop) return;

    const canvas = document.createElement("canvas");
    const scaleX = imageRef.current.naturalWidth / imageRef.current.width;
    const scaleY = imageRef.current.naturalHeight / imageRef.current.height;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const pixelRatio = window.devicePixelRatio;
    canvas.width = completedCrop.width * scaleX * pixelRatio;
    canvas.height = completedCrop.height * scaleY * pixelRatio;

    ctx.scale(pixelRatio, pixelRatio);
    ctx.imageSmoothingQuality = "high";

    const cropX = completedCrop.x * scaleX;
    const cropY = completedCrop.y * scaleY;
    const cropWidth = completedCrop.width * scaleX;
    const cropHeight = completedCrop.height * scaleY;

    ctx.drawImage(
      imageRef.current,
      cropX,
      cropY,
      cropWidth,
      cropHeight,
      0,
      0,
      cropWidth,
      cropHeight
    );

    const base64Image = canvas.toDataURL("image/jpeg", 0.95);

    if (imageType === "profile") {
      setCroppedProfileImage(base64Image);
    } else {
      setCroppedBannerImage(base64Image);
    }

    setCropDialogOpen(false);
  };

  const clearBannerImage = () => {
    setCroppedBannerImage(null);
  };

  const handleOpenPreview = (image: string, id: string) => {
    setPreviewImage(image);
    setPreviewId(id);
  };

  const handleClosePreview = () => {
    setPreviewImage(null);
    setPreviewId(null);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <Suspense>
      <TabParamReader onParamLoad={handleTabParamLoad} />
      <div className="mx-auto px-2 max-w-4xl py-8">
        <div className="flex flex-col items-start mb-6">
          <span
            onClick={() => router.push("/profile")}
            className="flex items-center cursor-pointer text-sm text-muted-foreground mb-2 hover:text-primary transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2 inline" />
            Back to Profile
          </span>
          <h1 className="text-4xl font-bold">Edit Profile</h1>
        </div>

        <div className="space-y-8">
          {/* Banner Image Section */}
          <Card className="border-2 border-dashed border-primary/20 hover:border-primary/50 transition-colors">
            <div className="relative w-full h-[180px] overflow-hidden rounded-t-lg">
              {croppedBannerImage || profile?.bannerImage ? (
                <>
                  <motion.div
                    layoutId="banner"
                    className="w-full h-full cursor-pointer"
                    onClick={() =>
                      handleOpenPreview(
                        croppedBannerImage ||
                          profile?.bannerImage ||
                          "/bg.webp",
                        "banner"
                      )
                    }
                  >
                    <Image
                      src={
                        croppedBannerImage || profile?.bannerImage || "/bg.webp"
                      }
                      alt="Banner"
                      fill
                      className="object-cover"
                      style={{ pointerEvents: "none" }}
                      priority
                    />
                  </motion.div>
                  <div className="absolute bottom-4 right-4 flex gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      className="rounded-full"
                      onClick={() => bannerInputRef.current?.click()}
                    >
                      <Camera className="h-4 w-4 mr-2" />
                      Change
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="rounded-full"
                      onClick={clearBannerImage}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Remove
                    </Button>
                  </div>
                </>
              ) : (
                <div
                  className="flex flex-col items-center justify-center w-full h-full bg-muted cursor-pointer"
                  onClick={() => bannerInputRef.current?.click()}
                >
                  <ImageIcon className="h-12 w-12 mb-2 text-primary/50" />
                  <p className="text-sm font-medium">
                    Click to add a banner image
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Recommended size: 1500x500
                  </p>
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                ref={bannerInputRef}
                onChange={(e) => handleImageChange(e, "banner")}
              />
            </div>

            <CardContent className="pt-6">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <div
                    className="h-24 w-24 rounded-full overflow-hidden border-4 border-background shadow-lg cursor-pointer"
                    onClick={() =>
                      handleOpenPreview(
                        croppedProfileImage ||
                          profile?.image ||
                          "/placeholder.svg",
                        "profile"
                      )
                    }
                  >
                    <motion.div layoutId="profile">
                      <img
                        src={
                          croppedProfileImage ||
                          profile?.image ||
                          "/placeholder.svg"
                        }
                        alt="Profile"
                        className="h-full w-full object-cover"
                        style={{ pointerEvents: "none" }}
                      />
                    </motion.div>
                  </div>
                  <Button
                    size="icon"
                    variant="secondary"
                    className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full shadow-md"
                    onClick={() => profileInputRef.current?.click()}
                  >
                    <Camera className="h-4 w-4" />
                  </Button>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    ref={profileInputRef}
                    onChange={(e) => handleImageChange(e, "profile")}
                  />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">
                    {name || "Your Name"}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    @{profile?.githubUsername}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue={activeTab} className="space-y-4">
            <TabsList className="w-full">
              <TabsTrigger value="information" className="flex-1">
                Profile Information
              </TabsTrigger>
              <TabsTrigger value="repositories" className="flex-1">
                Pinned Repositories
              </TabsTrigger>
              <TabsTrigger value="appearance" className="flex-1">
                Appearance
              </TabsTrigger>
            </TabsList>

            <TabsContent value="information" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Personal Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="name">Display Name</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      value={profile?.githubUsername || ""}
                      disabled
                      className="bg-muted"
                    />
                    <span className="text-xs text-muted-foreground">
                      Username cannot be changed (synced with GitHub)
                    </span>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bio">Bio</Label>
                    <Textarea
                      id="bio"
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Tell us about yourself"
                      rows={4}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="Your location"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="skills">Skills</Label>{" "}
                    <div className="flex flex-wrap gap-2 mb-2">
                      {skills.map((skill, index) => (
                        <Badge
                          key={index}
                          variant="secondary"
                          className="gap-1 px-3 py-1"
                        >
                          {skill}
                          <X
                            className="h-3 w-3 ml-1 cursor-pointer hover:text-destructive"
                            onClick={() => {
                              setSkills(skills.filter((_, i) => i !== index));
                            }}
                          />
                        </Badge>
                      ))}
                      {skills.length === 15 && (
                        <Badge
                          variant="outline"
                          className="bg-yellow-100/20 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300"
                        >
                          Maximum limit reached
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        id="customSkill"
                        value={customSkill}
                        onChange={(e) => setCustomSkill(e.target.value)}
                        placeholder="Add a skill (e.g., JavaScript, React, Python)"
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && customSkill.trim()) {
                            e.preventDefault();
                            if (
                              !skills.includes(customSkill.trim()) &&
                              skills.length < 15
                            ) {
                              setSkills([...skills, customSkill.trim()]);
                              setCustomSkill("");
                            } else if (skills.length >= 15) {
                              toast.error("You can add a maximum of 15 skills");
                            }
                          }
                        }}
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => {
                          if (
                            customSkill.trim() &&
                            !skills.includes(customSkill.trim()) &&
                            skills.length < 15
                          ) {
                            setSkills([...skills, customSkill.trim()]);
                            setCustomSkill("");
                          } else if (skills.length >= 15) {
                            toast.error("You can add a maximum of 15 skills");
                          }
                        }}
                      >
                        Add
                      </Button>
                    </div>{" "}
                    <p className="text-xs text-muted-foreground mt-1">
                      Press Enter to add a skill, or click the Add button. These
                      skills will be displayed on your profile. Maximum of 15
                      skills allowed.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="popularSkills">Popular Skills</Label>
                    <div className="flex flex-wrap gap-2">
                      {popularSkills.map((skill, index) => (
                        <Badge
                          key={index}
                          variant="outline"
                          className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                          onClick={() => {
                            if (!skills.includes(skill) && skills.length < 15) {
                              setSkills([...skills, skill]);
                            } else if (skills.length >= 15) {
                              toast.error("You can add a maximum of 15 skills");
                            }
                          }}
                        >
                          {skill}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Click on a skill to add it to your profile.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="repositories" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Pinned Repositories</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <p className="text-sm text-muted-foreground mb-4">
                      Select up to 2 repositories to showcase on your profile.
                      These will be visible to anyone who visits your profile.
                    </p>

                    {/* Currently pinned repositories */}
                    <div className="mb-6">
                      <h3 className="text-sm font-medium mb-3">
                        Currently Pinned
                      </h3>
                      {pinnedRepos.length === 0 ? (
                        <div className="bg-muted p-4 rounded-md text-center">
                          <p className="text-sm text-muted-foreground">
                            No repositories pinned yet
                          </p>
                        </div>
                      ) : (
                        <div className="grid gap-3">
                          {pinnedRepos.map((repo) => (
                            <div
                              key={repo.id}
                              className="flex items-start justify-between bg-card border rounded-md p-3"
                            >
                              <div className="flex-1 mr-4">
                                <div className="flex items-center gap-2 mb-1">
                                  <Pin className="h-4 w-4 text-primary" />
                                  <span className="font-medium">
                                    {repo.name}
                                  </span>
                                </div>
                                <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                                  {repo.description || "No description"}
                                </p>
                                <div className="flex items-center gap-3 text-xs">
                                  {repo.language && (
                                    <div className="flex items-center">
                                      <CodeIcon className="h-3 w-3 mr-1" />
                                      <span>{repo.language}</span>
                                    </div>
                                  )}
                                  <div className="flex items-center">
                                    <Star className="h-3 w-3 mr-1" />
                                    <span>{repo.stargazers_count}</span>
                                  </div>
                                  <div className="flex items-center">
                                    <GitFork className="h-3 w-3 mr-1" />
                                    <span>{repo.forks_count}</span>
                                  </div>
                                </div>
                              </div>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => {
                                  setPinnedRepos(
                                    pinnedRepos.filter((r) => r.id !== repo.id)
                                  );
                                  toast.success(`Unpinned ${repo.name}`);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Repository search and selection */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-medium">Add Repositories</h3>
                      <div className="relative">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search your repositories"
                          className="pl-9"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                        />
                      </div>

                      {loadingRepos ? (
                        <div className="flex justify-center p-8">
                          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                      ) : (
                        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                          {repositories
                            .filter(
                              (repo) =>
                                repo.name
                                  .toLowerCase()
                                  .includes(searchTerm.toLowerCase()) ||
                                (repo.description &&
                                  repo.description
                                    .toLowerCase()
                                    .includes(searchTerm.toLowerCase()))
                            )
                            .map((repo) => {
                              const isPinned = pinnedRepos.some(
                                (r) => r.id === repo.id
                              );
                              const isPinningDisabled =
                                pinnedRepos.length >= 2 && !isPinned;

                              return (
                                <div
                                  key={repo.id}
                                  className="flex items-start justify-between border rounded-md p-3 hover:bg-accent/10"
                                >
                                  <div className="flex-1 mr-4">
                                    <div className="flex items-center gap-2 mb-1">
                                      <Github className="h-4 w-4" />
                                      <span className="font-medium">
                                        {repo.name}
                                      </span>
                                    </div>
                                    <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                                      {repo.description || "No description"}
                                    </p>
                                    <div className="flex items-center gap-3 text-xs">
                                      {repo.language && (
                                        <div className="flex items-center">
                                          <span className="h-2 w-2 rounded-full bg-primary mr-1"></span>
                                          <span>{repo.language}</span>
                                        </div>
                                      )}
                                      <div className="flex items-center">
                                        <Star className="h-3 w-3 mr-1" />
                                        <span>{repo.stargazers_count}</span>
                                      </div>
                                      <div className="flex items-center">
                                        <GitFork className="h-3 w-3 mr-1" />
                                        <span>{repo.forks_count}</span>
                                      </div>
                                    </div>
                                  </div>
                                  <Button
                                    variant={
                                      isPinned ? "destructive" : "secondary"
                                    }
                                    size="sm"
                                    disabled={isPinningDisabled}
                                    onClick={() => {
                                      if (isPinned) {
                                        setPinnedRepos(
                                          pinnedRepos.filter(
                                            (r) => r.id !== repo.id
                                          )
                                        );
                                        toast.success(`Unpinned ${repo.name}`);
                                      } else {
                                        setPinnedRepos([...pinnedRepos, repo]);
                                        toast.success(
                                          `Pinned ${repo.name} to your profile`
                                        );
                                      }
                                    }}
                                  >
                                    {isPinned ? "Unpin" : "Pin"}
                                  </Button>
                                </div>
                              );
                            })}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="appearance" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Theme & Visual Preferences</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-medium mb-3">
                        Profile Theme
                      </h3>
                      <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                        {["default", "blue", "green", "purple", "orange"].map(
                          (color) => (
                            <div
                              key={color}
                              className={`
                            relative cursor-pointer rounded-md overflow-hidden border-2 h-20
                            ${
                              appearance.theme === color
                                ? "border-primary ring-2 ring-primary/20"
                                : "border-border hover:border-primary/50"
                            }
                          `}
                              onClick={() => {
                                setAppearance((prev) => ({
                                  ...prev,
                                  theme: color as any,
                                }));
                              }}
                            >
                              <div
                                className={`
                            absolute inset-0 
                            ${
                              color === "default"
                                ? "bg-gradient-to-br from-primary/30 to-primary/10"
                                : ""
                            }
                            ${
                              color === "blue"
                                ? "bg-gradient-to-br from-blue-500/30 to-blue-600/10"
                                : ""
                            }
                            ${
                              color === "green"
                                ? "bg-gradient-to-br from-green-500/30 to-green-600/10"
                                : ""
                            }
                            ${
                              color === "purple"
                                ? "bg-gradient-to-br from-purple-500/30 to-purple-600/10"
                                : ""
                            }
                            ${
                              color === "orange"
                                ? "bg-gradient-to-br from-orange-500/30 to-orange-600/10"
                                : ""
                            }
                          `}
                              />
                              <div className="absolute bottom-1 left-0 right-0 text-center text-xs font-medium">
                                {color.charAt(0).toUpperCase() + color.slice(1)}
                              </div>
                              {appearance.theme === color && (
                                <div className="absolute top-1 right-1">
                                  <Check className="h-4 w-4 text-primary" />
                                </div>
                              )}
                            </div>
                          )
                        )}
                      </div>
                    </div>

                    <div className="pt-4">
                      <h3 className="text-sm font-medium mb-3">
                        Display Options
                      </h3>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <Label
                              htmlFor="showActivity"
                              className="font-medium"
                            >
                              Show GitHub Activity
                            </Label>
                            <p className="text-xs text-muted-foreground">
                              Display your recent GitHub activity on your
                              profile
                            </p>
                          </div>
                          <Switch
                            id="showActivity"
                            checked={appearance.showActivity}
                            onCheckedChange={(checked) => {
                              setAppearance((prev) => ({
                                ...prev,
                                showActivity: checked,
                              }));
                            }}
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <Label
                              htmlFor="compactPosts"
                              className="font-medium"
                            >
                              Compact Posts
                            </Label>
                            <p className="text-xs text-muted-foreground">
                              Display posts in a more compact layout
                            </p>
                          </div>
                          <Switch
                            id="compactPosts"
                            checked={appearance.compactPosts}
                            onCheckedChange={(checked) => {
                              setAppearance((prev) => ({
                                ...prev,
                                compactPosts: checked,
                              }));
                            }}
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <Label
                              htmlFor="showSpotlight"
                              className="font-medium"
                            >
                              Show Animated Spotlight
                            </Label>
                            <p className="text-xs text-muted-foreground">
                              Show an animated spotlight on your profile
                            </p>
                          </div>
                          <Switch
                            id="showSpotlight"
                            checked={appearance.showSpotlight}
                            onCheckedChange={(checked) => {
                              setAppearance((prev) => ({
                                ...prev,
                                showSpotlight: checked,
                              }));
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-4">
            <Button variant="outline" onClick={() => router.push("/profile")}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Image Cropping Dialog */}
        <Dialog open={cropDialogOpen} onOpenChange={setCropDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {imageType === "profile"
                  ? "Crop Profile Picture"
                  : "Crop Banner Image"}
              </DialogTitle>
            </DialogHeader>

            <div className="my-4 max-h-[60vh] overflow-auto">
              {imagePreview && (
                <ReactCrop
                  crop={crop}
                  onChange={(c) => setCrop(c)}
                  onComplete={handleCropComplete}
                  aspect={imageType === "profile" ? 1 : 3}
                  circularCrop={imageType === "profile"}
                >
                  <img
                    src={imagePreview}
                    ref={imageRef}
                    alt="Upload Preview"
                    style={{ maxWidth: "100%" }}
                  />
                </ReactCrop>
              )}
            </div>

            <DialogFooter>
              <Button
                variant="secondary"
                onClick={() => setCropDialogOpen(false)}
              >
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
              <Button onClick={getCroppedImg}>
                <Check className="mr-2 h-4 w-4" />
                Apply
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Image Preview Modal */}
        <AnimatePresence>
          {previewImage && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80"
              onClick={handleClosePreview}
            >
              <motion.div
                layoutId={previewId || undefined}
                className="relative max-w-[90vw] max-h-[90vh]"
                onClick={(e) => e.stopPropagation()}
              >
                <motion.div
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", damping: 25, stiffness: 300 }}
                  className="relative w-full h-full overflow-hidden rounded-lg"
                >
                  <Image
                    src={previewImage}
                    alt={
                      previewId === "banner"
                        ? "Banner Preview"
                        : "Profile Preview"
                    }
                    width={previewId === "banner" ? 1920 : 1000}
                    height={previewId === "banner" ? 1080 : 1000}
                    className="object-contain"
                    style={{ maxHeight: "90vh", width: "auto" }}
                    priority
                  />
                </motion.div>
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1, transition: { delay: 0.2 } }}
                  className="absolute top-4 right-4 p-2 bg-black/60 rounded-full text-white"
                  onClick={handleClosePreview}
                >
                  <X className="h-6 w-6" />
                </motion.button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Suspense>
  );
}
