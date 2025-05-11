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
          // sconf.value is the fieldId. It's guaranteed to be a non-empty string by client filter.
          const fieldValue = formData[sconf.value];
          if (fieldValue && fieldValue.trim() !== '') {
            subfolderNamePart = fieldValue.replace(/[^\w\s.-]/gi, '_').trim();
          } else {
            console.warn(`Subfolder configuration for field ID '${sconf.value}' resulted in an empty name because the field is missing or empty in form data. Stopping further subfolder creation.`);
            break; 
          }
        } else { // type === 'static'
          // sconf.value is the custom static name. It's guaranteed to be a non-empty string by client filter.
          subfolderNamePart = sconf.value.replace(/[^\w\s.-]/gi, '_').trim();
        }

        // After deriving subfolderNamePart, check if it's usable
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
      const prefix = formData[config.fileNameFieldId].replace(/[^\w\s.-]/gi, '_').trim();
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

  } catch (error: any) { // Catch 'any' for more robust error handling
    console.error('Erro ao salvar no Google Drive (raw error object):', error);
    
    let errorMessage = 'Ocorreu um erro desconhecido ao processar sua solicitação no servidor.';
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    } else if (error && typeof error.toString === 'function') {
      // Attempt to get a string representation if it's not an Error or string
      const errorString = error.toString();
      if (errorString !== '[object Object]') { // Avoid generic object stringification
        errorMessage = errorString;
      } else if (error.message && typeof error.message === 'string') { // Check for a message property
        errorMessage = error.message;
      }
    }

    return {
      success: false,
      message: `Falha ao salvar no Google Drive: ${errorMessage}`,
    };
  }
}
