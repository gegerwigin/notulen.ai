import React from 'react';
import { Link } from 'react-router-dom';
import { FileText, Clock, Mic } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebase';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';

const MoMList = () => {
  const [transcripts, setTranscripts] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const { currentUser } = useAuth();

  React.useEffect(() => {
    const fetchTranscripts = async () => {
      if (!currentUser) return;
      
      try {
        const q = query(
          collection(db, 'transcriptions'),
          where('userId', '==', currentUser.uid),
          orderBy('createdAt', 'desc')
        );
        
        const querySnapshot = await getDocs(q);
        const transcriptData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setTranscripts(transcriptData);
      } catch (error) {
        console.error('Error fetching transcripts:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTranscripts();
  }, [currentUser]);

  const formatDate = (date: any) => {
    if (!date) return '';
    const d = date.toDate();
    return new Intl.DateTimeFormat('id', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(d);
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Minutes of Meetings</h1>
        <Link
          to="/dashboard/manual-recording"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Mic className="h-5 w-5 mr-2" />
          Rekam Manual
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <p className="mt-2 text-gray-600">Loading transcripts...</p>
        </div>
      ) : transcripts.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow-sm">
          <FileText className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-lg font-medium text-gray-900">No transcripts yet</h3>
          <p className="mt-1 text-gray-500">Start by recording your first meeting</p>
        </div>
      ) : (
        <div className="bg-white shadow-sm rounded-lg divide-y divide-gray-200">
          {transcripts.map((transcript) => (
            <div key={transcript.id} className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-start">
                  <FileText className="h-5 w-5 text-gray-400 mt-1" />
                  <div className="ml-3">
                    <Link
                      to={`/view-transcript/${transcript.id}`}
                      className="text-lg font-medium text-gray-900 hover:text-indigo-600"
                    >
                      {transcript.title}
                    </Link>
                    <div className="flex items-center mt-1 text-sm text-gray-500">
                      <Clock className="h-4 w-4 mr-1" />
                      <span>{formatDuration(transcript.duration)}</span>
                      <span className="mx-2">•</span>
                      <span>{formatDate(transcript.createdAt)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center">
                  <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-indigo-100 text-indigo-800">
                    MoM
                  </span>
                  <span className="ml-2 text-sm text-gray-500">
                    {formatDuration(transcript.duration)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MoMList;
