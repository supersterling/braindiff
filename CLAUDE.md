# CLAUDE.md

## Commands
- **Setup**: `bun install`
- **Format/Typecheck** (should be run together): `bun check:write && bun typecheck`

## Git Workflow
- **IMPORTANT**: NEVER attempt to commit changes unless explicitly requested. All git commit operations must be specifically requested by the user.
- **Special Characters in Filenames**: When working with files that have special characters in their names (e.g., brackets in React Router filenames), use one of these approaches:
  ```bash
  # CORRECT: Use BatchTool to add files with special characters
  git add "src/app/component/[id].tsx"

  # DO NOT use glob patterns with special characters
  # INCORRECT - Will fail with "no matches found" error
  git add src/app/component/[id].tsx
  ```

## Technology Stack
- **Runtime**: Bun + Next.js
- **Package Manager**: Bun
- **Database ORM**: Drizzle ORM

## Code Style Guidelines
- **Naming**: Use camelCase for variables and functions, ensuring names are descriptive for clarity.
- **Prefer Undefined Over Null**:
  - Always prefer `undefined` over `null` for uninitialized or missing values throughout the entire codebase.
  - This applies to variables, function parameters, return values, state management, data models, and all other contexts.
  - Rationale: Consistency with Drizzle ORM and our data models, which standardize on `undefined` for missing values.
  - Example:
    ```typescript
    // CORRECT
    let value: string | undefined = undefined;
    function getValue(): string | undefined {
      return undefined;
    }

    // INCORRECT
    let value: string | null = null;
    function getValue(): string | null {
      return null;
    }
    ```
- **Import Patterns**:
  - ALWAYS use the `@/` module alias prefix for imports from the src directory:
    ```typescript
    // CORRECT
    import { something } from "@/components/ui/something";
    import { utilFunction } from "@/lib/utils";

    // INCORRECT
    import { something } from "../../components/ui/something";
    import { utilFunction } from "../lib/utils";
    ```
  - Only use relative imports when it is absolutely not possible to use the module alias.
- **React Patterns**:
  - ALWAYS import React namespace: `import * as React from "react"` (never use named imports).
  - ALWAYS use the React namespace when using React functions: `React.useState`, `React.useEffect`, etc.
  - ALWAYS prefer `undefined` over `null` when using `React.useState` in UI code:
    ```typescript
    // CORRECT
    const [value, setValue] = React.useState<string | undefined>(undefined);

    // INCORRECT
    const [value, setValue] = React.useState<string | null>(null);
    ```
- **Error Handling**:
  - Always import the Errors namespace: `import { Errors } from '@/errors'`.
  - Never use regular try/catch blocks; always use `Errors.try` instead:
    ```typescript
    const result = await Errors.try(somePromise);
    if (result.error) {
      // Handle error case by throwing the error
      throw Errors.wrap(result.error, "Operation failed");
      // DO NOT use console.error here
    }
    const data = result.data;  // Safe to use the data now
    ```
  - When propagating errors, always use `Errors.wrap` with throw for errors from external sources:
    ```typescript
    const result = await Errors.try(somePromise);
    if (result.error) {
      throw Errors.wrap(result.error, "Failed during screenshot capture");
    }
    ```
  - For synchronous operations, use `Errors.trySync` and always throw errors when bubbling up:
    ```typescript
    const result = Errors.trySync(() => someOperation());
    if (result.error) {
      throw Errors.wrap(result.error, "Failed during synchronous operation");
    }
    ```
  - NEVER use `console.log`, `console.debug`, or `console.error` in any files, unless it’s a script intended to be run manually.
  - Always propagate errors by throwing via `Errors.wrap` (for external errors) or `new Error` (for our own errors) instead of logging.
  - **Proper Use of Errors.wrap**:
    - `Errors.wrap` should only be used to wrap errors that originate from external sources or lower-level operations (e.g., database queries, API calls), preserving the error chain for debugging.
    - The first argument to `Errors.wrap` must NEVER be a `new Error("some message")`. If you’re creating your own error, throw it directly with `new Error` instead of wrapping it, as wrapping our own errors is pointless and loses the intent of maintaining an external error chain.
    - Correct usage (wrapping an external error):
      ```typescript
      const result = await Errors.try(someExternalOperation());
      if (result.error) {
        throw Errors.wrap(result.error, "Failed to complete external operation");
      }
      ```
    - Incorrect usage (wrapping our own error):
      ```typescript
      // INCORRECT: Wrapping a new Error that we created
      throw Errors.wrap(new Error("Some error"), "Operation failed");
      // CORRECT: Just throw the new Error directly
      throw new Error("Operation failed: Some error");
      ```
- **Comments**: For the love of God, NEVER write comments of any kind, unless they are specifically TODO markers or ts/biome-ignore pragma comments.
- **Migrations**: Never generate migrations; these are handled by a human developer.
- **Package Management**:
  - ALWAYS install missing packages with `bun i package-name` rather than using `@ts-ignore` or other workarounds.
- **Type Safety**:
  - NEVER use explicit `any` or implicit `any` types.
  - Always create proper interfaces or type definitions, even for complex objects.
  - Do not bypass TypeScript errors with comments or flags; fix the underlying issue.
  - When working with external libraries that have complex types, import and use those types directly.
  - NEVER use the `as` keyword for type assertions; it is an unsafe typecast that bypasses TypeScript’s type checker. Prefer runtime validation with Zod to ensure type safety without compromising runtime integrity.
- **Defensive Programming**:
  - Avoid using fallback values or default values for required fields. Instead, validate inputs strictly and ensure all required data is present before proceeding.
  - Do not use `||` or `??` operators to provide default values; use explicit checks and error handling to prevent impossible states.
  - In critical operations, especially those involving data processing or long-running tasks, prefer to use strict validation and throw errors immediately when issues are detected rather than relying on fallbacks. This prevents propagating invalid data, ensures issues are surfaced promptly, and simplifies debugging.
  - ALWAYS use early returns for conditionals instead of nesting if statements. This improves code readability and reduces cognitive load.
    ```typescript
    // CORRECT: Using early returns
    if (!condition) return
    // rest of the function...

    // INCORRECT: Nesting if statements
    if (condition) {
      // rest of the function...
    }
    ```
  - **Example in a Long-Running Educational Routine**: Below is an example of processing a batch of student submissions in an educational context, demonstrating proper use of `Errors.wrap` for external errors and `new Error` for our own logic errors:
    ```typescript
    async function processStudentSubmissions(submissionIds: number[]) {
      const processedResults: SubmissionResult[] = [];

      for (const submissionId of submissionIds) {
        // Fetch submission data from the database
        const submissionResult = await Errors.try(
          db.select().from(submissions).where(eq(submissions.id, submissionId))
        );
        if (submissionResult.error) {
          // Wrap external DB error with context
          throw Errors.wrap(submissionResult.error, `Failed to fetch submission ${submissionId}`);
        }
        const submission = submissionResult.data[0];
        if (submission == undefined) {
          // Our own logic error, throw directly
          throw new Error(`Submission with ID ${submissionId} not found`);
        }

        // Validate submission content
        if (submission.content == undefined || submission.content.trim() === "") {
          throw new Error(`Submission ${submissionId} has no valid content`);
        }

        // Attempt to grade the submission via an external API
        const gradingResult = await Errors.try(
          externalGradingApi.gradeSubmission(submission.content)
        );
        if (gradingResult.error) {
          // Wrap external API error with context
          throw Errors.wrap(gradingResult.error, `Failed to grade submission ${submissionId}`);
        }

        processedResults.push({
          id: submissionId,
          grade: gradingResult.data.grade,
        });
      }

      return processedResults;
    }

    // Usage example
    async function handleBatchProcessing() {
      const submissionIds = [1, 2, 3];
      const result = await Errors.try(processStudentSubmissions(submissionIds));
      if (result.error) {
        throw Errors.wrap(result.error, "Batch processing of submissions failed");
      }
      return result.data;
    }
    ```
    - In this example:
      - `Errors.wrap` is used to wrap errors from `db.select()` and `externalGradingApi.gradeSubmission()`, which are external operations.
      - `new Error` is used directly for our own validation logic (e.g., missing submission or empty content).
      - The process stops immediately upon error, ensuring invalid states don’t propagate.
- **Nullish Checks**:
  - When checking if a variable is nullish (either `undefined` or `null`), always use the double equal sign with `undefined`:
    ```typescript
    if (someVar == undefined) {
      // Handle the nullish case
    }
    ```
  - This is preferred because it specifically checks for both `undefined` and `null`, which is often what we intend in many scenarios.
  - **Avoid the following patterns:**
    - `!someVar`: This checks for falsy values, which include `0`, `''`, `false`, etc., not just `null` and `undefined`.
    - `!!someVar`: This converts the value to a boolean, again considering all falsy values.
    - `someVar == null`: This is not preferred from a style perspective, since we use `undefined` over `null` for consistency.
    - `someVar === null`: This only checks for `null` and does not account for `undefined`.
  - Using `someVar == undefined` ensures consistency and clarity in our codebase.
- **Data Fetching Pattern**:
  - ALWAYS colocate Drizzle queries with the server components that use them.
  - Define prepared statements at the top of the file as constants using the `.prepare()` method.
  - Export types derived from query results using the `Awaited<ReturnType<typeof queryName.execute>>[number]` pattern.
  - Pass data as Promise objects directly to child components for parallel data fetching.
  - Example:
    ```typescript
    // 1. Define prepared statements at the top of the file
    const getProjectById = db
      .select({
        id: schema.projects.id,
        name: schema.students.name,
        // other fields...
      })
      .from(schema.projects)
      .innerJoin(schema.students, eq(schema.projects.studentId, schema.students.id))
      .where(eq(schema.projects.id, sql.placeholder("id")))
      .limit(1)
      .prepare("get_project_by_id");

    // 2. Define derived types from the query results
    export type Project = Awaited<ReturnType<typeof getProjectById.execute>>[number];

    // 3. In the component, execute queries and pass promises directly
    export default function MyPage({ params }: ProjectPageProps) {
      // Execute the prepared statement with parameters
      const projectPromise = getProjectById
        .execute({ id: params.id })
        .then((result) => {
          if (!result || result.length === 0) redirect("/");
          return result[0];
        });

      // Pass promises directly to child components
      return (
        <Suspense>
          <MyComponent
            project={projectPromise}
            // other props...
          />
        </Suspense>
      );
    }
    ```
