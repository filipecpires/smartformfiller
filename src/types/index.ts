
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

export interface SubfolderConfigItem {
  type: 'field' | 'static'; // Type of subfolder name source
  value: string;            // Field ID if type is 'field', or custom name if type is 'static'
}

export interface GoogleDriveSaveConfig {
  accessToken: string;
  baseFolderName: string;
  subfolderConfig?: SubfolderConfigItem[]; // Array of subfolder configurations
  fileNameFieldId?: string; // ID of the form field to use for filename prefix
}

