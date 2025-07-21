import { google } from 'googleapis';
import { Readable } from 'stream';
import { OAuth2Client } from 'google-auth-library';
import fs from 'fs';
import path from 'path';

// Configuración de Google Drive con OAuth 2.0
const SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/drive.readonly'
];

// Crear cliente OAuth 2.0
function getOAuth2Client(): OAuth2Client {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('Faltan variables de entorno de OAuth 2.0');
  }

  return new OAuth2Client(clientId, clientSecret, redirectUri);
}

// Función para guardar tokens en .env.local
function persistTokensToEnv(accessToken: string, refreshToken: string) {
  const envPath = path.resolve(process.cwd(), '.env.local');
  let envContent = '';
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
  }
  // Reemplazar o agregar las variables
  envContent = envContent.replace(/GOOGLE_ACCESS_TOKEN=.*/g, '');
  envContent = envContent.replace(/GOOGLE_REFRESH_TOKEN=.*/g, '');
  envContent = envContent.trim() + `\nGOOGLE_ACCESS_TOKEN=${accessToken}\nGOOGLE_REFRESH_TOKEN=${refreshToken}\n`;
  fs.writeFileSync(envPath, envContent, 'utf8');
}

// Función para obtener tokens de acceso reales
async function getAccessToken(): Promise<string> {
  const accessToken = process.env.GOOGLE_ACCESS_TOKEN;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
  if (!accessToken && !refreshToken) {
    throw new Error('No hay token de acceso ni refresh configurado. Primero debes autenticarte con Google OAuth 2.0.');
  }
  if (refreshToken) {
    try {
      const client = getOAuth2Client();
      client.setCredentials({ refresh_token: refreshToken });
      const { credentials } = await client.refreshAccessToken();
      // Actualizar tokens en memoria
      process.env.GOOGLE_ACCESS_TOKEN = credentials.access_token!;
      if (credentials.refresh_token) {
        process.env.GOOGLE_REFRESH_TOKEN = credentials.refresh_token;
      }
      // Persistir en .env.local
      persistTokensToEnv(credentials.access_token!, credentials.refresh_token || refreshToken);
      return credentials.access_token!;
    } catch (error) {
      console.error('Error refrescando token:', error);
      // Si falla el refresh, intentar con el token actual
      if (accessToken) return accessToken;
      throw error;
    }
  }
  return accessToken;
}

// Crear cliente de autenticación con OAuth 2.0
async function getAuthClient() {
  const accessToken = await getAccessToken();
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  return auth;
}

// Función para subir archivo a Google Drive
export async function uploadToDrive(
  fileName: string,
  fileBuffer: Buffer,
  mimeType: string,
  folderId?: string
): Promise<{ fileId: string; webViewLink: string; downloadLink: string }> {
  try {
    const auth = await getAuthClient();
    const drive = google.drive({ version: 'v3', auth });

    // Crear stream de lectura del buffer
    const stream = new Readable();
    stream.push(fileBuffer);
    stream.push(null);

    // Configurar metadatos del archivo
    const fileMetadata: any = {
      name: fileName,
      parents: folderId ? [folderId] : undefined,
    };

    // Configurar el archivo
    const media = {
      mimeType: mimeType,
      body: stream,
    };

    // Subir archivo con timeout
    const response = await Promise.race([
      drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: 'id,webViewLink,webContentLink',
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout en subida de archivo')), 30000)
      )
    ]) as any;

    const fileId = response.data.id;
    const webViewLink = response.data.webViewLink;
    const downloadLink = response.data.webContentLink;

    if (!fileId) {
      throw new Error('No se pudo obtener el ID del archivo');
    }

    // Hacer el archivo público para lectura
    await drive.permissions.create({
      fileId: fileId,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
    });

    return {
      fileId: fileId,
      webViewLink: webViewLink || `https://drive.google.com/file/d/${fileId}/view`,
      downloadLink: downloadLink || `https://drive.google.com/uc?export=download&id=${fileId}`,
    };

  } catch (error) {
    console.error('Error subiendo archivo a Google Drive:', error);
    throw new Error(`Error al subir archivo: ${error instanceof Error ? error.message : 'Error desconocido'}`);
  }
}

// Función para crear carpeta en Google Drive
export async function createFolder(folderName: string, parentFolderId?: string): Promise<string> {
  try {
    const auth = await getAuthClient();
    const drive = google.drive({ version: 'v3', auth });

    const fileMetadata = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: parentFolderId ? [parentFolderId] : undefined,
    };

    const response = await drive.files.create({
      requestBody: fileMetadata,
      fields: 'id',
    });

    const folderId = response.data.id;
    if (!folderId) {
      throw new Error('No se pudo crear la carpeta');
    }

    return folderId;

  } catch (error) {
    console.error('Error creando carpeta en Google Drive:', error);
    throw new Error(`Error al crear carpeta: ${error instanceof Error ? error.message : 'Error desconocido'}`);
  }
}

// Función para obtener o crear carpeta del hotel
export async function getHotelFolder(): Promise<string> {
  try {
    const auth = await getAuthClient();
    const drive = google.drive({ version: 'v3', auth });

    // Buscar carpeta del hotel
    const response = await drive.files.list({
      q: "name='Hotel Paraíso' and mimeType='application/vnd.google-apps.folder' and trashed=false",
      fields: 'files(id, name)',
    });

    if (response.data.files && response.data.files.length > 0) {
      return response.data.files[0].id!;
    }

    // Si no existe, crear la carpeta
    return await createFolder('Hotel Paraíso');

  } catch (error) {
    console.error('Error obteniendo carpeta del hotel:', error);
    throw new Error(`Error al obtener carpeta del hotel: ${error instanceof Error ? error.message : 'Error desconocido'}`);
  }
}

// Función para obtener o crear subcarpeta
export async function getSubFolder(folderName: string, parentFolderId?: string): Promise<string> {
  try {
    const auth = await getAuthClient();
    const drive = google.drive({ version: 'v3', auth });

    const parentId = parentFolderId || await getHotelFolder();

    // Buscar subcarpeta
    const response = await drive.files.list({
      q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and '${parentId}' in parents and trashed=false`,
      fields: 'files(id, name)',
    });

    if (response.data.files && response.data.files.length > 0) {
      return response.data.files[0].id!;
    }

    // Si no existe, crear la subcarpeta
    return await createFolder(folderName, parentId);

  } catch (error) {
    console.error(`Error obteniendo subcarpeta ${folderName}:`, error);
    throw new Error(`Error al obtener subcarpeta: ${error instanceof Error ? error.message : 'Error desconocido'}`);
  }
}

// Función para eliminar archivo de Google Drive
export async function deleteFromDrive(fileId: string): Promise<void> {
  try {
    const auth = await getAuthClient();
    const drive = google.drive({ version: 'v3', auth });

    await drive.files.delete({
      fileId: fileId,
    });

  } catch (error) {
    console.error('Error eliminando archivo de Google Drive:', error);
    throw new Error(`Error al eliminar archivo: ${error instanceof Error ? error.message : 'Error desconocido'}`);
  }
}

// Función para obtener información de un archivo
export async function getFileInfo(fileId: string): Promise<{ name: string; size: string; webViewLink: string }> {
  try {
    const auth = await getAuthClient();
    const drive = google.drive({ version: 'v3', auth });

    const response = await drive.files.get({
      fileId: fileId,
      fields: 'name,size,webViewLink',
    });

    return {
      name: response.data.name || '',
      size: response.data.size || '0',
      webViewLink: response.data.webViewLink || `https://drive.google.com/file/d/${fileId}/view`,
    };

  } catch (error) {
    console.error('Error obteniendo información del archivo:', error);
    throw new Error(`Error al obtener información del archivo: ${error instanceof Error ? error.message : 'Error desconocido'}`);
  }
} 