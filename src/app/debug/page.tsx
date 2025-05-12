"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import * as React from "react"
import {
  fetchBrainliftData,
  fetchBrainliftPage,
  mergeBrainliftData,
  parseBrainliftPage,
  storeBrainliftData,
} from "./actions"

function CopyButton({
  text,
  className = "",
}: { text: string; className?: string }) {
  const [copied, setCopied] = React.useState(false)

  const handleCopy = React.useCallback(() => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [text])

  return (
    <Button
      variant="noShadow"
      size="sm"
      onClick={handleCopy}
      className={`ml-2 h-8 ${className}`}
    >
      {copied ? "Copied!" : "Copy"}
    </Button>
  )
}

export default function DebugPage() {
  const [url, setUrl] = React.useState<string>("https://example.com")
  type JsonValue =
    | string
    | number
    | boolean
    | null
    | { [key: string]: JsonValue }
    | JsonValue[]

  const [result, setResult] = React.useState<{
    html?: string
    sessionId?: string
    shareId?: string
    fetchError?: string
    parseError?: string
    jsonData?: JsonValue
    apiError?: string
    extractedItems?: string | JsonValue[]
    extractError?: string
    saveError?: string
    saveSuccess?: boolean
  }>({})
  const [isLoading, setIsLoading] = React.useState<boolean>(false)
  const [isLoadingData, setIsLoadingData] = React.useState<boolean>(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setResult({})

    try {
      const fetchResponse = await fetchBrainliftPage(url)

      if (fetchResponse.error) {
        setResult({ fetchError: fetchResponse.error.message })
        setIsLoading(false)
        return
      }

      // We have HTML content and sessionId, now try to parse the HTML for the share_id
      const { html, sessionId } = fetchResponse.data
      const parseResponse = await parseBrainliftPage(html)

      if (parseResponse.error) {
        setResult({
          html,
          sessionId,
          parseError: parseResponse.error.message,
        })
      } else {
        setResult({
          html,
          sessionId,
          shareId: parseResponse.data,
        })
      }
    } catch (err) {
      const error =
        err instanceof Error ? err.message : "An unexpected error occurred"
      setResult({ fetchError: error })
    } finally {
      setIsLoading(false)
    }
  }

  const fetchApiData = React.useCallback(async () => {
    if (!result.shareId || !result.sessionId) return

    setIsLoadingData(true)
    try {
      const apiResponse = await fetchBrainliftData(
        result.shareId,
        result.sessionId,
      )

      if (apiResponse.error) {
        setResult((prev) => ({
          ...prev,
          apiError: apiResponse.error.message,
        }))
      } else {
        // Update with the full JSON data
        setResult((prev) => ({
          ...prev,
          jsonData: apiResponse.data,
        }))

        // Extract only the items using mergeBrainliftData
        const extractResult = await mergeBrainliftData(apiResponse.data)

        if (extractResult.error) {
          setResult((prev) => ({
            ...prev,
            extractError: extractResult.error.message,
          }))
        } else {
          setResult((prev) => ({
            ...prev,
            extractedItems: extractResult.data,
          }))
        }
      }
    } catch (err) {
      const error =
        err instanceof Error ? err.message : "An unexpected error occurred"
      setResult((prev) => ({
        ...prev,
        apiError: error,
      }))
    } finally {
      setIsLoadingData(false)
    }
  }, [result.shareId, result.sessionId])

  // Auto-fetch API data when we have both shareId and sessionId
  React.useEffect(() => {
    if (
      result.shareId &&
      result.sessionId &&
      !result.jsonData &&
      !isLoadingData &&
      !result.apiError
    ) {
      void fetchApiData()
    }
  }, [
    fetchApiData,
    result.shareId,
    result.sessionId,
    result.jsonData,
    isLoadingData,
    result.apiError,
  ])

  const hasError =
    result.fetchError ||
    result.parseError ||
    result.apiError ||
    result.extractError
  const hasContent =
    result.html || result.shareId || result.jsonData || result.extractedItems

  return (
    <div className="container py-10 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Brainlift Debug Tool</h1>

      <Card className="p-6 mb-6">
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <Label htmlFor="url" className="mb-2 block">
              URL to fetch
            </Label>
            <Input
              id="url"
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              className="w-full"
              type="url"
              required
            />
          </div>

          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? "Processing..." : "Fetch and Parse"}
          </Button>
        </form>
      </Card>

      {result.sessionId && (
        <Card className="p-6 mb-6 bg-blue-50 border-blue-200">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-medium mb-2 text-blue-800">
              Session ID Cookie
            </h2>
            <CopyButton
              text={result.sessionId}
              className="bg-blue-100 hover:bg-blue-200 text-blue-800 border-blue-300"
            />
          </div>
          <div className="flex items-center">
            <span className="font-mono bg-blue-100 text-blue-800 p-2 rounded border border-blue-300 text-lg">
              {result.sessionId}
            </span>
          </div>
        </Card>
      )}

      {result.shareId && (
        <Card className="p-6 mb-6 bg-green-50 border-green-200">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-medium mb-2 text-green-800">
              Share ID Found
            </h2>
            <CopyButton
              text={result.shareId}
              className="bg-green-100 hover:bg-green-200 text-green-800 border-green-300"
            />
          </div>
          <div className="flex items-center">
            <span className="font-mono bg-green-100 text-green-800 p-2 rounded border border-green-300 text-lg">
              {result.shareId}
            </span>
          </div>
        </Card>
      )}

      {result.parseError && (
        <Card className="p-6 mb-6 bg-yellow-50 border-yellow-200">
          <h2 className="text-xl font-medium mb-2 text-yellow-800">
            Parse Error
          </h2>
          <div className="p-4 bg-yellow-100 text-yellow-800 rounded border border-yellow-300 overflow-auto">
            {result.parseError}
          </div>
        </Card>
      )}

      {result.fetchError && (
        <Card className="p-6 mb-6">
          <h2 className="text-xl font-medium mb-2 text-red-800">Fetch Error</h2>
          <div className="p-4 bg-red-50 text-red-800 rounded border border-red-200 overflow-auto">
            {result.fetchError}
          </div>
        </Card>
      )}

      {result.apiError && (
        <Card className="p-6 mb-6 bg-orange-50 border-orange-200">
          <h2 className="text-xl font-medium mb-2 text-orange-800">
            API Error
          </h2>
          <div className="p-4 bg-orange-100 text-orange-800 rounded border border-orange-300 overflow-auto">
            {result.apiError}
          </div>
        </Card>
      )}

      {result.jsonData && (
        <Card className="p-6 mb-6 bg-purple-50 border-purple-200">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-medium text-purple-800">
              API Response Data
            </h2>
            <CopyButton
              text={JSON.stringify(result.jsonData, null, 2)}
              className="bg-purple-100 hover:bg-purple-200 text-purple-800 border-purple-300"
            />
          </div>
          <div className="overflow-auto max-h-[500px]">
            <pre className="whitespace-pre-wrap break-all p-4 bg-purple-50 rounded border border-purple-200 text-xs text-purple-900">
              {typeof result.jsonData === "string"
                ? result.jsonData
                : JSON.stringify(result.jsonData, null, 2)}
            </pre>
          </div>
        </Card>
      )}

      {result.extractedItems && (
        <Card className="p-6 mb-6 bg-teal-50 border-teal-200">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-medium text-teal-800">
              Markdown Output
            </h2>
            <div className="flex">
              <Button
                variant="noShadow"
                size="sm"
                onClick={async () => {
                  if (
                    !result.shareId ||
                    !result.extractedItems ||
                    typeof result.extractedItems !== "string"
                  ) {
                    setResult((prev) => ({
                      ...prev,
                      saveError: "Missing share ID or markdown content",
                    }))
                    return
                  }

                  const saveResult = await storeBrainliftData(
                    result.shareId,
                    result.extractedItems,
                  )

                  if (saveResult.error) {
                    setResult((prev) => ({
                      ...prev,
                      saveError: saveResult.error.message,
                      saveSuccess: false,
                    }))
                  } else {
                    setResult((prev) => ({
                      ...prev,
                      saveError: undefined,
                      saveSuccess: true,
                    }))

                    // Reset success message after a few seconds
                    setTimeout(() => {
                      setResult((prev) => ({
                        ...prev,
                        saveSuccess: false,
                      }))
                    }, 3000)
                  }
                }}
                className="mr-2 bg-teal-100 hover:bg-teal-200 text-teal-800 border-teal-300"
              >
                {result.saveSuccess ? "Saved!" : "Save to DB"}
              </Button>
              <CopyButton
                text={
                  typeof result.extractedItems === "string"
                    ? result.extractedItems
                    : JSON.stringify(result.extractedItems, null, 2)
                }
                className="bg-teal-100 hover:bg-teal-200 text-teal-800 border-teal-300"
              />
            </div>
          </div>

          {result.saveError && (
            <div className="mb-4 p-3 bg-red-100 text-red-800 rounded border border-red-300">
              {result.saveError}
            </div>
          )}

          <div className="overflow-auto max-h-[500px]">
            {typeof result.extractedItems === "string" ? (
              <div className="p-4 bg-teal-50 rounded border border-teal-200 text-sm text-teal-900">
                {result.extractedItems.split("\n").map((line, index) => (
                  <div key={index} className="whitespace-pre-wrap">
                    {line}
                  </div>
                ))}
              </div>
            ) : (
              <pre className="whitespace-pre-wrap break-all p-4 bg-teal-50 rounded border border-teal-200 text-xs text-teal-900">
                {JSON.stringify(result.extractedItems, null, 2)}
              </pre>
            )}
          </div>
        </Card>
      )}

      {result.extractError && (
        <Card className="p-6 mb-6 bg-red-50 border-red-200">
          <h2 className="text-xl font-medium mb-2 text-red-800">
            Items Extraction Error
          </h2>
          <div className="p-4 bg-red-100 text-red-800 rounded border border-red-300 overflow-auto">
            {result.extractError}
          </div>
        </Card>
      )}

      {result.html && (
        <Card className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-medium">HTML Content</h2>
            <CopyButton text={result.html} />
          </div>
          <div className="overflow-auto max-h-[500px]">
            <pre className="whitespace-pre-wrap break-all p-4 bg-gray-50 rounded border text-xs">
              {result.html}
            </pre>
          </div>
        </Card>
      )}
    </div>
  )
}
