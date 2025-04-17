import { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { generateMeetingSummary } from '../services/deepseekAPI';
import { Loader, BrainCircuit, Check } from 'lucide-react';

interface AISummaryGeneratorProps {
  transcriptId: string;
  transcriptText: string;
  title: string;
  onSummaryGenerated: (summary: any) => void;
  isGenerating?: boolean;
  setIsGenerating?: (isGenerating: boolean) => void;
  error?: string;
  setError?: (error: string) => void;
}

export default function AISummaryGenerator({ 
  transcriptId, 
  transcriptText, 
  title,
  onSummaryGenerated,
  isGenerating: externalIsGenerating,
  setIsGenerating: externalSetIsGenerating,
  error: externalError,
  setError: externalSetError
}: AISummaryGeneratorProps) {
  // Use external state if provided, otherwise use internal state
  const [internalIsGenerating, setInternalIsGenerating] = useState(false);
  const [isGenerated, setIsGenerated] = useState(false);
  const [internalError, setInternalError] = useState('');
  const [progress, setProgress] = useState(0);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 2;
  
  // Use external state if provided, otherwise use internal state
  const isGenerating = externalIsGenerating !== undefined ? externalIsGenerating : internalIsGenerating;
  const setIsGenerating = externalSetIsGenerating || setInternalIsGenerating;
  const error = externalError !== undefined ? externalError : internalError;
  const setError = externalSetError || setInternalError;

  const generateAISummary = async () => {
    if (!transcriptText || transcriptText.trim().length < 20) {
      setError('Transkrip terlalu pendek untuk menghasilkan ringkasan yang berarti.');
      return;
    }

    let progressInterval: NodeJS.Timeout | null = null;

    try {
      setIsGenerating(true);
      setError('');
      setProgress(10);
      console.log('Generating AI summary for transcript ID:', transcriptId);
      
      // Start a mock progress indicator
      progressInterval = setInterval(() => {
        setProgress(prev => {
          const newProgress = prev + Math.floor(Math.random() * 10);
          return newProgress < 90 ? newProgress : prev;
        });
      }, 1000);
      
      // Call Deepseek API to generate summary
      const summary = await generateMeetingSummary(transcriptText, title);
      
      // Clear progress interval and set to 100%
      if (progressInterval) {
        clearInterval(progressInterval);
      }
      setProgress(100);
      
      console.log('Summary generated, updating Firestore document');
      
      // Save the summary to Firestore
      const docRef = doc(db, 'transcriptions', transcriptId);
      await updateDoc(docRef, {
        summary: summary,
        // Update the title with the AI-generated semantic title if available
        title: summary.meetingInfo?.title || title
      });
      
      console.log('Summary saved to Firestore successfully');
      setIsGenerated(true);
      onSummaryGenerated(summary);
    } catch (err: any) {
      console.error('Error generating or saving summary:', err);

      // Clear interval if it exists
      if (progressInterval) {
        clearInterval(progressInterval);
      }

      if (retryCount < maxRetries) {
        // Auto-retry if not exceeded max retries
        setRetryCount(prev => prev + 1);
        console.log(`Retry attempt ${retryCount + 1} of ${maxRetries}`);
        setTimeout(() => generateAISummary(), 2000); // Retry after 2 seconds
        return;
      }
      
      // Customize error message based on error type
      if (err.message.includes('timeout') || err.name === 'AbortError') {
        setError('Waktu pembuatan ringkasan habis. Server mungkin sibuk, silakan coba lagi nanti.');
      } else if (err.message.includes('Authentication')) {
        setError('Masalah otentikasi dengan layanan AI. Harap hubungi dukungan teknis.');
      } else if (transcriptText.length < 50) {
        setError('Transkrip terlalu pendek untuk menghasilkan ringkasan bermakna. Mohon rekam lebih lama.');
      } else {
        setError(`Gagal membuat ringkasan: ${err.message || 'Kesalahan tidak diketahui'}`);
      }
    } finally {
      // Make sure the interval is cleared
      if (progressInterval) {
        clearInterval(progressInterval);
      }
      setIsGenerating(false);
    }
  };

  return (
    <div className="mb-6">
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-800 rounded-md text-base">
          {error}
        </div>
      )}

      {isGenerated ? (
        <div className="flex items-center bg-green-100 text-green-800 p-3 rounded-md border border-green-200 mb-4">
          <Check className="h-5 w-5 mr-2" />
          <span className="font-semibold">Ringkasan AI berhasil dibuat!</span>
        </div>
      ) : (
        <div>
          {isGenerating && (
            <div className="mb-4">
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium text-indigo-700">Menghasilkan ringkasan...</span>
                <span className="text-sm font-medium text-indigo-700">{progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div 
                  className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300 ease-in-out" 
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
          )}
          
          <button
            onClick={generateAISummary}
            disabled={isGenerating || !transcriptText}
            className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-md shadow-sm text-base font-semibold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <Loader className="h-5 w-5 mr-2 animate-spin" />
                Membuat Ringkasan dengan Deepseek AI...
              </>
            ) : (
              <>
                <BrainCircuit className="h-5 w-5 mr-2" />
                {retryCount > 0 ? 'Coba Lagi Buat Ringkasan' : 'Buat Ringkasan dengan Deepseek AI'}
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
