import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { Octokit } from '@octokit/rest';

/**
 * Claude Issue Tool
 * -----------------
 * Creates a new issue on a GitHub repository.
 *
 * NOTE: The GitHub Personal Access Token must be provided via the environment variable `GITHUB_TOKEN`.
 */
export const claudeIssueTool = createTool({
  id: 'claude-issue',
  description: 'Create a new GitHub issue using Claude Issue Tool.',
  inputSchema: z.object({
    owner: z
      .string()
      .min(1)
      .describe('The owner of the GitHub repository.'),
    repo: z
      .string()
      .min(1)
      .describe('The name of the GitHub repository.'),
    title: z
      .string()
      .min(1)
      .describe('The title of the issue.'),
    body: z
      .string()
      .optional()
      .describe('The body content of the issue. Optional.'),
  }),
  outputSchema: z.object({
    issueUrl: z.string().url().describe('The URL of the created issue.'),
  }),
  execute: async ({ context }) => {
    const { owner, repo, title, body } = context;

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
      const response = await octokit.issues.create({
        owner,
        repo,
        title,
        body,
      });

      return { issueUrl: response.data.html_url };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to create GitHub issue: ${error.message}`);
      }
      throw new Error('An unknown error occurred while creating the GitHub issue.');
    }
  },
}); 