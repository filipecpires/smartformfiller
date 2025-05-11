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
export type ExtractFieldValueInput = z.infer<typeof ExtractFieldValueInputSchema>;


const ExtractFieldValueOutputSchema = z.object({
  value: z.string().describe('The extracted value for the field. If no value is found, return an empty string or a sensible default like "Não encontrado".'),
});


const extractSingleFieldValuePrompt = ai.definePrompt({
  name: 'extractSingleFieldValuePrompt',
  input: { schema: ExtractFieldValueInputSchema },
  output: { schema: ExtractFieldValueOutputSchema },
  prompt: `Analyze the provided document carefully. Your task is to extract a specific piece of information.
Document: {{media url=documentDataUri}}

You need to find the value for the field described by the following label: "{{fieldLabel}}".

Instructions:
1.  Accuracy is paramount. Only return information explicitly found in the document that directly corresponds to the field label.
2.  Pay close attention to the ENTIRE field label to understand its precise context. Disambiguate if similar terms appear elsewhere in the document.
    For example:
    - If the label is "Nome Completo do Contratante", find the full name associated specifically with the 'Contratante' role, not just any name in the document.
    - If the label is "Data de Início do Contrato", identify the date that explicitly marks the beginning of the contract.
    - If the label is "CPF do Beneficiário", look for a CPF number clearly linked to a 'Beneficiário'.
    - If the label is "Valor da Multa", extract the monetary amount specified as a 'Multa' (fine/penalty).
    - If a label is "Endereço - Complemento", find the address supplement (like apartment number), not the main street address.
3.  If, after careful analysis, you cannot find a specific value for the field, return the exact string "Não encontrado". Do NOT invent or infer information.
4.  Return only the extracted value as a string.
`,
});


const extractFieldValueTool = ai.defineTool(
  {
    name: 'extractFieldValue',
    description: 'Extracts the value for a specific field from the document based on its label. Considers the context of the field label to find the most relevant information.',
    inputSchema: ExtractFieldValueInputSchema,
    outputSchema: ExtractFieldValueOutputSchema,
  },
  async (input) => {
    console.log(`[extractFieldValueTool] called for field: ${input.fieldLabel}`);
    try {
      const { output } = await extractSingleFieldValuePrompt(input);
      if (output && typeof output.value === 'string') {
        console.log(`[extractFieldValueTool] Extracted value for "${input.fieldLabel}": ${output.value}`);
        return output;
      }
      console.warn(`[extractFieldValueTool] No output or invalid output type from prompt for field: ${input.fieldLabel}. Output:`, output);
      return { value: "Não encontrado (IA não retornou valor)" };
    } catch (e) {
      console.error(`[extractFieldValueTool] Error extracting value for "${input.fieldLabel}":`, e);
      return { value: "Erro ao extrair valor" };
    }
  }
);

const fillFormFieldsFlow = ai.defineFlow(
  {
    name: 'fillFormFieldsFlow',
    inputSchema: FillFormFieldsInputSchema,
    outputSchema: FillFormFieldsOutputSchema,
    // This flow now programmatically calls the tool/prompt, so tools are not listed here for LLM decision.
  },
  async (input) => {
    const { documentDataUri, formTemplate } = input;
    const filledFieldsResult: Array<z.infer<typeof FilledFormFieldSchema>> = [];

    console.log(`[fillFormFieldsFlow] Starting to fill ${formTemplate.length} fields.`);

    for (const field of formTemplate) {
      try {
        console.log(`[fillFormFieldsFlow] Processing field: ${field.label} (ID: ${field.id})`);
        
        const toolInput: ExtractFieldValueInput = {
          documentDataUri: documentDataUri,
          fieldLabel: field.label,
        };
        
        const extractionResult = await extractFieldValueTool(toolInput);
        
        filledFieldsResult.push({
          fieldId: field.id,
          value: extractionResult.value, 
        });
        console.log(`[fillFormFieldsFlow]     Value for "${field.label}": ${extractionResult.value}`);

      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : "Unknown error during field processing";
        console.error(`[fillFormFieldsFlow] Error processing field "${field.label}" (ID: ${field.id}):`, errorMessage);
        filledFieldsResult.push({
          fieldId: field.id,
          value: "Erro ao processar este campo",
        });
      }
    }
    console.log(`[fillFormFieldsFlow] Finished processing all fields. Found ${filledFieldsResult.length} results.`);
    return { filledFields: filledFieldsResult };
  }
);

export async function fillFormFields(input: FillFormFieldsInput): Promise<FillFormFieldsOutput> {
  return fillFormFieldsFlow(input);
}

export type {FormFieldSchema};
