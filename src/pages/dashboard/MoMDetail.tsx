import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
// Temporarely comment out the imports that cause TypeScript errors
// until we can implement these components
// import DashboardShell from '../../components/DashboardShell';
// import AudioPlayer from '../../components/AudioPlayer';
// import TranscriptionText from '../../components/TranscriptionText'; 
import MeetingSummary from '../../components/MeetingSummary';
import AISummaryGenerator from '../../components/AISummaryGenerator';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { SummaryData } from '../../types';

// Define the Transcription interface locally since it's not exported from types.ts
interface Transcription {
  id: string;
  title?: string;
  text: string;
  audioUrl?: string;
  createdAt?: { seconds: number; nanoseconds: number };
  duration?: number;
  summary?: SummaryData;
  userId: string;
}

// Create simple wrapper components until we implement the real ones
const DashboardShell: React.FC<{children: React.ReactNode}> = ({children}) => (
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</div>
);

const AudioPlayer: React.FC<{src: string}> = ({src}) => (
  <div className="bg-gray-100 p-4 rounded-md">
    <audio src={src} controls className="w-full"></audio>
  </div>
);

const TranscriptionText: React.FC<{text: string}> = ({text}) => (
  <div className="bg-white border border-gray-200 p-4 rounded-md">
    <p className="whitespace-pre-line">{text}</p>
  </div>
);

export default function MoMDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [transcription, setTranscription] = useState<Transcription | null>(null);
  const [error, setError] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const fetchTranscription = async () => {
      if (!id) {
        setError('No transcription ID provided');
        setLoading(false);
        return;
      }

      try {
        const docRef = doc(db, 'transcriptions', id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          console.log("Retrieved transcription data:", data);
          setTranscription({
            id: docSnap.id,
            ...data
          } as Transcription);
        } else {
          setError('Transcription not found');
        }
      } catch (err: any) {
        console.error('Error fetching transcription:', err);
        setError(`Failed to load transcription: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchTranscription();
  }, [id]);

  const handleSummaryGenerated = (summary: SummaryData) => {
    console.log("Summary generated:", summary);
    setTranscription((prev: Transcription | null) => {
      if (!prev) return null;
      return {
        ...prev,
        summary
      };
    });
  };

  if (loading) {
    return (
      <DashboardShell>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <span className="ml-3 text-gray-600">Loading...</span>
        </div>
      </DashboardShell>
    );
  }

  if (error) {
    return (
      <DashboardShell>
        <div className="bg-red-50 border border-red-200 p-4 rounded-md">
          <h2 className="text-red-800 text-lg font-medium">Error</h2>
          <p className="text-red-700 mt-1">{error}</p>
          <button
            onClick={() => navigate(-1)}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 inline-flex items-center"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go back
          </button>
        </div>
      </DashboardShell>
    );
  }
  
  if (!transcription) {
    return (
      <DashboardShell>
        <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-md">
          <h2 className="text-yellow-800 text-lg font-medium">Not Found</h2>
          <p className="text-yellow-700 mt-1">The requested transcription could not be found.</p>
          <button
            onClick={() => navigate(-1)}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 inline-flex items-center"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go back
          </button>
        </div>
      </DashboardShell>
    );
  }
  
  // Check if summary exists and is a valid object
  const hasSummary = transcription.summary && 
                     typeof transcription.summary === 'object' && 
                     Object.keys(transcription.summary).length > 0;
  
  console.log("Has summary:", hasSummary, "Summary:", transcription.summary);

  return (
    <DashboardShell>
      <div className="mb-6">
        <button
          onClick={() => navigate(-1)}
          className="mb-4 inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-800"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back
        </button>
        <h1 className="text-2xl font-bold text-gray-900">{transcription.title || 'Untitled Transcription'}</h1>
        <p className="text-sm text-gray-600 mt-1">
          {transcription.createdAt && new Date(transcription.createdAt.seconds * 1000).toLocaleString()}
          {transcription.duration && ` • ${Math.round(transcription.duration / 60)} mins`}
        </p>
      </div>
      
      {transcription.audioUrl && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2 text-gray-900">Audio Recording</h2>
          <AudioPlayer src={transcription.audioUrl} />
        </div>
      )}
      
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-2 text-gray-900">Transcription</h2>
        <TranscriptionText text={transcription.text} />
      </div>
      
      {!hasSummary && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-2 text-gray-900">AI Summary</h2>
          <AISummaryGenerator 
            transcriptId={transcription.id}
            transcriptText={transcription.text}
            title={transcription.title || 'Untitled'} 
            onSummaryGenerated={handleSummaryGenerated}
            isGenerating={isGenerating}
            setIsGenerating={setIsGenerating}
            error={errorMessage}
            setError={setErrorMessage}
          />
        </div>
      )}
      
      {hasSummary && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-2 text-gray-900">Meeting Summary</h2>
          <MeetingSummary summary={transcription.summary} />
        </div>
      )}
    </DashboardShell>
  );
}
