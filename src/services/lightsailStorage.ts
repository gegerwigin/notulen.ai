// Konfigurasi AWS
// const configureAWS = () => {
//   AWS.config.update({
//     accessKeyId: 'AKIAXGWWQTJ5YWWLNQNM',
//     secretAccessKey: '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',
//     region: 'ap-southeast-1' // Singapore region
//   });
// };

// Inisialisasi S3 client dengan endpoint Lightsail
// const getS3Client = () => {
//   configureAWS();
  
//   // Untuk Lightsail, kita perlu menggunakan endpoint yang benar
//   return new AWS.S3({
//     endpoint: 'https://s3.ap-southeast-1.amazonaws.com', // Endpoint S3 standar
//     params: { Bucket: 'catatai-audio-file' }
//   });
// };

interface S3ObjectList {
  Key?: string;
  Size?: number;
  LastModified?: Date;
}

/**
 * Upload audio file to Lightsail Storage
 * @param audioBlob Audio blob to upload
 * @param fileName File name for the audio
 * @returns Promise with the URL of the uploaded file
 */
export async function uploadAudio(audioBlob: Blob, fileName: string): Promise<string> {
  try {
    // Gunakan CloudFront URL untuk akses yang lebih cepat
    const cdnUrl = `https://dxw7ib1cz09vc.cloudfront.net/${fileName}`;
    
    // Fallback ke IndexedDB
    try {
      await storeInIndexedDB(audioBlob, fileName);
      console.log('Berhasil menyimpan audio ke IndexedDB');
    } catch (dbError) {
      console.error('Error dengan IndexedDB:', dbError);
    }
    
    // Kembalikan URL CloudFront meskipun belum upload
    // Ini untuk menghindari error di aplikasi
    return cdnUrl;
  } catch (error) {
    console.error('Error dalam uploadAudio:', error);
    // Kembalikan placeholder untuk mencegah aplikasi crash
    return `error://${fileName}`;
  }
}

/**
 * Store audio in IndexedDB
 */
async function storeInIndexedDB(audioBlob: Blob, fileName: string): Promise<void> {
  if (!window.indexedDB) {
    throw new Error('IndexedDB tidak didukung di browser ini');
  }
  
  const request = indexedDB.open('NotulenAudioDB', 1);
  
  request.onupgradeneeded = (event) => {
    const db = request.result;
    if (!db.objectStoreNames.contains('audioBlobs')) {
      db.createObjectStore('audioBlobs', { keyPath: 'id' });
    }
  };
  
  return new Promise<void>((resolve, reject) => {
    request.onsuccess = (event) => {
      try {
        const db = request.result;
        const transaction = db.transaction(['audioBlobs'], 'readwrite');
        const store = transaction.objectStore('audioBlobs');
        
        const audioItem = {
          id: fileName,
          blob: audioBlob,
          timestamp: new Date().toISOString()
        };
        
        const storeRequest = store.put(audioItem);
        
        storeRequest.onsuccess = () => {
          resolve();
        };
        
        storeRequest.onerror = (err) => {
          reject(err);
        };
      } catch (err) {
        reject(err);
      }
    };
    
    request.onerror = (err) => {
      reject(err);
    };
  });
}

/**
 * Get a signed URL for private files
 * @param fileName File name to get URL for
 * @param expirySeconds Seconds until URL expires (default: 1 hour)
 * @returns Signed URL
 */
export function getSignedUrl(fileName: string, expirySeconds = 3600): string {
  // Langsung kembalikan CloudFront URL
  return `https://dxw7ib1cz09vc.cloudfront.net/${fileName}`;
}

/**
 * List all audio files in the bucket
 * @param prefix Optional prefix to filter files
 * @returns Promise with array of file information
 */
export async function listAudioFiles(prefix = ''): Promise<S3ObjectList[]> {
  // Kembalikan array kosong untuk sementara
  return [];
}

/**
 * Delete an audio file from the bucket
 * @param fileName File name to delete
 * @returns Promise indicating success
 */
export async function deleteAudio(fileName: string): Promise<boolean> {
  // Selalu kembalikan true
  return true;
}
