
'use server';

import type { CustomFormFieldSchema, GoogleDriveSaveConfig } from '@/types';
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
    if (config.subfolderFieldIds && config.subfolderFieldIds.length > 0) {
      for (const fieldId of config.subfolderFieldIds) {
        if (formData[fieldId]) {
          const subfolderNamePart = formData[fieldId].replace(/[^\w\s.-]/gi, '_').trim();
          if (subfolderNamePart) {
            currentParentFolderId = await findOrCreateFolder(subfolderNamePart, config.accessToken, currentParentFolderId);
            subfolderPathParts.push(subfolderNamePart);
          } else {
            // If a field resolves to an empty subfolder name, stop creating deeper subfolders
            break; 
          }
        } else {
          // If a field ID for subfolder is missing in formData, stop creating deeper subfolders
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

