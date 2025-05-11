
// IMPORTANT: This service uses a simplified approach for access tokens.
// In a production environment, you would need a proper OAuth 2.0 flow to obtain and manage access tokens securely.
// The access token should have the scope 'https://www.googleapis.com/auth/drive.file' to create files and folders.

const DRIVE_API_URL = 'https://www.googleapis.com/drive/v3/files';
const DRIVE_UPLOAD_API_URL = 'https://www.googleapis.com/upload/drive/v3/files';

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
}

/**
 * Finds a folder by name within a parent folder, or creates it if not found.
 * @param folderName The name of the folder to find or create.
 * @param accessToken The Google API access token.
 * @param parentFolderId Optional. The ID of the parent folder. Defaults to 'root'.
 * @returns The ID of the found or created folder.
 * @throws Error if API call fails.
 */
export async function findOrCreateFolder(
  folderName: string,
  accessToken: string,
  parentFolderId: string = 'root'
): Promise<string> {
  // Try to find the folder first
  const query = `mimeType='application/vnd.google-apps.folder' and name='${folderName}' and '${parentFolderId}' in parents and trashed=false`;
  const searchUrl = `${DRIVE_API_URL}?q=${encodeURIComponent(query)}&fields=files(id,name)`;

  const searchResponse = await fetch(searchUrl, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json',
    },
  });

  if (!searchResponse.ok) {
    const errorData = await searchResponse.json().catch(() => ({}));
    console.error('Google Drive API error (find folder):', errorData);
    throw new Error(`Failed to search for folder: ${searchResponse.statusText} - ${errorData.error?.message || 'Unknown error'}`);
  }

  const searchResult = await searchResponse.json();
  if (searchResult.files && searchResult.files.length > 0) {
    return searchResult.files[0].id;
  }

  // Folder not found, create it
  const folderMetadata = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder',
    parents: [parentFolderId],
  };

  const createResponse = await fetch(DRIVE_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(folderMetadata),
  });

  if (!createResponse.ok) {
    const errorData = await createResponse.json().catch(() => ({}));
    console.error('Google Drive API error (create folder):', errorData);
    throw new Error(`Failed to create folder: ${createResponse.statusText} - ${errorData.error?.message || 'Unknown error'}`);
  }

  const createdFolder: DriveFile = await createResponse.json();
  return createdFolder.id;
}

/**
 * Uploads a text file to Google Drive.
 * @param fileName The name of the file to create.
 * @param textContent The content of the text file.
 * @param folderId The ID of the folder where the file will be uploaded.
 * @param accessToken The Google API access token.
 * @returns The created file's metadata, including its webViewLink.
 * @throws Error if API call fails.
 */
export async function uploadTextFile(
  fileName: string,
  textContent: string,
  folderId: string,
  accessToken: string
): Promise<DriveFile> {
  const metadata = {
    name: fileName,
    mimeType: 'text/plain',
    parents: [folderId],
  };

  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const close_delim = `\r\n--${boundary}--`;

  let multipartRequestBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: text/plain; charset=UTF-8\r\n\r\n' +
    textContent +
    close_delim;

  const response = await fetch(`${DRIVE_UPLOAD_API_URL}?uploadType=multipart&fields=id,name,mimeType,webViewLink`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
      'Accept': 'application/json',
    },
    body: multipartRequestBody,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error('Google Drive API error (upload file):', errorData);
    throw new Error(`Failed to upload file: ${response.statusText} - ${errorData.error?.message || 'Unknown error'}`);
  }

  const createdFile: DriveFile = await response.json();
  return createdFile;
}

