"use client"

import { useState } from "react"
import { Settings, Trash2, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"

interface Profile {
  id: number
  name: string
  isActive: boolean
  isDefault?: boolean
  categoryTargets: Record<string, number>
}

interface Category {
  id: number
  name: string
  adjustedScore: number
  goalLevel: number
}

interface ProfileManagerProps {
  profiles: Profile[]
  categories: Category[]
  activeProfile: Profile
  onProfilesChange: (profiles: Profile[]) => void
  onActiveProfileChange: (profile: Profile) => void
}

export function ProfileManager({
  profiles,
  categories,
  activeProfile,
  onProfilesChange,
  onActiveProfileChange,
}: ProfileManagerProps) {
  const [open, setOpen] = useState(false)
  const [newProfileName, setNewProfileName] = useState("")
  const [newProfileTargets, setNewProfileTargets] = useState<Record<string, number>>({})
  const [isCreating, setIsCreating] = useState(false)

  // Initialize new profile targets with default values
  const initializeNewProfile = () => {
    const defaultTargets: Record<string, number> = {}
    categories.forEach((category) => {
      defaultTargets[category.name] = 70 // Default target of 70%
    })
    setNewProfileTargets(defaultTargets)
    setNewProfileName("")
    setIsCreating(true)
  }

  // Handle creating a new profile
  const handleCreateProfile = () => {
    if (!newProfileName.trim()) return

    const newProfile: Profile = {
      id: Math.max(...profiles.map((p) => p.id)) + 1,
      name: newProfileName.trim(),
      isActive: false,
      categoryTargets: { ...newProfileTargets },
    }

    const updatedProfiles = [...profiles, newProfile]
    onProfilesChange(updatedProfiles)
    setIsCreating(false)
    setNewProfileName("")
    setNewProfileTargets({})
  }

  // Handle deleting a profile
  const handleDeleteProfile = (profileId: number) => {
    if (window.confirm("Are you sure you want to delete this profile?")) {
      const updatedProfiles = profiles.filter((p) => p.id !== profileId)
      onProfilesChange(updatedProfiles)

      // If the deleted profile was active, switch to the first available profile
      if (activeProfile.id === profileId && updatedProfiles.length > 0) {
        onActiveProfileChange(updatedProfiles[0])
      }
    }
  }

  // Handle updating target for a category
  const handleTargetChange = (categoryName: string, value: string) => {
    const numValue = Math.max(0, Math.min(100, Number.parseInt(value) || 0))
    setNewProfileTargets((prev) => ({
      ...prev,
      [categoryName]: numValue,
    }))
  }

  // Cancel creating new profile
  const handleCancelCreate = () => {
    setIsCreating(false)
    setNewProfileName("")
    setNewProfileTargets({})
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings className="h-4 w-4" />
          Manage Profiles
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Manage Profiles</DialogTitle>
          <DialogDescription>Create, edit, or delete your LeetCode goal profiles.</DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6">
            {/* Create New Profile - Always at the top */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Create New Profile</h3>
                {!isCreating && (
                  <Button onClick={initializeNewProfile} className="gap-2">
                    <Plus className="h-4 w-4" />
                    New Profile
                  </Button>
                )}
              </div>

              {isCreating && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">New Custom Profile</CardTitle>
                    <CardDescription>Set your target completion percentage for each category.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Profile Name */}
                    <div className="space-y-2">
                      <Label htmlFor="profile-name">Profile Name</Label>
                      <Input
                        id="profile-name"
                        placeholder="e.g., My Custom Goals"
                        value={newProfileName}
                        onChange={(e) => setNewProfileName(e.target.value)}
                      />
                    </div>

                    {/* Category Targets */}
                    <div className="space-y-3">
                      <Label>Category Targets (%)</Label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {categories.map((category) => (
                          <div key={category.name} className="flex items-center justify-between gap-3">
                            <Label htmlFor={`target-${category.name}`} className="text-sm font-medium min-w-0 flex-1">
                              {category.name}
                            </Label>
                            <div className="flex items-center gap-2">
                              <Input
                                id={`target-${category.name}`}
                                type="number"
                                min="0"
                                max="100"
                                value={newProfileTargets[category.name] || 70}
                                onChange={(e) => handleTargetChange(category.name, e.target.value)}
                                className="w-20 text-center"
                              />
                              <span className="text-sm text-muted-foreground">%</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex justify-end gap-2 pt-4">
                      <Button variant="outline" onClick={handleCancelCreate}>
                        Cancel
                      </Button>
                      <Button onClick={handleCreateProfile} disabled={!newProfileName.trim()}>
                        Create Profile
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Separator - only show when not creating */}
            {!isCreating && <Separator />}

            {/* Existing Profiles - hidden when creating */}
            {!isCreating && (
              <div>
                <h3 className="text-lg font-semibold mb-4">Existing Profiles</h3>
                <div className="grid gap-4">
                  {profiles.map((profile) => (
                    <Card key={profile.id} className={profile.isActive ? "ring-2 ring-primary" : ""}>
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-base">{profile.name}</CardTitle>
                            {profile.isActive && <Badge variant="default">Active</Badge>}
                            {profile.isDefault && <Badge variant="secondary">Default</Badge>}
                          </div>
                          {!profile.isDefault && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteProfile(profile.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                          {categories.map((category) => (
                            <div key={category.name} className="flex justify-between">
                              <span className="text-muted-foreground">{category.name}:</span>
                              <span className="font-medium">
                                {profile.categoryTargets[category.name] || category.goalLevel}%
                              </span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
