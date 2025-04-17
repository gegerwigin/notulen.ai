import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import { Loader2, FileText, Clock, Globe, Search, Filter, Download, Share2, Folder, Tag, Grid, List, Trash2, Play, Pause, Mic } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getSignedUrl } from '../../services/lightsailStorage';

interface Transcription {
  id: string;
  title: string;
  content: string;
  createdAt: any;
  duration: number;
  language: string;
  type: string;
  status: string;
  audioUrl?: string;
  lightsailKey?: string;
  summary?: {
    topics: Array<{title: string, points: string[]}>;
    actionItems: Array<{task: string, assignee: string, deadline: string, status: string}>;
    meetingInfo?: any;
    summary?: string;
    participants?: any[];
  };
  tags: string[];
  folder: string;
}

const formatDuration = (seconds: number): string => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const Transcriptions = () => {
  const { currentUser } = useAuth();
  const [transcriptions, setTranscriptions] = useState<Transcription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  // Get unique folders and tags
  const folders = [...new Set(transcriptions.map(t => t.folder).filter(Boolean))];
  const allTags = [...new Set(transcriptions.flatMap(t => t.tags || []))];

  useEffect(() => {
    const fetchTranscriptions = async () => {
      try {
        if (!currentUser) return;

        const transcriptionsQuery = query(
          collection(db, 'transcriptions'),
          where('userId', '==', currentUser.uid),
          orderBy('createdAt', 'desc')
        );

        const querySnapshot = await getDocs(transcriptionsQuery);
        const transcriptionsData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          tags: doc.data().tags || [],
          folder: doc.data().folder || 'Uncategorized'
        })) as Transcription[];

        setTranscriptions(transcriptionsData);
      } catch (err) {
        console.error('Error fetching transcriptions:', err);
        setError('Failed to load transcriptions');
      } finally {
        setLoading(false);
      }
    };

    fetchTranscriptions();
  }, [currentUser]);

  const deleteTranscription = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (window.confirm('Are you sure you want to delete this transcription? This action cannot be undone.')) {
      try {
        setIsDeleting(id);
        await deleteDoc(doc(db, 'transcriptions', id));
        setTranscriptions(prev => prev.filter(t => t.id !== id));
      } catch (error) {
        console.error('Error deleting transcription:', error);
        alert('Failed to delete transcription. Please try again.');
      } finally {
        setIsDeleting(null);
      }
    }
  };

  const filteredTranscriptions = transcriptions.filter(t => {
    const matchesSearch = searchQuery === '' || 
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.content.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFolder = !selectedFolder || t.folder === selectedFolder;
    
    const matchesTags = selectedTags.length === 0 || 
      selectedTags.every(tag => t.tags.includes(tag));

    return matchesSearch && matchesFolder && matchesTags;
  });

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 text-red-600 p-4 rounded-lg">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Your Transcriptions</h1>
        <div className="flex items-center gap-4">
          <Link
            to="/dashboard/manual-recording"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Mic className="h-5 w-5 mr-2" />
            Rekam Manual
          </Link>
          <Link
            to="/dashboard/record"
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Auto Recording
          </Link>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm space-y-4">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex-1 min-w-[300px] relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search transcriptions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                showFilters ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Filter className="w-5 h-5" />
              Filter
            </button>
            <button className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">
              <Download className="w-5 h-5" />
              Export
            </button>
            <button className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">
              <Share2 className="w-5 h-5" />
              Share
            </button>
            <div className="border-l pl-4 flex items-center gap-2">
              <button 
                onClick={() => setView('grid')}
                className={`p-2 rounded ${view === 'grid' ? 'bg-gray-100' : 'hover:bg-gray-100'}`}
              >
                <Grid className="w-5 h-5" />
              </button>
              <button 
                onClick={() => setView('list')}
                className={`p-2 rounded ${view === 'list' ? 'bg-gray-100' : 'hover:bg-gray-100'}`}
              >
                <List className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="pt-4 border-t space-y-4">
            {/* Folders */}
            <div>
              <h3 className="font-medium text-gray-700 mb-2">Folders</h3>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedFolder(null)}
                  className={`px-3 py-1 rounded-full text-sm ${
                    !selectedFolder 
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  All
                </button>
                {folders.map((folder) => (
                  <button
                    key={folder}
                    onClick={() => setSelectedFolder(folder)}
                    className={`px-3 py-1 rounded-full text-sm ${
                      selectedFolder === folder
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {folder}
                  </button>
                ))}
              </div>
            </div>

            {/* Tags */}
            <div>
              <h3 className="font-medium text-gray-700 mb-2">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {allTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm ${
                      selectedTags.includes(tag)
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <Tag className="w-3 h-3" />
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {transcriptions.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No transcriptions yet</h3>
          <p className="text-gray-500">Start by recording your first meeting</p>
        </div>
      ) : (
        <div className={view === 'grid' ? 'grid gap-6 md:grid-cols-2 lg:grid-cols-3' : 'space-y-4'}>
          {filteredTranscriptions.map((transcription) => (
            <div key={transcription.id} className="relative group">
              <Link
                to={transcription.status === 'completed' || transcription.summary ? `/dashboard/transcriptions/${transcription.id}` : '#'}
                className={`block p-6 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow ${
                  transcription.status !== 'completed' && !transcription.summary ? 'cursor-not-allowed opacity-70' : ''
                } ${view === 'list' ? 'flex gap-6' : ''}`}
              >
                <div className={`space-y-4 ${view === 'list' ? 'flex-1' : ''}`}>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1">
                      <h3 className="font-medium text-gray-900 line-clamp-2 break-words">
                        {transcription.title}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {(() => {
                          // Handle both Firestore timestamp and ISO string formats
                          let date;
                          try {
                            // Try to use toDate() for Firestore timestamp
                            if (transcription.createdAt?.toDate) {
                              date = new Date(transcription.createdAt.toDate());
                            } 
                            // Handle ISO string format
                            else if (typeof transcription.createdAt === 'string') {
                              date = new Date(transcription.createdAt);
                            }
                            // Fallback to current date if createdAt is missing or invalid
                            else {
                              date = new Date();
                            }
                            return date.toLocaleString('id-ID');
                          } catch (error) {
                            console.error('Error formatting date:', error);
                            return 'Invalid date';
                          }
                        })()}
                      </p>
                    </div>
                    <div className={`px-2 py-1 rounded text-sm ${
                      transcription.summary ? 'bg-green-100 text-green-700' :
                      transcription.status === 'completed' 
                        ? 'bg-green-100 text-green-700'
                        : transcription.status === 'error'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {transcription.summary ? 'Completed' :
                       transcription.status === 'completed' ? 'Completed' : 
                       transcription.status === 'error' ? 'Error' : 'Processing'}
                    </div>
                  </div>

                  {/* Audio Player (if available) */}
                  {transcription.lightsailKey && (
                    <div className="mt-2">
                      <audio 
                        controls 
                        className="w-full" 
                        src={transcription.audioUrl || `https://dxw7ib1cz09vc.cloudfront.net/${transcription.lightsailKey}`}
                        onError={(e) => {
                          // If direct URL fails, try to get a signed URL
                          if (transcription.lightsailKey) {
                            const signedUrl = getSignedUrl(transcription.lightsailKey);
                            (e.target as HTMLAudioElement).src = signedUrl;
                          }
                        }}
                      >
                        Your browser does not support the audio element.
                      </audio>
                    </div>
                  )}

                  {/* Metadata */}
                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4 flex-shrink-0" />
                      <span>{formatDuration(transcription.duration || 0)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Globe className="w-4 h-4 flex-shrink-0" />
                      <span>
                        {transcription.language 
                          ? transcription.language.split('-')[0].toUpperCase() 
                          : 'N/A'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Folder className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate max-w-[120px]">{transcription.folder || 'Uncategorized'}</span>
                    </div>
                  </div>

                  {/* Tags */}
                  {transcription.tags && transcription.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {transcription.tags.map((tag, index) => (
                        <span key={index} className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-sm truncate max-w-[150px]">
                          <Tag className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">{tag}</span>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Topics */}
                  {transcription.summary?.topics && transcription.summary.topics.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {transcription.summary.topics.slice(0, 3).map((topic, index) => (
                        <span key={index} className="px-2 py-1 bg-blue-50 text-blue-600 rounded-full text-sm truncate max-w-[150px]">
                          {typeof topic === 'string' ? topic : topic.title}
                        </span>
                      ))}
                      {transcription.summary.topics.length > 3 && (
                        <span className="px-2 py-1 bg-gray-50 text-gray-600 rounded-full text-sm">
                          +{transcription.summary.topics.length - 3} more
                        </span>
                      )}
                    </div>
                  )}

                  {/* Action Items */}
                  {transcription.summary?.actionItems && transcription.summary.actionItems.length > 0 && (
                    <div className="mt-2 text-sm text-gray-600">
                      <p className="font-medium">Action Items:</p>
                      <ul className="list-disc list-inside">
                        {transcription.summary.actionItems.slice(0, 2).map((item, index) => (
                          <li key={index} className="truncate max-w-full overflow-hidden text-ellipsis break-words">
                            <span className="line-clamp-1">{typeof item === 'string' ? item : item.task}</span>
                          </li>
                        ))}
                        {transcription.summary.actionItems.length > 2 && (
                          <li className="text-gray-500">+{transcription.summary.actionItems.length - 2} more items</li>
                        )}
                      </ul>
                    </div>
                  )}

                  {transcription.status === 'processing' && (
                    <div className="flex items-center gap-2 text-sm text-blue-600">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Generating meeting minutes...</span>
                    </div>
                  )}
                </div>
              </Link>
              <button
                onClick={(e) => deleteTranscription(transcription.id, e)}
                disabled={isDeleting === transcription.id}
                className="absolute top-3 right-3 p-2 bg-white rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 text-gray-500 hover:text-red-600"
                title="Delete transcription"
              >
                {isDeleting === transcription.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Transcriptions;
