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

const FillFormFieldsOutputSchema = z.object({
  filledFields: z.record(z.string(), z.string()).describe('A map of form field IDs to their filled values.'),
});
export type FillFormFieldsOutput = z.infer<typeof FillFormFieldsOutputSchema>;

const extractFieldValue = ai.defineTool(
  {
    name: 'extractFieldValue',
    description: 'Extracts the value for a specific field from the document.',
    inputSchema: z.object({
      documentDataUri: z
        .string()
        .describe(
          "The uploaded document as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
        ),
      fieldLabel: z.string().describe('The label or question associated with the field.'),
    }),
    outputSchema: z.string().describe('The extracted value for the field.'),
  },
  async input => {
    // In a real implementation, this would use OCR and document parsing techniques
    // to extract the field value from the document.
    // For this example, we'll just return a placeholder.
    console.log(`[extractFieldValue] called with ${input.fieldLabel}`);
    return `Extracted value for ${input.fieldLabel}`; 
  }
);

const fillFormFieldsPrompt = ai.definePrompt({
  name: 'fillFormFieldsPrompt',
  input: {schema: FillFormFieldsInputSchema},
  output: {schema: FillFormFieldsOutputSchema},
  tools: [extractFieldValue],
  prompt: `You are an AI assistant specialized in filling out forms based on uploaded documents.

  Analyze the uploaded document (passed as a data URI) and pre-fill the following form fields:

  {{#each formTemplate}}
  - Field ID: {{this.id}}
    Field Label: {{this.label}}
    Field Type: {{this.type}}
  {{/each}}

  For each field, use the 'extractFieldValue' tool to extract the relevant information from the document.  Use the field label as the query for the tool.

  Return a JSON object where the keys are the field IDs and the values are the extracted values.

  Example:
  {
    "field1": "Extracted value 1",
    "field2": "Extracted value 2",
    ...
  }

  Make sure to return a valid JSON object that conforms to the schema.
  `,
});


const fillFormFieldsFlow = ai.defineFlow(
  {
    name: 'fillFormFieldsFlow',
    inputSchema: FillFormFieldsInputSchema,
    outputSchema: FillFormFieldsOutputSchema,
  },
  async input => {
    const {output} = await fillFormFieldsPrompt(input);
    return output!;
  }
);

export async function fillFormFields(input: FillFormFieldsInput): Promise<FillFormFieldsOutput> {
  return fillFormFieldsFlow(input);
}

export type {FormFieldSchema};
