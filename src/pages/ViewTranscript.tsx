import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import Navbar from '../components/Navbar';
import AISummaryGenerator from '../components/AISummaryGenerator';
import MeetingSummary from '../components/MeetingSummary';
import { ArrowLeft, CircleAlert, Clock, FileText, Pencil } from 'lucide-react';

export default function ViewTranscript() {
  const [transcript, setTranscript] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState<any>(null);
  
  const { transcriptId } = useParams<{ transcriptId: string }>();
  const { currentUser } = useAuth();
  
  useEffect(() => {
    async function fetchTranscript() {
      if (!transcriptId || !currentUser) return;
      
      try {
        setError('');
        console.log('Fetching transcript with ID:', transcriptId);
        
        const docRef = doc(db, 'transcriptions', transcriptId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          console.log('Transcript data found:', data);
          
          // Verify the transcript belongs to the current user
          if (data.userId !== currentUser.uid) {
            setError('You do not have permission to view this transcript');
            setLoading(false);
            return;
          }
          
          setTranscript({
            id: docSnap.id,
            ...data
          });
          
          if (data.summary) {
            setSummary(data.summary);
          }
        } else {
          console.log('No transcript found with ID:', transcriptId);
          setError('Transcript not found');
        }
      } catch (err: any) {
        console.error('Error fetching transcript:', err);
        setError(`Failed to load transcript: ${err.message}`);
      } finally {
        setLoading(false);
      }
    }
    
    fetchTranscript();
  }, [transcriptId, currentUser]);
  
  async function handleSummaryGenerated(newSummary: any) {
    setSummary(newSummary);
    
    // Also update the transcript object to include the summary
    if (transcript) {
      setTranscript({
        ...transcript,
        summary: newSummary
      });
    }
  }
  
  function formatDate(date: Date) {
    return new Intl.DateTimeFormat('id', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }
  
  function formatDuration(seconds: number) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-700 font-medium">Memuat transkrip...</p>
          </div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md">
            <div className="flex items-start">
              <CircleAlert className="h-5 w-5 mr-2 mt-0.5" />
              <div>
                <p className="font-medium">{error}</p>
                <Link to="/dashboard" className="inline-block mt-4 text-blue-600 hover:underline">
                  Kembali ke Dashboard
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  if (!transcript) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <p className="text-gray-700 font-medium">Transkrip tidak ditemukan</p>
            <Link to="/dashboard" className="inline-block mt-4 text-blue-600 hover:underline">
              Kembali ke Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      
      <div className="py-10 flex-grow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-6">
            <Link
              to="/dashboard"
              className="inline-flex items-center text-blue-600 hover:text-blue-800 font-semibold"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Kembali ke Dashboard
            </Link>
          </div>
          
          <div className="bg-white shadow-md overflow-hidden sm:rounded-lg mb-6">
            <div className="px-4 py-5 sm:px-6 bg-gray-50 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-900 tracking-tight">{transcript.title}</h2>
                
                <div className="flex space-x-4">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                    <Clock className="h-4 w-4 mr-1" />
                    {formatDuration(transcript.duration)}
                  </span>
                </div>
              </div>
              <p className="mt-1 text-sm text-gray-600">
                Dibuat pada {transcript.createdAt?.toDate ? formatDate(transcript.createdAt.toDate()) : 'Unknown date'}
              </p>
            </div>
            
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <FileText className="h-5 w-5 mr-2 text-blue-600" />
                Isi Transkrip
              </h3>
              <div className="bg-gray-50 p-4 rounded-md border border-gray-200 mb-4 relative">
                <p className="text-gray-800 whitespace-pre-wrap font-medium">
                  {transcript.content}
                </p>
              </div>
            </div>
          </div>
          
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <Pencil className="h-5 w-5 mr-2 text-indigo-600" />
              Ringkasan Rapat (Minutes of Meeting)
            </h3>
            
            {!summary && (
              <AISummaryGenerator 
                transcriptId={transcript.id} 
                transcriptText={transcript.content}
                title={transcript.title}
                onSummaryGenerated={handleSummaryGenerated}
              />
            )}
            
            <MeetingSummary summaryData={summary} />
          </div>
        </div>
      </div>
    </div>
  );
}
