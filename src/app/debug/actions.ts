"use server"

import { Errors, type Result } from "@/lib/errors"

interface BrainliftPageResponse {
  html: string
  sessionId: string
}

/**
 * Server action to fetch HTML content and sessionid cookie from a URL
 */
export async function fetchBrainliftPage(
  url: string,
): Promise<Result<BrainliftPageResponse, Error>> {
  const result = await Errors.try(fetch(url))
  if (result.error) {
    return {
      data: undefined,
      error: Errors.wrap(result.error, "Failed to fetch URL"),
    }
  }

  // Extract cookies from response headers
  const cookieHeader = result.data.headers.get("set-cookie")
  if (cookieHeader == null) {
    return {
      data: undefined,
      error: new Error("No cookies found in response"),
    }
  }

  // Try to extract sessionid from cookies
  const sessionidMatch = cookieHeader.match(/sessionid=([^;]+)/)
  if (!sessionidMatch?.[1]) {
    return {
      data: undefined,
      error: new Error("No sessionid cookie found in response"),
    }
  }

  const sessionId = sessionidMatch[1]

  const textResult = await Errors.try(result.data.text())
  if (textResult.error) {
    return {
      data: undefined,
      error: Errors.wrap(textResult.error, "Failed to extract content"),
    }
  }

  return {
    data: {
      html: textResult.data,
      sessionId: sessionId,
    },
    error: undefined,
  }
}

/**
 * Extract the share_id from the HTML content of a Brainlift page
 */
export async function parseBrainliftPage(
  html: string,
): Promise<Result<string, Error>> {
  // Use trySync to safely execute the regex matching
  const matchResult = Errors.trySync(() => {
    return html.match(
      /PROJECT_TREE_DATA_URL_PARAMS\s*=\s*{\s*"share_id":\s*"([^"]+)"/i,
    )
  })

  if (matchResult.error) {
    return {
      data: undefined,
      error: Errors.wrap(
        matchResult.error,
        "Failed to parse HTML for share_id",
      ),
    }
  }

  const shareIdMatch = matchResult.data

  // Check if we found a match and if it contains a capture group
  if (shareIdMatch == null || !shareIdMatch[1]) {
    return {
      data: undefined,
      error: new Error("No share_id found in the HTML content"),
    }
  }

  // Extract the share ID from the capture group
  return {
    data: shareIdMatch[1],
    error: undefined,
  }
}

/**
 * Fetch JSON data from Brainlift API using share_id and sessionId cookie
 */
type JsonValue =
  | string
  | number
  | boolean
  | null
  | { [key: string]: JsonValue }
  | JsonValue[]

export async function fetchBrainliftData(
  shareId: string,
  sessionId: string,
): Promise<Result<JsonValue, Error>> {
  if (!shareId) {
    return {
      data: undefined,
      error: new Error("Share ID is required"),
    }
  }

  if (!sessionId) {
    return {
      data: undefined,
      error: new Error("Session ID is required"),
    }
  }

  const apiUrl = `https://workflowy.com/get_tree_data/?share_id=${encodeURIComponent(shareId)}`

  const fetchResult = await Errors.try(
    fetch(apiUrl, {
      headers: {
        Cookie: `sessionid=${sessionId}`,
        "Content-Type": "application/json",
      },
    }),
  )

  if (fetchResult.error) {
    return {
      data: undefined,
      error: Errors.wrap(fetchResult.error, "Failed to fetch Brainlift data"),
    }
  }

  // Check for HTTP errors
  if (!fetchResult.data.ok) {
    return {
      data: undefined,
      error: new Error(
        `HTTP error: ${fetchResult.data.status} ${fetchResult.data.statusText}`,
      ),
    }
  }

  const jsonResult = await Errors.try(fetchResult.data.json())
  if (jsonResult.error) {
    return {
      data: undefined,
      error: Errors.wrap(jsonResult.error, "Failed to parse JSON response"),
    }
  }

  return {
    data: jsonResult.data,
    error: undefined,
  }
}

/**
 * Extract items from Brainlift data and convert to markdown
 */
export async function mergeBrainliftData(
  data: JsonValue,
): Promise<Result<string, Error>> {
  const extractResult = Errors.trySync(() => {
    // Validate that the input is an object with an items property
    if (typeof data !== "object" || data == null) {
      throw new Error("Invalid data structure: expected an object")
    }

    const typedData = data as { items?: JsonValue[] }

    // Check if items exists and is an array
    if (!Array.isArray(typedData.items)) {
      throw new Error(
        "Invalid data structure: items property is missing or not an array",
      )
    }

    return typedData.items
  })

  if (extractResult.error) {
    return {
      data: undefined,
      error: extractResult.error,
    }
  }

  // Process the extracted items into markdown
  const conversionResult = Errors.trySync(() => {
    interface BrainliftItem {
      id: string
      nm: string
      prnt: string | null
      pr: number
      metadata?: Record<string, unknown>
      [key: string]: unknown
    }

    const items = extractResult.data as unknown as BrainliftItem[]

    // Build hierarchy maps
    const idToNode = new Map<string, BrainliftItem>()
    const parentToChildren = new Map<string, BrainliftItem[]>()
    const rootItems: BrainliftItem[] = []

    // First pass: populate maps
    for (const item of items) {
      idToNode.set(item.id, item)

      if (item.prnt) {
        if (!parentToChildren.has(item.prnt)) {
          parentToChildren.set(item.prnt, [])
        }
        parentToChildren.get(item.prnt)?.push(item)
      } else {
        rootItems.push(item)
      }
    }

    // Sort children by 'pr' field
    for (const [parentId, children] of parentToChildren.entries()) {
      children.sort((a, b) => a.pr - b.pr)
    }

    // Process the name to convert HTML links to Markdown
    const processName = (nm: string): string => {
      // First unescape any HTML entities
      let result = nm

      // Handle <a href="URL">TEXT</a> links
      const linkRegex = /<a\s+href="([^"]+)">([^<]+)<\/a>/g
      result = result.replace(linkRegex, (_, url, text) => `[${text}](${url})`)

      return result
    }

    // Recursively build markdown
    const markdownLines: string[] = []

    const renderTree = (nodeId: string, depth: number) => {
      const node = idToNode.get(nodeId)
      if (!node) return

      const indent = "  ".repeat(depth)
      const prefix = depth > 0 ? "- " : ""
      markdownLines.push(`${indent}${prefix}${processName(node.nm)}`)

      const children = parentToChildren.get(nodeId) || []
      for (const child of children) {
        renderTree(child.id, depth + 1)
      }
    }

    // Process all root items
    for (const root of rootItems) {
      renderTree(root.id, 0)

      // Process children of the root
      const rootChildren = parentToChildren.get(root.id) || []
      for (const child of rootChildren) {
        renderTree(child.id, 1)
      }
    }

    return markdownLines.join("\n")
  })

  if (conversionResult.error) {
    return {
      data: undefined,
      error: Errors.wrap(
        conversionResult.error,
        "Failed to convert Brainlift data to markdown",
      ),
    }
  }

  return {
    data: conversionResult.data,
    error: undefined,
  }
}
