import { tool } from 'ai';
import { z } from 'zod';
import { evaluate } from 'mathjs'; // Using math.js for robust expression evaluation

export const advancedCalculatorTool = tool({
  description: 'Performs advanced calculations including arithmetic, unit conversions, and mathematical functions. Supports expressions interpretable by math.js.',
  parameters: z.object({
    expression: z.string().describe('The mathematical expression or conversion query to evaluate. Examples: "2 * (3 + 4)", "10km to miles", "sqrt(16) + 5^2", "sin(pi/2)"')
  }),
  execute: async ({ expression }) => {
    let result;
    let errorMessage;

    try {
      // Attempt to evaluate the expression using math.js
      const calculatedValue = evaluate(expression);
      
      // Format the result. math.js can return complex objects for units, so stringify them.
      if (typeof calculatedValue === 'object' && calculatedValue !== null && typeof calculatedValue.toString === 'function') {
        result = calculatedValue.toString();
      } else {
        result = String(calculatedValue);
      }

    } catch (error: any) {
      console.error(`[advancedCalculatorTool] Error evaluating expression "${expression}":`, error);
      errorMessage = `Failed to evaluate expression: "${expression}". Error: ${error.message || 'Unknown error'}`;
      result = 'Error: Could not compute the result.'; // Provide a generic error message in the result field as well
    }

    return {
      computationResult: result,
      ...(errorMessage && { error: errorMessage }) // Conditionally add error message to output
    };
  },
}); 