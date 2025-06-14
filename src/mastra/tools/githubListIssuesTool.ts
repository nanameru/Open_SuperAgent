import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { Octokit } from '@octokit/rest';

const inputSchema = z.object({
  owner: z
    .string()
    .min(1)
    .describe('The owner of the GitHub repository.'),
  repo: z
    .string()
    .min(1)
    .describe('The name of the GitHub repository.'),
  state: z
    .enum(['open', 'closed', 'all'])
    .default('open')
    .describe("The state of the issues to return. Can be 'open', 'closed', or 'all'. Defaults to 'open'."),
  per_page: z
    .number()
    .int()
    .min(1)
    .max(100)
    .default(30)
    .describe('The number of results per page (max 100). Defaults to 30.'),
});

async function fetchGitHubIssues(octokit: Octokit, context: z.infer<typeof inputSchema>) {
  const { owner, repo, state, per_page } = context;

  const response = await octokit.issues.listForRepo({
    owner,
    repo,
    state,
    per_page,
  });

  return response.data.map(issue => ({
    number: issue.number,
    title: issue.title,
    url: issue.html_url,
    state: issue.state,
    user: issue.user?.login ?? 'unknown',
    createdAt: issue.created_at,
    body: issue.body ?? null, // Handle undefined case
  }));
}

/**
 * githubListIssuesTool
 * --------------------
 * Lists issues from a specified GitHub repository.
 *
 * NOTE: The GitHub Personal Access Token must be provided via the environment variable `GITHUB_TOKEN`.
 */
export const githubListIssuesTool = createTool({
  id: 'github-list-issues',
  description: 'Lists issues from a GitHub repository.',
  inputSchema,
  outputSchema: z.object({
    issues: z.array(
      z.object({
        number: z.number(),
        title: z.string(),
        url: z.string().url(),
        state: z.string(),
        user: z.string(),
        createdAt: z.string(),
        body: z.string().nullable(),
      })
    ),
  }),
  execute: async ({ context }) => {
    const githubToken = process.env.GITHUB_TOKEN;
    if (!githubToken) {
      throw new Error(
        'GITHUB_TOKEN environment variable is not set. Please provide your GitHub Personal Access Token.'
      );
    }

    const octokit = new Octokit({
      auth: githubToken,
    });

    try {
      const simplifiedIssues = await fetchGitHubIssues(octokit, context);
      return { issues: simplifiedIssues };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to list GitHub issues: ${error.message}`);
      }
      throw new Error('An unknown error occurred while listing GitHub issues.');
    }
  },
}); 