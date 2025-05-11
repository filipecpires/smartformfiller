
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
          // Ensure sconf.value (fieldId) is not empty and exists in formData
          if (sconf.value && formData[sconf.value] && formData[sconf.value].trim() !== '') {
            subfolderNamePart = formData[sconf.value].replace(/[^\w\s.-]/gi, '_').trim();
          } else {
            console.warn(`Subfolder field ID '${sconf.value}' is empty, not found in form data, or its value is empty. Stopping further subfolder creation.`);
            break; 
          }
        } else { // type === 'static'
          // Ensure sconf.value (custom name) is not empty
          if (sconf.value && sconf.value.trim() !== '') {
            subfolderNamePart = sconf.value.replace(/[^\w\s.-]/gi, '_').trim();
          } else {
            console.warn(`Custom subfolder name is empty. Stopping further subfolder creation.`);
            break;
          }
        }

        // If, after processing, subfolderNamePart is valid, create the folder
        if (subfolderNamePart) {
          currentParentFolderId = await findOrCreateFolder(subfolderNamePart, config.accessToken, currentParentFolderId);
          subfolderPathParts.push(subfolderNamePart);
        } else {
          // This case should ideally be caught by the checks above, but as a fallback.
          console.warn(`Resolved subfolder name is empty. Stopping subfolder creation at this level.`);
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

  } catch (error) {
    console.error('Erro ao salvar no Google Drive:', error);
    const errorMessage = error instanceof Error ? error.message : 'Ocorreu um erro desconhecido.';
    return {
      success: false,
      message: `Falha ao salvar no Google Drive: ${errorMessage}`,
    };
  }
}
