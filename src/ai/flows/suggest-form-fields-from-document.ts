// This is an automatically generated file. Please do not edit. 
'use server';

/**
 * @fileOverview This file defines a Genkit flow to suggest form fields by analyzing an uploaded document.
 *
 * - suggestFormFieldsFromDocument - A function that takes document data and suggests potential form fields.
 * - SuggestFormFieldsInput - The input type for the suggestFormFieldsFromDocument function.
 * - SuggestFormFieldsOutput - The output type for the suggestFormFieldsFromDocument function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestFormFieldsInputSchema = z.object({
  documentDataUri: z
    .string()
    .describe(
      "The uploaded document as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type SuggestFormFieldsInput = z.infer<typeof SuggestFormFieldsInputSchema>;

const SuggestedFieldSchema = z.object({
  label: z.string().describe('A concise and descriptive label for the suggested form field (e.g., "Nome Completo", "Data de Nascimento", "Valor Total").'),
  type: z.enum(['text', 'date', 'number', 'email', 'dropdown_candidate']).describe('The most likely type for this field (e.g., text, date, number, email). Use "dropdown_candidate" if it seems like a field that would benefit from predefined options.'),
  exampleValue: z.string().optional().describe('An example value extracted directly from the document for this field, if a clear one is found.'),
  possibleOptions: z.array(z.string()).optional().describe('If type is dropdown_candidate, suggest 3-5 distinct example values from the document that could serve as options, if discernible and if there are a limited set of recurring values.')
});
export type SuggestedField = z.infer<typeof SuggestedFieldSchema>;

const SuggestFormFieldsOutputSchema = z.object({
  suggestedFields: z.array(SuggestedFieldSchema).describe('A list of suggested form fields with their labels, types, example values, and possible options for dropdowns.'),
});
export type SuggestFormFieldsOutput = z.infer<typeof SuggestFormFieldsOutputSchema>;

const suggestFieldsPrompt = ai.definePrompt({
  name: 'suggestFieldsPrompt',
  input: { schema: SuggestFormFieldsInputSchema },
  output: { schema: SuggestFormFieldsOutputSchema },
  prompt: `You are an expert AI assistant specialized in analyzing documents to identify potential form fields.
Your goal is to help users quickly create a form template based on the content of the provided document.

Document: {{media url=documentDataUri}}

Instructions:
1.  Thoroughly analyze the document to identify distinct pieces of information that would typically be captured in a form (e.g., names, dates, addresses, identification numbers, amounts, specific terms, clauses, emails, etc.).
2.  For each identified piece of information, suggest a form field:
    a.  **Label**: Create a clear, concise, and human-readable label for the field. The label should accurately represent the information it captures (e.g., "Nome do Contratante", "Data de Início", "Valor do Aluguel", "CPF", "Endereço Completo", "Email de Contato").
    b.  **Type**: Determine the most appropriate data type. Choose from: 'text', 'date', 'number', 'email'. If you identify a field that seems to have a limited set of recurring, distinct values within the document (e.g., "Status do Contrato" with values like "Ativo", "Inativo", "Pendente"), suggest 'dropdown_candidate' as the type.
    c.  **Example Value**: If you can extract a clear and unambiguous example of this information directly from the document, provide it. Otherwise, omit this. For dates, try to provide them in YYYY-MM-DD format if possible, or as they appear. For numbers, extract the numerical value.
    d.  **Possible Options**: ONLY if the type is 'dropdown_candidate', AND you can identify a small set (3-5) of distinct, recurring values for this field within the document, provide these values as an array of strings in the 'possibleOptions' key. The options should be concise and directly from the document. If suitable options are not clearly discernible or if there are too many variations, omit 'possibleOptions'.
3.  Prioritize common and clearly identifiable fields. Avoid suggesting fields that are too vague, overly complex, or derived from long paragraphs of free text unless they represent a key concept.
4.  Aim for a reasonable number of suggestions (e.g., 5-15 fields) that cover the main information points in the document. Do not suggest fields for every single word or number.
5.  Return the suggestions as an array of objects, where each object contains 'label', 'type', and optionally 'exampleValue' and 'possibleOptions'.

Example of good suggestions:
- { label: "Nome Completo do Locatário", type: "text", exampleValue: "João da Silva" }
- { label: "Data de Vencimento", type: "date", exampleValue: "2024-12-31" }
- { label: "Valor da Multa Contratual", type: "number", exampleValue: "500.00" }
- { label: "Email Principal", type: "email", exampleValue: "contato@example.com" }
- { label: "Tipo de Imóvel", type: "dropdown_candidate", exampleValue: "Apartamento", possibleOptions: ["Apartamento", "Casa Térrea", "Sobrado", "Comercial"] }
- { label: "Estado Civil", type: "dropdown_candidate", exampleValue: "Casado(a)" } (omit possibleOptions if not readily available as a distinct list in the doc)


If the document is very short or unclear, it's okay to return fewer or no suggestions.
Return the list of suggested fields.
`,
});

const suggestFormFieldsFlow = ai.defineFlow(
  {
    name: 'suggestFormFieldsFlow',
    inputSchema: SuggestFormFieldsInputSchema,
    outputSchema: SuggestFormFieldsOutputSchema,
  },
  async (input) => {
    console.log('[suggestFormFieldsFlow] Analyzing document to suggest fields.');
    try {
      const { output } = await suggestFieldsPrompt(input);
      if (output && output.suggestedFields) {
        console.log(`[suggestFormFieldsFlow] Suggested ${output.suggestedFields.length} fields.`);
        // Log suggested options for debugging
        output.suggestedFields.forEach(field => {
          if (field.type === 'dropdown_candidate' && field.possibleOptions) {
            console.log(`[suggestFormFieldsFlow] Field "${field.label}" suggested as dropdown with options: ${field.possibleOptions.join(', ')}`);
          }
        });
        return output;
      }
      console.warn('[suggestFormFieldsFlow] No fields suggested or output was malformed.');
      return { suggestedFields: [] };
    } catch (e) {
      console.error('[suggestFormFieldsFlow] Error suggesting fields:', e);
      // It's better to return an empty list than to throw and break the UX
      return { suggestedFields: [] };
    }
  }
);

export async function suggestFormFieldsFromDocument(input: SuggestFormFieldsInput): Promise<SuggestFormFieldsOutput> {
  return suggestFormFieldsFlow(input);
}
