'use server';

import type { CustomFormFieldSchema, GoogleDriveSaveConfig, SubfolderConfigItem } from '@/types';
import { findOrCreateFolder, uploadTextFile } from '@/services/google-drive-service';

interface SaveToDriveResult {
  success: boolean;
  message: string;
  driveFileLink?: string;
  driveFolderLink?: string;
}

export async function saveToDriveAction(
  config: GoogleDriveSaveConfig,
  templateFields: CustomFormFieldSchema[],
  formData: Record<string, string>
): Promise<SaveToDriveResult> {
  if (!config.accessToken) {
    return { success: false, message: 'Access Token não fornecido.' };
  }
  if (!config.baseFolderName) {
    return { success: false, message: 'Nome da pasta base não fornecido.' };
  }

  try {
    // 1. Create/Get Base Folder
    const baseFolderId = await findOrCreateFolder(config.baseFolderName, config.accessToken, 'root');
    let currentParentFolderId = baseFolderId;
    const subfolderPathParts: string[] = [];

    // 2. Create/Get Subfolders if configured
    if (config.subfolderConfig && config.subfolderConfig.length > 0) {
      for (const sconf of config.subfolderConfig) {
        let subfolderNamePart = '';
        if (sconf.type === 'field') {
          const fieldValue = formData[sconf.value];
          if (fieldValue && fieldValue.trim() !== '') {
            subfolderNamePart = fieldValue.replace(/[^\w\s.-]/gi, '_').trim();
          } else {
            console.warn(`Subfolder configuration for field ID '${sconf.value}' resulted in an empty name because the field is missing or empty in form data. Stopping further subfolder creation.`);
            break; 
          }
        } else { // type === 'static'
          subfolderNamePart = sconf.value.replace(/[^\w\s.-]/gi, '_').trim();
        }

        if (subfolderNamePart && subfolderNamePart.trim() !== '') {
          currentParentFolderId = await findOrCreateFolder(subfolderNamePart, config.accessToken, currentParentFolderId);
          subfolderPathParts.push(subfolderNamePart);
        } else {
          console.warn(`Derived subfolder name for config item (type: ${sconf.type}, original value: '${sconf.value}') is empty after sanitization or due to empty form field. Stopping subfolder creation.`);
          break; 
        }
      }
    }
    const targetFolderId = currentParentFolderId;
    const fullFolderPath = [config.baseFolderName, ...subfolderPathParts].join(' / ');

    // 3. Prepare .txt file content
    let fileContent = `Formulário: ${fullFolderPath}\n`;
    fileContent += `Data do Preenchimento: ${new Date().toLocaleString('pt-BR')}\n\n`;
    fileContent += "Campos Preenchidos:\n";
    templateFields.forEach(field => {
      fileContent += `--------------------------------------------------\n`;
      fileContent += `Campo: ${field.label} (ID: ${field.id})\n`;
      fileContent += `Valor: ${formData[field.id] || 'Não preenchido'}\n`;
    });
    fileContent += `--------------------------------------------------\n`;


    // 4. Define file name
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    let fileName = `dados_formulario_${timestamp}.txt`;
    
    if (config.fileNameFieldId && formData[config.fileNameFieldId]) {
      const prefix = String(formData[config.fileNameFieldId]).replace(/[^\w\s.-]/gi, '_').trim();
      if (prefix) {
        fileName = `${prefix}_${timestamp}.txt`;
      }
    }


    // 5. Upload .txt file
    const createdFile = await uploadTextFile(fileName, fileContent, targetFolderId, config.accessToken);

    return {
      success: true,
      message: `Arquivo "${createdFile.name}" salvo com sucesso no Google Drive em "${fullFolderPath}"!`,
      driveFileLink: createdFile.webViewLink,
      driveFolderLink: `https://drive.google.com/drive/folders/${targetFolderId}`
    };

  } catch (error: any) {
    // Log the full error object for server-side debugging first.
    console.error('saveToDriveAction: Raw error object during Google Drive save:', error);
    
    let detailedErrorMessage = 'Ocorreu um erro desconhecido ao processar sua solicitação no servidor.';

    if (error instanceof Error) {
      detailedErrorMessage = error.message;
    } else if (typeof error === 'string') {
      detailedErrorMessage = error;
    } else if (error && typeof error.message === 'string') {
      // Handle cases where error is an object with a 'message' string property
      detailedErrorMessage = error.message;
    } else if (error && typeof error.toString === 'function') {
      const errorString = error.toString();
      // Avoid generic "[object Object]" if toString() doesn't provide useful info
      if (errorString !== '[object Object]' && errorString.trim() !== '') {
        detailedErrorMessage = errorString;
      }
    }
    // Ensure the message is not excessively long, as a precaution.
    if (detailedErrorMessage.length > 1000) {
        detailedErrorMessage = detailedErrorMessage.substring(0, 1000) + "... (mensagem truncada)";
    }


    return {
      success: false,
      message: `Falha ao salvar no Google Drive: ${detailedErrorMessage}`,
    };
  }
}