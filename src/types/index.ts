
import type { FormFieldSchema as AIFormFieldSchema } from '@/ai/flows/fill-form-fields';

export interface CustomFormFieldSchema extends AIFormFieldSchema {
  options?: string[]; // For dropdown type
}

export type FieldType = "text" | "date" | "dropdown";

export const fieldTypeLabels: Record<FieldType, string> = {
  text: "Texto",
  date: "Data",
  dropdown: "Seleção",
};
