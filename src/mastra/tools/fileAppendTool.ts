import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { promises as fs } from 'fs';
import path from 'path';

const fileAppendToolSchema = z.object({
  filePath: z
    .string()
    .describe(
      "The path to the file to append to, relative to the 'public/slidecreatorAgent' directory.",
    ),
  content: z.string().describe('The content to append to the file.'),
});

export const fileAppendTool = createTool({
  id: 'fileAppend',
  description:
    "Appends content to a specified file within the 'public/slidecreatorAgent' directory.",
  inputSchema: fileAppendToolSchema,
  outputSchema: z.object({
    message: z.string(),
  }),
  execute: async ({ context }) => {
    const { filePath, content } = context;
    try {
      const workingDirectory = path.resolve('public/slidecreatorAgent');
      const absoluteFilePath = path.resolve(workingDirectory, filePath);

      if (!absoluteFilePath.startsWith(workingDirectory)) {
        throw new Error(
          'Security violation: Attempted to write to a file outside the designated agent working directory.',
        );
      }

      await fs.mkdir(path.dirname(absoluteFilePath), { recursive: true });

      await fs.appendFile(absoluteFilePath, content + '\n');

      return {
        message: `Successfully appended content to ${filePath}.`,
      };
    } catch (error: any) {
      throw new Error(`Failed to append to file '${filePath}': ${error.message}`);
    }
  },
}); 