import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { Readable } from 'stream';

// Crear cliente de autenticación con OAuth 2.0
function getAuthClient() {
  try {
    const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
    const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

    if (!clientId || !clientSecret || !refreshToken) {
      throw new Error('Faltan credenciales OAuth: GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET o GOOGLE_REFRESH_TOKEN');
    }

    const oauth2Client = new OAuth2Client(clientId, clientSecret);
    oauth2Client.setCredentials({ refresh_token: refreshToken });

    return oauth2Client;
  } catch (error) {
    console.error('Error configurando autenticación OAuth:', error);
    throw error;
  }
}

// Función para subir archivo a Google Drive
export async function uploadToDrive(
  fileName: string,
  fileBuffer: Buffer,
  mimeType: string,
  folderId?: string
): Promise<{ fileId: string; webViewLink: string; downloadLink: string }> {
  console.log('☁️ INICIO - Subida a Google Drive');
  console.log('📁 Datos del archivo:', {
    fileName,
    mimeType,
    size: fileBuffer.length,
    folderId
  });

  try {
    console.log('🔐 Obteniendo autenticación OAuth...');
    const auth = getAuthClient();
    const drive = google.drive({ version: 'v3', auth });
    console.log('✅ Autenticación OAuth exitosa');

    // Crear stream de lectura del buffer
    const stream = new Readable();
    stream.push(fileBuffer);
    stream.push(null);

    // Configurar metadatos del archivo
    const fileMetadata: any = {
      name: fileName,
      parents: folderId ? [folderId] : undefined,
    };

    console.log('🔄 Configurando metadatos del archivo...');
    console.log('📋 Metadatos:', fileMetadata);

    // Configurar el archivo
    const media = {
      mimeType: mimeType,
      body: stream,
    };

    // Subir archivo con timeout
    console.log('⬆️ Iniciando subida a Google Drive...');
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
    try {
      await drive.permissions.create({
        fileId: fileId,
        requestBody: {
          role: 'reader',
          type: 'anyone',
        },
      });
    } catch (permError) {
      console.warn('No se pudo hacer público el archivo, pero se subió correctamente:', permError);
    }

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
    const auth = getAuthClient();
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
    const auth = getAuthClient();
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
    const auth = getAuthClient();
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
    const auth = getAuthClient();
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
    const auth = getAuthClient();
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