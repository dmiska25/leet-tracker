"use client"

import { useState } from "react"
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  Sparkles,
  Code,
  Clock,
  Calendar,
  Eye,
  EyeOff,
  Edit,
  Save,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"

interface Solve {
  id: number
  problemTitle: string
  timestamp: Date
  problemDescription: string
  submissionCode: string
  difficulty: "easy" | "medium" | "hard"
  tags: string[]
  solveDetails?: {
    solveTime: string
    usedHints: "none" | "leetcode_hint" | "solution_peek" | "gpt_help"
    userNotes: string
  }
  feedback?: {
    performance: {
      time_to_solve: number
      time_complexity: string
      space_complexity: string
      comments: string
    }
    code_quality: {
      readability: number
      correctness: number
      maintainability: number
      comments: string
    }
    summary: {
      final_score: number
      comments: string
    }
  }
}

// Mock solve history data
const mockSolves: Solve[] = [
  {
    id: 1,
    problemTitle: "Two Sum",
    timestamp: new Date(Date.now() - 86400000), // 1 day ago
    problemDescription:
      "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target. You may assume that each input would have exactly one solution, and you may not use the same element twice. You can return the answer in any order. Example 1: Input: nums = [2,7,11,15], target = 9 Output: [0,1] Explanation: Because nums[0] + nums[1] == 9, we return [0, 1]. Example 2: Input: nums = [3,2,4], target = 6 Output: [1,2] Example 3: Input: nums = [3,3], target = 6 Output: [0,1]",
    submissionCode: `def twoSum(self, nums: List[int], target: int) -> List[int]:
    hashmap = {}
    for i, num in enumerate(nums):
        complement = target - num
        if complement in hashmap:
            return [hashmap[complement], i]
        hashmap[num] = i
    return []

# Time Complexity: O(n)
# Space Complexity: O(n)
# This solution uses a hashmap to store previously seen numbers
# and their indices, allowing us to find the complement in O(1) time.`,
    difficulty: "easy",
    tags: ["array", "hash table"],
    solveDetails: {
      solveTime: "15 minutes",
      usedHints: "none",
      userNotes: "Classic problem, solved using hashmap approach for optimal time complexity.",
    },
    feedback: {
      performance: {
        time_to_solve: 3,
        time_complexity: "O(n)",
        space_complexity: "O(n)",
        comments:
          "Good time complexity achieved with single pass. Space usage is reasonable for the optimization gained.",
      },
      code_quality: {
        readability: 4,
        correctness: 5,
        maintainability: 4,
        comments:
          "Clean and well-structured code. Variable names are descriptive. Could benefit from more inline comments.",
      },
      summary: {
        final_score: 85,
        comments:
          "Solid solution with optimal time complexity. Good understanding of hash table usage for complement finding.",
      },
    },
  },
  {
    id: 2,
    problemTitle: "Longest Substring Without Repeating Characters",
    timestamp: new Date(Date.now() - 172800000), // 2 days ago
    problemDescription:
      "Given a string s, find the length of the longest substring without repeating characters. Example 1: Input: s = 'abcabcbb' Output: 3 Explanation: The answer is 'abc', with the length of 3. Example 2: Input: s = 'bbbbb' Output: 1 Explanation: The answer is 'b', with the length of 1.",
    submissionCode: `def lengthOfLongestSubstring(self, s: str) -> int:
    char_set = set()
    left = 0
    max_length = 0
    
    for right in range(len(s)):
        while s[right] in char_set:
            char_set.remove(s[left])
            left += 1
        char_set.add(s[right])
        max_length = max(max_length, right - left + 1)
    
    return max_length

# Sliding window approach
# Keep track of characters in current window
# Move left pointer when duplicate found`,
    difficulty: "medium",
    tags: ["hash table", "string", "sliding window"],
    solveDetails: {
      solveTime: "25 minutes",
      usedHints: "leetcode_hint",
      userNotes: "Used sliding window technique. Initially tried brute force but optimized after hint.",
    },
  },
  {
    id: 3,
    problemTitle: "Merge Two Sorted Lists",
    timestamp: new Date(Date.now() - 259200000), // 3 days ago
    problemDescription:
      "You are given the heads of two sorted linked lists list1 and list2. Merge the two lists into one sorted list. The list should be made by splicing together the nodes of the first two lists. Return the head of the merged linked list. Example 1: Input: list1 = [1,2,4], list2 = [1,3,4] Output: [1,1,2,3,4,4] Example 2: Input: list1 = [], list2 = [] Output: [] Example 3: Input: list1 = [], list2 = [0] Output: [0]",
    submissionCode: `def mergeTwoLists(self, list1: Optional[ListNode], list2: Optional[ListNode]) -> Optional[ListNode]:
    dummy = ListNode(0)
    current = dummy
    
    while list1 and list2:
        if list1.val <= list2.val:
            current.next = list1
            list1 = list1.next
        else:
            current.next = list2
            list2 = list2.next
        current = current.next
    
    current.next = list1 or list2
    return dummy.next`,
    difficulty: "easy",
    tags: ["linked list", "recursion"],
    solveDetails: {
      solveTime: "12 minutes",
      usedHints: "none",
      userNotes: "Straightforward merge algorithm. Used dummy node to simplify edge cases.",
    },
  },
]

export default function SolveHistory() {
  const [selectedSolve, setSelectedSolve] = useState<Solve | null>(mockSolves[0])
  const [showSidebar, setShowSidebar] = useState(true)
  const [expandedCode, setExpandedCode] = useState(false)
  const [expandedDescription, setExpandedDescription] = useState(false)
  const [editingSolveDetails, setEditingSolveDetails] = useState(false)
  const [editingFeedback, setEditingFeedback] = useState(false)
  const [solveDetailsForm, setSolveDetailsForm] = useState(
    selectedSolve?.solveDetails || {
      solveTime: "",
      usedHints: "none" as const,
      userNotes: "",
    },
  )
  const [feedbackForm, setFeedbackForm] = useState(
    selectedSolve?.feedback || {
      performance: { time_to_solve: 0, time_complexity: "", space_complexity: "", comments: "" },
      code_quality: { readability: 0, correctness: 0, maintainability: 0, comments: "" },
      summary: { final_score: 0, comments: "" },
    },
  )
  const [xmlInput, setXmlInput] = useState("")
  const { toast } = useToast()

  const [editingDescription, setEditingDescription] = useState(false)
  const [editingCode, setEditingCode] = useState(false)
  const [descriptionForm, setDescriptionForm] = useState(selectedSolve?.problemDescription || "")
  const [codeForm, setCodeForm] = useState(selectedSolve?.submissionCode || "")

  // Add these state variables after the existing ones
  const [currentSnapshot, setCurrentSnapshot] = useState(1)

  // Mock code snapshots data - add this after the mockSolves array
  const codeSnapshots = [
    {
      id: 1,
      timestamp: new Date(Date.now() - 1800000), // 30 minutes ago
      code: `def twoSum(self, nums: List[int], target: int) -> List[int]:
    # First attempt - brute force approach
    for i in range(len(nums)):
        for j in range(i + 1, len(nums)):
            if nums[i] + nums[j] == target:
                return [i, j]
    return []`,
    },
    {
      id: 2,
      timestamp: new Date(Date.now() - 1500000), // 25 minutes ago
      code: `def twoSum(self, nums: List[int], target: int) -> List[int]:
    # Trying with a dictionary approach
    seen = {}
    for i, num in enumerate(nums):
        complement = target - num
        if complement in seen:
            return [seen[complement], i]
        seen[num] = i
    return []`,
    },
    {
      id: 3,
      timestamp: new Date(Date.now() - 1200000), // 20 minutes ago
      code: `def twoSum(self, nums: List[int], target: int) -> List[int]:
    # Optimized version with better variable names
    hashmap = {}
    for i, num in enumerate(nums):
        complement = target - num
        if complement in hashmap:
            return [hashmap[complement], i]
        hashmap[num] = i
    return []`,
    },
    {
      id: 4,
      timestamp: new Date(Date.now() - 900000), // 15 minutes ago
      code: `def twoSum(self, nums: List[int], target: int) -> List[int]:
    hashmap = {}
    for i, num in enumerate(nums):
        complement = target - num
        if complement in hashmap:
            return [hashmap[complement], i]
        hashmap[num] = i
    return []

# Time Complexity: O(n)
# Space Complexity: O(n)`,
    },
    {
      id: 5,
      timestamp: new Date(Date.now() - 600000), // 10 minutes ago (final)
      code: `def twoSum(self, nums: List[int], target: int) -> List[int]:
    hashmap = {}
    for i, num in enumerate(nums):
        complement = target - num
        if complement in hashmap:
            return [hashmap[complement], i]
        hashmap[num] = i
    return []

# Time Complexity: O(n)
# Space Complexity: O(n)
# This solution uses a hashmap to store previously seen numbers
# and their indices, allowing us to find the complement in O(1) time.`,
    },
  ]

  // Format timestamp
  const formatTimestamp = (date: Date) => {
    return date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  // Add this helper function after the existing helper functions
  const formatSnapshotTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
  }

  // Check if solve needs feedback
  const needsFeedback = (solve: Solve) => {
    return !solve.feedback || solve.feedback.summary.final_score === 0
  }

  // Handle solve selection
  const handleSolveSelect = (solve: Solve) => {
    setSelectedSolve(solve)
    setDescriptionForm(solve.problemDescription)
    setCodeForm(solve.submissionCode)
    setSolveDetailsForm(
      solve.solveDetails || {
        solveTime: "",
        usedHints: "none",
        userNotes: "",
      },
    )
    setFeedbackForm(
      solve.feedback || {
        performance: { time_to_solve: 0, time_complexity: "", space_complexity: "", comments: "" },
        code_quality: { readability: 0, correctness: 0, maintainability: 0, comments: "" },
        summary: { final_score: 0, comments: "" },
      },
    )
    setExpandedCode(false)
    setExpandedDescription(false)
    setEditingDescription(false)
    setEditingCode(false)
    setEditingSolveDetails(false)
    setEditingFeedback(false)
  }

  // Handle save solve details
  const handleSaveSolveDetails = () => {
    // In a real app, this would save to the backend
    setEditingSolveDetails(false)
    toast({
      title: "Solve details saved!",
      description: "Your solve details have been updated.",
    })
  }

  // Handle cancel solve details
  const handleCancelSolveDetails = () => {
    setSolveDetailsForm(
      selectedSolve?.solveDetails || {
        solveTime: "",
        usedHints: "none",
        userNotes: "",
      },
    )
    setEditingSolveDetails(false)
  }

  // Handle save description
  const handleSaveDescription = () => {
    // In a real app, this would save to the backend
    setEditingDescription(false)
    toast({
      title: "Description saved!",
      description: "Problem description has been updated.",
    })
  }

  // Handle cancel description
  const handleCancelDescription = () => {
    setDescriptionForm(selectedSolve?.problemDescription || "")
    setEditingDescription(false)
  }

  // Handle save code
  const handleSaveCode = () => {
    // In a real app, this would save to the backend
    setEditingCode(false)
    toast({
      title: "Code saved!",
      description: "Submission code has been updated.",
    })
  }

  // Handle cancel code
  const handleCancelCode = () => {
    setCodeForm(selectedSolve?.submissionCode || "")
    setEditingCode(false)
  }

  // Handle Gemini feedback
  const handleGeminiFeedback = async () => {
    if (!selectedSolve) return

    toast({
      title: "Generating feedback...",
      description: "Gemini is analyzing your solution.",
    })

    // Simulate API call to Gemini
    setTimeout(() => {
      const mockFeedback = {
        performance: {
          time_to_solve: 4,
          time_complexity: "O(n)",
          space_complexity: "O(n)",
          comments:
            "Efficient single-pass solution with optimal time complexity. Space usage is justified for the performance gain.",
        },
        code_quality: {
          readability: 4,
          correctness: 5,
          maintainability: 4,
          comments:
            "Code is clean and well-structured. Variable names are descriptive. Consider adding more comments for complex logic.",
        },
        summary: {
          final_score: 88,
          comments:
            "Strong solution demonstrating good understanding of hash tables and optimization techniques. Minor improvements possible in code documentation.",
        },
      }

      setFeedbackForm(mockFeedback)
      toast({
        title: "Feedback generated!",
        description: "Gemini has analyzed your solution.",
      })
    }, 2000)
  }

  // Handle copy feedback prompt
  const handleCopyPrompt = () => {
    if (!selectedSolve) return

    const prompt = `Please analyze this LeetCode solution and provide feedback in the following XML format:

<feedback>
  <performance>
    <time_to_solve>1-5</time_to_solve>
    <time_complexity>O(n)</time_complexity>
    <space_complexity>O(1)</space_complexity>
    <comments>Detailed explanation of performance analysis</comments>
  </performance>
  <code_quality>
    <readability>1-5</readability>
    <correctness>1-5</correctness>
    <maintainability>1-5</maintainability>
    <comments>Detailed explanation of code quality assessment</comments>
  </code_quality>
  <summary>
    <final_score>0-100</final_score>
    <comments>Overall assessment and recommendations</comments>
  </summary>
</feedback>

Problem: ${selectedSolve.problemTitle}
Description: ${selectedSolve.problemDescription}

Solution:
${selectedSolve.submissionCode}

Please rate the solution and provide detailed comments for each section.`

    navigator.clipboard.writeText(prompt)
    toast({
      title: "Prompt copied!",
      description: "Paste this into your preferred LLM and copy the XML response back.",
    })
  }

  // Handle XML input processing
  const handleProcessXML = () => {
    try {
      const parser = new DOMParser()
      const xmlDoc = parser.parseFromString(xmlInput, "text/xml")

      const feedback = {
        performance: {
          time_to_solve: Number.parseInt(xmlDoc.querySelector("performance time_to_solve")?.textContent || "0"),
          time_complexity: xmlDoc.querySelector("performance time_complexity")?.textContent || "",
          space_complexity: xmlDoc.querySelector("performance space_complexity")?.textContent || "",
          comments: xmlDoc.querySelector("performance comments")?.textContent || "",
        },
        code_quality: {
          readability: Number.parseInt(xmlDoc.querySelector("code_quality readability")?.textContent || "0"),
          correctness: Number.parseInt(xmlDoc.querySelector("code_quality correctness")?.textContent || "0"),
          maintainability: Number.parseInt(xmlDoc.querySelector("code_quality maintainability")?.textContent || "0"),
          comments: xmlDoc.querySelector("code_quality comments")?.textContent || "",
        },
        summary: {
          final_score: Number.parseInt(xmlDoc.querySelector("summary final_score")?.textContent || "0"),
          comments: xmlDoc.querySelector("summary comments")?.textContent || "",
        },
      }

      setFeedbackForm(feedback)
      setXmlInput("")
      toast({
        title: "XML processed!",
        description: "Feedback form has been updated with the XML data.",
      })
    } catch (error) {
      toast({
        title: "Error processing XML",
        description: "Please check the XML format and try again.",
        variant: "destructive",
      })
    }
  }

  // Handle save feedback
  const handleSaveFeedback = () => {
    // In a real app, this would save to the backend
    setEditingFeedback(false)
    toast({
      title: "Feedback saved!",
      description: "Your feedback has been updated.",
    })
  }

  // Handle cancel feedback
  const handleCancelFeedback = () => {
    setFeedbackForm(
      selectedSolve?.feedback || {
        performance: { time_to_solve: 0, time_complexity: "", space_complexity: "", comments: "" },
        code_quality: { readability: 0, correctness: 0, maintainability: 0, comments: "" },
        summary: { final_score: 0, comments: "" },
      },
    )
    setEditingFeedback(false)
    setXmlInput("")
  }

  // Update feedback form
  const updateFeedback = (section: string, field: string, value: any) => {
    setFeedbackForm((prev) => ({
      ...prev,
      [section]: {
        ...prev[section as keyof typeof prev],
        [field]: value,
      },
    }))
  }

  // Truncate code for display
  const getTruncatedCode = (code: string, maxLines = 20) => {
    const lines = code.split("\n")
    if (lines.length <= maxLines) return code
    return lines.slice(0, maxLines).join("\n")
  }

  // Truncate description for display
  const getTruncatedDescription = (description: string, maxLength = 200) => {
    if (description.length <= maxLength) return description
    return description.substring(0, maxLength) + "..."
  }

  // Get hint display text
  const getHintText = (hint: string) => {
    switch (hint) {
      case "none":
        return "None"
      case "leetcode_hint":
        return "LeetCode Hint"
      case "solution_peek":
        return "Solution Peek"
      case "gpt_help":
        return "GPT Help"
      default:
        return "None"
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <div className="flex gap-6 h-[calc(100vh-8rem)]">
        {/* Sidebar */}
        <div className={`transition-all duration-300 ${showSidebar ? "w-80" : "w-0"} overflow-hidden`}>
          <Card className="h-full">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Solve History</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setShowSidebar(false)} className="p-1">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[calc(100vh-12rem)]">
                <div className="space-y-2 p-4 pt-0">
                  {mockSolves.map((solve) => (
                    <div
                      key={solve.id}
                      onClick={() => handleSolveSelect(solve)}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors hover:bg-accent ${
                        selectedSolve?.id === solve.id ? "bg-accent border-primary" : ""
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm truncate">{solve.problemTitle}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            {needsFeedback(solve) && (
                              <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600">
                                Needs Feedback
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            <Clock className="h-3 w-3 inline mr-1" />
                            {formatTimestamp(solve.timestamp)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Toggle sidebar button when hidden */}
        {!showSidebar && (
          <Button variant="outline" size="sm" onClick={() => setShowSidebar(true)} className="fixed left-4 top-32 z-10">
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}

        {/* Main content */}
        <div className="flex-1 min-w-0">
          {selectedSolve ? (
            <Card className="h-full">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl">{selectedSolve.problemTitle}</CardTitle>
                    <div className="flex items-center gap-2 mt-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">{formatTimestamp(selectedSolve.timestamp)}</span>
                    </div>
                  </div>
                  {!showSidebar && (
                    <Button variant="outline" size="sm" onClick={() => setShowSidebar(true)} className="gap-2">
                      <Eye className="h-4 w-4" />
                      Show List
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[calc(100vh-16rem)]">
                  <div className="space-y-6">
                    {/* Problem Description */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold">Problem Description</h3>
                        <div className="flex gap-2">
                          {!editingDescription ? (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setEditingDescription(true)}
                                className="gap-2"
                              >
                                <Edit className="h-4 w-4" />
                                Edit
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setExpandedDescription(!expandedDescription)}
                                className="gap-2"
                              >
                                {expandedDescription ? (
                                  <ChevronUp className="h-4 w-4" />
                                ) : (
                                  <ChevronDown className="h-4 w-4" />
                                )}
                                {expandedDescription ? "Collapse" : "Expand"}
                              </Button>
                            </>
                          ) : (
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={handleCancelDescription}
                                className="gap-2 bg-transparent"
                              >
                                <X className="h-4 w-4" />
                                Cancel
                              </Button>
                              <Button size="sm" onClick={handleSaveDescription} className="gap-2">
                                <Save className="h-4 w-4" />
                                Save
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>

                      {editingDescription ? (
                        <div>
                          <Textarea
                            value={descriptionForm}
                            onChange={(e) => setDescriptionForm(e.target.value)}
                            className="min-h-[200px]"
                            placeholder="Enter problem description..."
                          />
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {expandedDescription ? descriptionForm : getTruncatedDescription(descriptionForm)}
                        </p>
                      )}

                      {!editingDescription && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {selectedSolve.tags.map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>

                    <Separator />

                    {/* Submission Code */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold">Submission Code</h3>
                        <div className="flex gap-2">
                          {!editingCode ? (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setEditingCode(true)}
                                className="gap-2"
                              >
                                <Edit className="h-4 w-4" />
                                Edit
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setExpandedCode(!expandedCode)}
                                className="gap-2"
                              >
                                {expandedCode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                {expandedCode ? "Collapse" : "Expand"}
                              </Button>
                            </>
                          ) : (
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={handleCancelCode}
                                className="gap-2 bg-transparent"
                              >
                                <X className="h-4 w-4" />
                                Cancel
                              </Button>
                              <Button size="sm" onClick={handleSaveCode} className="gap-2">
                                <Save className="h-4 w-4" />
                                Save
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Code Snapshots Timeline - Add this right after the header div and before the code display */}
                      {!editingCode && selectedSolve && (
                        <div className="mb-4 p-4 bg-muted/30 rounded-lg border">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-4">
                              <span className="text-sm font-medium">Code Evolution</span>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <span>
                                  Snapshot {currentSnapshot} of {codeSnapshots.length}
                                </span>
                                <span>•</span>
                                <span>{formatSnapshotTime(codeSnapshots[currentSnapshot - 1]?.timestamp)}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentSnapshot(Math.max(1, currentSnapshot - 1))}
                                disabled={currentSnapshot === 1}
                              >
                                <ChevronLeft className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentSnapshot(Math.min(codeSnapshots.length, currentSnapshot + 1))}
                                disabled={currentSnapshot === codeSnapshots.length}
                              >
                                <ChevronRight className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>

                          {/* Timeline Scrubber */}
                          <div className="relative">
                            <div className="flex items-center">
                              <div className="flex-1 relative h-2 bg-secondary rounded-full mx-2">
                                {/* Timeline track */}
                                <div
                                  className="absolute top-0 left-0 h-2 bg-primary rounded-full transition-all duration-200"
                                  style={{ width: `${((currentSnapshot - 1) / (codeSnapshots.length - 1)) * 100}%` }}
                                />

                                {/* Snapshot markers */}
                                {codeSnapshots.map((snapshot, index) => (
                                  <button
                                    key={index}
                                    className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 transition-all duration-200 hover:scale-110 ${
                                      index + 1 === currentSnapshot
                                        ? "bg-primary border-primary shadow-lg"
                                        : "bg-background border-muted-foreground/30 hover:border-primary/50"
                                    }`}
                                    style={{
                                      left: `${(index / (codeSnapshots.length - 1)) * 100}%`,
                                      transform: "translateX(-50%) translateY(-50%)",
                                    }}
                                    onClick={() => setCurrentSnapshot(index + 1)}
                                    title={`Snapshot ${index + 1} - ${formatSnapshotTime(snapshot.timestamp)}`}
                                  />
                                ))}
                              </div>
                            </div>

                            {/* Timestamp labels */}
                            <div className="flex justify-between mt-2 px-2">
                              <span className="text-xs text-muted-foreground">
                                {formatSnapshotTime(codeSnapshots[0]?.timestamp)}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {formatSnapshotTime(codeSnapshots[codeSnapshots.length - 1]?.timestamp)}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {editingCode ? (
                        <div>
                          <Textarea
                            value={codeForm}
                            onChange={(e) => setCodeForm(e.target.value)}
                            className="min-h-[300px] font-mono text-sm"
                            placeholder="Enter your submission code..."
                          />
                        </div>
                      ) : (
                        <div className="bg-muted rounded-lg p-4">
                          <pre className="text-sm overflow-x-auto">
                            <code>
                              {expandedCode
                                ? codeSnapshots[currentSnapshot - 1]?.code
                                : getTruncatedCode(codeSnapshots[currentSnapshot - 1]?.code || codeForm)}
                            </code>
                          </pre>
                          {!expandedCode &&
                            (codeSnapshots[currentSnapshot - 1]?.code?.split("\n").length || 0) > 20 && (
                              <div className="text-center mt-2">
                                <span className="text-xs text-muted-foreground">
                                  ... {(codeSnapshots[currentSnapshot - 1]?.code?.split("\n").length || 0) - 20} more
                                  lines
                                </span>
                              </div>
                            )}
                        </div>
                      )}
                    </div>

                    <Separator />

                    {/* Solve Details */}
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold">Solve Details</h3>
                        {!editingSolveDetails ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingSolveDetails(true)}
                            className="gap-2"
                          >
                            <Edit className="h-4 w-4" />
                            Edit
                          </Button>
                        ) : (
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleCancelSolveDetails}
                              className="gap-2 bg-transparent"
                            >
                              <X className="h-4 w-4" />
                              Cancel
                            </Button>
                            <Button size="sm" onClick={handleSaveSolveDetails} className="gap-2">
                              <Save className="h-4 w-4" />
                              Save
                            </Button>
                          </div>
                        )}
                      </div>

                      {editingSolveDetails ? (
                        <div className="grid gap-4">
                          <div>
                            <Label htmlFor="solve-time">Solve Time</Label>
                            <Input
                              id="solve-time"
                              placeholder="e.g., 15 minutes"
                              value={solveDetailsForm.solveTime}
                              onChange={(e) => setSolveDetailsForm((prev) => ({ ...prev, solveTime: e.target.value }))}
                            />
                          </div>
                          <div>
                            <Label htmlFor="used-hints">Used Hints</Label>
                            <Select
                              value={solveDetailsForm.usedHints}
                              onValueChange={(value) => setSolveDetailsForm((prev) => ({ ...prev, usedHints: value }))}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">None</SelectItem>
                                <SelectItem value="leetcode_hint">LeetCode Hint</SelectItem>
                                <SelectItem value="solution_peek">Solution Peek</SelectItem>
                                <SelectItem value="gpt_help">GPT Help</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="user-notes">User Notes</Label>
                            <Textarea
                              id="user-notes"
                              placeholder="Add your notes about this solve..."
                              value={solveDetailsForm.userNotes}
                              onChange={(e) => setSolveDetailsForm((prev) => ({ ...prev, userNotes: e.target.value }))}
                              rows={3}
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="grid gap-3">
                          <div className="flex justify-between">
                            <span className="text-sm font-medium">Solve Time:</span>
                            <span className="text-sm text-muted-foreground">
                              {solveDetailsForm.solveTime || "Not specified"}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm font-medium">Used Hints:</span>
                            <span className="text-sm text-muted-foreground">
                              {getHintText(solveDetailsForm.usedHints)}
                            </span>
                          </div>
                          {solveDetailsForm.userNotes && (
                            <div>
                              <span className="text-sm font-medium">Notes:</span>
                              <p className="text-sm text-muted-foreground mt-1">{solveDetailsForm.userNotes}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <Separator />

                    {/* Feedback Section */}
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold">Feedback</h3>
                        {!editingFeedback ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingFeedback(true)}
                            className="gap-2"
                          >
                            <Edit className="h-4 w-4" />
                            {feedbackForm.summary.final_score > 0 ? "Edit" : "Add"} Feedback
                          </Button>
                        ) : (
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleCancelFeedback}
                              className="gap-2 bg-transparent"
                            >
                              <X className="h-4 w-4" />
                              Cancel
                            </Button>
                            <Button size="sm" onClick={handleSaveFeedback} className="gap-2">
                              <Save className="h-4 w-4" />
                              Save
                            </Button>
                          </div>
                        )}
                      </div>

                      {editingFeedback ? (
                        <div className="space-y-6">
                          {/* AI Tools */}
                          <div className="flex gap-2 p-4 bg-muted/50 rounded-lg">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleGeminiFeedback}
                              className="gap-2 bg-transparent"
                            >
                              <Sparkles className="h-4 w-4" />
                              Gemini Feedback
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleCopyPrompt}
                              className="gap-2 bg-transparent"
                            >
                              <Copy className="h-4 w-4" />
                              Copy Feedback Prompt
                            </Button>
                          </div>

                          {/* XML Input */}
                          <div>
                            <Label htmlFor="xml-input" className="text-sm font-medium">
                              Paste XML Response (optional)
                            </Label>
                            <div className="flex gap-2 mt-1">
                              <Textarea
                                id="xml-input"
                                placeholder="Paste XML response from LLM here..."
                                value={xmlInput}
                                onChange={(e) => setXmlInput(e.target.value)}
                                className="flex-1"
                                rows={3}
                              />
                              <Button onClick={handleProcessXML} disabled={!xmlInput.trim()} className="self-start">
                                Process
                              </Button>
                            </div>
                          </div>

                          {/* Feedback Form */}
                          <div className="grid gap-6">
                            {/* Performance */}
                            <div>
                              <h4 className="font-medium mb-3">Performance</h4>
                              <div className="grid gap-4">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                  <div>
                                    <Label htmlFor="time-to-solve">Time to Solve (1-5)</Label>
                                    <Input
                                      id="time-to-solve"
                                      type="number"
                                      min="1"
                                      max="5"
                                      value={feedbackForm.performance.time_to_solve}
                                      onChange={(e) =>
                                        updateFeedback("performance", "time_to_solve", Number.parseInt(e.target.value))
                                      }
                                    />
                                  </div>
                                  <div>
                                    <Label htmlFor="time-complexity">Time Complexity</Label>
                                    <Input
                                      id="time-complexity"
                                      placeholder="O(n log n)"
                                      value={feedbackForm.performance.time_complexity}
                                      onChange={(e) => updateFeedback("performance", "time_complexity", e.target.value)}
                                    />
                                  </div>
                                  <div>
                                    <Label htmlFor="space-complexity">Space Complexity</Label>
                                    <Input
                                      id="space-complexity"
                                      placeholder="O(n)"
                                      value={feedbackForm.performance.space_complexity}
                                      onChange={(e) =>
                                        updateFeedback("performance", "space_complexity", e.target.value)
                                      }
                                    />
                                  </div>
                                </div>
                                <div>
                                  <Label htmlFor="performance-comments">Comments</Label>
                                  <Textarea
                                    id="performance-comments"
                                    placeholder="Detailed explanation of performance analysis..."
                                    value={feedbackForm.performance.comments}
                                    onChange={(e) => updateFeedback("performance", "comments", e.target.value)}
                                    rows={2}
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Code Quality */}
                            <div>
                              <h4 className="font-medium mb-3">Code Quality</h4>
                              <div className="grid gap-4">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                  <div>
                                    <Label htmlFor="readability">Readability (1-5)</Label>
                                    <Input
                                      id="readability"
                                      type="number"
                                      min="1"
                                      max="5"
                                      value={feedbackForm.code_quality.readability}
                                      onChange={(e) =>
                                        updateFeedback("code_quality", "readability", Number.parseInt(e.target.value))
                                      }
                                    />
                                  </div>
                                  <div>
                                    <Label htmlFor="correctness">Correctness (1-5)</Label>
                                    <Input
                                      id="correctness"
                                      type="number"
                                      min="1"
                                      max="5"
                                      value={feedbackForm.code_quality.correctness}
                                      onChange={(e) =>
                                        updateFeedback("code_quality", "correctness", Number.parseInt(e.target.value))
                                      }
                                    />
                                  </div>
                                  <div>
                                    <Label htmlFor="maintainability">Maintainability (1-5)</Label>
                                    <Input
                                      id="maintainability"
                                      type="number"
                                      min="1"
                                      max="5"
                                      value={feedbackForm.code_quality.maintainability}
                                      onChange={(e) =>
                                        updateFeedback(
                                          "code_quality",
                                          "maintainability",
                                          Number.parseInt(e.target.value),
                                        )
                                      }
                                    />
                                  </div>
                                </div>
                                <div>
                                  <Label htmlFor="quality-comments">Comments</Label>
                                  <Textarea
                                    id="quality-comments"
                                    placeholder="Detailed explanation of code quality assessment..."
                                    value={feedbackForm.code_quality.comments}
                                    onChange={(e) => updateFeedback("code_quality", "comments", e.target.value)}
                                    rows={2}
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Summary */}
                            <div>
                              <h4 className="font-medium mb-3">Summary</h4>
                              <div className="grid gap-4">
                                <div className="max-w-xs">
                                  <Label htmlFor="final-score">Final Score (0-100)</Label>
                                  <Input
                                    id="final-score"
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={feedbackForm.summary.final_score}
                                    onChange={(e) =>
                                      updateFeedback("summary", "final_score", Number.parseInt(e.target.value))
                                    }
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="summary-comments">Comments</Label>
                                  <Textarea
                                    id="summary-comments"
                                    placeholder="Overall assessment and recommendations..."
                                    value={feedbackForm.summary.comments}
                                    onChange={(e) => updateFeedback("summary", "comments", e.target.value)}
                                    rows={2}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : // Display feedback if exists
                      feedbackForm.summary.final_score > 0 ? (
                        <div className="grid gap-4">
                          <div>
                            <h4 className="font-medium mb-2">Performance</h4>
                            <div className="grid grid-cols-3 gap-4 text-sm mb-2">
                              <div>Time to Solve: {feedbackForm.performance.time_to_solve}/5</div>
                              <div>Time: {feedbackForm.performance.time_complexity}</div>
                              <div>Space: {feedbackForm.performance.space_complexity}</div>
                            </div>
                            {feedbackForm.performance.comments && (
                              <p className="text-sm text-muted-foreground">{feedbackForm.performance.comments}</p>
                            )}
                          </div>
                          <div>
                            <h4 className="font-medium mb-2">Code Quality</h4>
                            <div className="grid grid-cols-3 gap-4 text-sm mb-2">
                              <div>Readability: {feedbackForm.code_quality.readability}/5</div>
                              <div>Correctness: {feedbackForm.code_quality.correctness}/5</div>
                              <div>Maintainability: {feedbackForm.code_quality.maintainability}/5</div>
                            </div>
                            {feedbackForm.code_quality.comments && (
                              <p className="text-sm text-muted-foreground">{feedbackForm.code_quality.comments}</p>
                            )}
                          </div>
                          <div>
                            <h4 className="font-medium mb-2">Summary</h4>
                            <div className="text-sm mb-2">Final Score: {feedbackForm.summary.final_score}/100</div>
                            {feedbackForm.summary.comments && (
                              <p className="text-sm text-muted-foreground">{feedbackForm.summary.comments}</p>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="text-center text-muted-foreground py-8">
                          <p>No feedback available. Click "Add Feedback" to get started.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          ) : (
            <Card className="h-full flex items-center justify-center">
              <CardContent>
                <div className="text-center text-muted-foreground">
                  <Code className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Select a solve from the sidebar to view details</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
