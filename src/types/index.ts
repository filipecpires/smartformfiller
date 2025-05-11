
import type { FormFieldSchema as AIFormFieldSchema } from '@/ai/flows/fill-form-fields';

export interface CustomFormFieldSchema extends AIFormFieldSchema {
  options?: string[]; // For dropdown type
}

export type FieldType = "text" | "date" | "number" | "email" | "dropdown";

export const fieldTypeLabels: Record<FieldType, string> = {
  text: "Texto",
  date: "Data",
  number: "Número",
  email: "E-mail",
  dropdown: "Seleção",
};

export interface GoogleDriveSaveConfig {
  accessToken: string;
  baseFolderName: string;
  subfolderFieldIds?: string[]; // Array of field IDs for subfolder hierarchy
  fileNameFieldId?: string; // ID of the form field to use for filename prefix
}

