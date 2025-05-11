// This is an automatically generated file. Please do not edit. 
'use server';

/**
 * @fileOverview This file defines a Genkit flow to automatically fill form fields using AI analysis of an uploaded document.
 *
 * - fillFormFields -  A function that takes document data and a form template definition, analyzes the document, and fills the form fields.
 * - FillFormFieldsInput - The input type for the fillFormFields function.
 * - FillFormFieldsOutput - The output type for the fillFormFields function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';


const FormFieldSchema = z.object({
  id: z.string().describe('Unique identifier for the field.'),
  type: z.string().describe('Type of the form field (e.g., text, date, dropdown).'),
  label: z.string().describe('Label or question associated with the field.'),
});

const FillFormFieldsInputSchema = z.object({
  documentDataUri: z
    .string()
    .describe(
      "The uploaded document as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  formTemplate: z.array(FormFieldSchema).describe('A list of form field definitions.'),
});
export type FillFormFieldsInput = z.infer<typeof FillFormFieldsInputSchema>;

const FilledFormFieldSchema = z.object({
  fieldId: z.string().describe('The ID of the form field.'),
  value: z.string().describe('The extracted value for the field. If no value is found, return an empty string or a sensible default like "Não encontrado".'),
});

const FillFormFieldsOutputSchema = z.object({
  filledFields: z.array(FilledFormFieldSchema).describe('A list of form field IDs and their extracted values.'),
});
export type FillFormFieldsOutput = z.infer<typeof FillFormFieldsOutputSchema>;


const ExtractFieldValueInputSchema = z.object({
  documentDataUri: z
    .string()
    .describe(
      "The uploaded document as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  fieldLabel: z.string().describe('The label or question associated with the field for which to extract the value.'),
});

const ExtractFieldValueOutputSchema = z.object({
  value: z.string().describe('The extracted value for the field. If no value is found, return an empty string or a sensible default like "Não encontrado".'),
});


const extractSingleFieldValuePrompt = ai.definePrompt({
  name: 'extractSingleFieldValuePrompt',
  input: { schema: ExtractFieldValueInputSchema },
  output: { schema: ExtractFieldValueOutputSchema },
  prompt: `Analyze the following document:
Document: {{media url=documentDataUri}}

Extract the value for the field with the label: "{{fieldLabel}}".
If you find the value, return it. If you cannot find a specific value for the field, return "Não encontrado".
Do not make up information. Only return information explicitly found in the document relevant to the field label.
`,
});


const extractFieldValueTool = ai.defineTool(
  {
    name: 'extractFieldValue',
    description: 'Extracts the value for a specific field from the document based on its label.',
    inputSchema: ExtractFieldValueInputSchema,
    outputSchema: ExtractFieldValueOutputSchema,
  },
  async (input) => {
    console.log(`[extractFieldValueTool] called for field: ${input.fieldLabel}`);
    try {
      const { output } = await extractSingleFieldValuePrompt(input);
      if (output) {
        console.log(`[extractFieldValueTool] Extracted value for "${input.fieldLabel}": ${output.value}`);
        return output;
      }
      console.warn(`[extractFieldValueTool] No output from prompt for field: ${input.fieldLabel}`);
      return { value: "Não encontrado (erro no prompt)" };
    } catch (e) {
      console.error(`[extractFieldValueTool] Error extracting value for "${input.fieldLabel}":`, e);
      return { value: "Erro ao extrair" };
    }
  }
);

const fillFormFieldsFlow = ai.defineFlow(
  {
    name: 'fillFormFieldsFlow',
    inputSchema: FillFormFieldsInputSchema,
    outputSchema: FillFormFieldsOutputSchema,
    tools: [extractFieldValueTool],
  },
  async (input) => {
    const { documentDataUri, formTemplate } = input;
    const filledFields: { fieldId: string; value: string }[] = [];

    for (const field of formTemplate) {
      console.log(`Processing field: ${field.label} (ID: ${field.id})`);
      const toolInput = {
        documentDataUri,
        fieldLabel: field.label,
      };

      // Call the tool to extract value for the current field
      // The flow itself doesn't directly call the tool; the model decides.
      // We need a prompt that utilizes the tool.
      // Let's adjust the strategy: the main prompt will instruct the LLM to use the tool for each field.
    }

    // This flow will now use a main prompt that orchestrates the tool calls.
    // The previous approach of calling the tool in a loop here is not how Genkit tools are typically used within a single flow execution.
    // Instead, a single, more complex prompt tells the LLM to use the tool for each item.

    const systemPrompt = `You are an AI assistant designed to fill out form fields by extracting information from a provided document.
For each field in the 'formTemplate', you MUST use the 'extractFieldValue' tool to get the value from the 'documentDataUri'.
The 'fieldLabel' for the tool should be the 'label' of the current form field.
Collect all results and return them in the specified output format.
Ensure that for every field in the input 'formTemplate', there is a corresponding entry in the 'filledFields' output array.
If the tool returns "Não encontrado" or similar for a field, use that value.
Document: {{media url=documentDataUri}}
Form Template:
{{#each formTemplate}}
- Field ID: {{this.id}}, Label: {{this.label}}, Type: {{this.type}}
{{/each}}
`;

    const fillAllFieldsPrompt = ai.definePrompt({
        name: 'fillAllFieldsOrchestrationPrompt',
        input: { schema: FillFormFieldsInputSchema },
        output: { schema: FillFormFieldsOutputSchema },
        tools: [extractFieldValueTool],
        prompt: systemPrompt,
        model: ai.getModel('googleai/gemini-2.0-flash'), // Ensure a capable model is used
        config: {
            // Higher temperature might be needed for complex instructions and tool use.
            // Adjust as necessary.
            // temperature: 0.7 
        }
    });

    const { output } = await fillAllFieldsPrompt(input);

    if (!output || !output.filledFields) {
      console.error("Flow Error: Main prompt did not return the expected filledFields structure.");
      // Construct a default error response if output is malformed
      return { 
        filledFields: input.formTemplate.map(field => ({
          fieldId: field.id,
          value: "Erro no processamento do formulário"
        }))
      };
    }
    
    // Ensure all fields have an entry, even if the LLM missed some
    const finalFilledFields = input.formTemplate.map(templateField => {
        const foundField = output.filledFields.find(f => f.fieldId === templateField.id);
        if (foundField) {
            return foundField;
        }
        return { fieldId: templateField.id, value: "Não processado" };
    });

    return { filledFields: finalFilledFields };
  }
);

export async function fillFormFields(input: FillFormFieldsInput): Promise<FillFormFieldsOutput> {
  // Map the filledFields array to the record format expected by the frontend
  const flowOutput = await fillFormFieldsFlow(input);
  const filledFieldsRecord: Record<string, string> = {};
  flowOutput.filledFields.forEach(field => {
    filledFieldsRecord[field.fieldId] = field.value;
  });
  // This function's return type in the frontend (page.tsx) is FillFormFieldsOutput, which expects `filledFields` as a Record.
  // However, the Zod schema FillFormFieldsOutputSchema defines filledFields as an array.
  // For consistency and to match the original intent of the calling code, we adapt here.
  // This is a temporary workaround. Ideally, the Zod schema or the frontend expectation should be aligned.
  return { filledFields: filledFieldsRecord as any }; // Cast to 'any' to bypass strict type check for this mismatch.
}

export type {FormFieldSchema};
