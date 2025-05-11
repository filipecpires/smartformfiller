
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
    let targetFolderId = baseFolderId;
    let subfolderName = '';

    // 2. Create/Get Subfolder if configured
    if (config.subfolderFieldId && formData[config.subfolderFieldId]) {
      subfolderName = formData[config.subfolderFieldId].replace(/[^\w\s.-]/gi, '_'); // Sanitize subfolder name
      if (subfolderName) {
        targetFolderId = await findOrCreateFolder(subfolderName, config.accessToken, baseFolderId);
      }
    }

    // 3. Prepare .txt file content
    let fileContent = `Formulário: ${config.baseFolderName}${subfolderName ? ` / ${subfolderName}` : ''}\n`;
    fileContent += `Data do Preenchimento: ${new Date().toLocaleString('pt-BR')}\n\n`;
    fileContent += "Campos Preenchidos:\n";
    templateFields.forEach(field => {
      fileContent += `--------------------------------------------------\n`;
      fileContent += `Campo: ${field.label} (ID: ${field.id})\n`;
      fileContent += `Valor: ${formData[field.id] || 'Não preenchido'}\n`;
    });
    fileContent += `--------------------------------------------------\n`;


    // 4. Define file name (e.g., using a timestamp or a specific field)
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    let fileName = `dados_formulario_${timestamp}.txt`;
    // Optionally, use a field for the filename, e.g., an ID or name field
    // const nameFieldForFile = templateFields.find(f => f.label.toLowerCase().includes('nome'))?.id;
    // if (nameFieldForFile && formData[nameFieldForFile]) {
    //   fileName = `${formData[nameFieldForFile].replace(/[^\w\s.-]/gi, '_')}_${timestamp}.txt`;
    // }


    // 5. Upload .txt file
    const createdFile = await uploadTextFile(fileName, fileContent, targetFolderId, config.accessToken);

    return {
      success: true,
      message: `Arquivo "${createdFile.name}" salvo com sucesso no Google Drive!`,
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

