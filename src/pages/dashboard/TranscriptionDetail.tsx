import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import { Loader2, ArrowLeft, Clock, Globe, Download, Share2, Copy, Check } from 'lucide-react';
import MeetingSummaryDisplay from '../../components/MeetingSummaryDisplay';

interface TranscriptionData {
  id: string;
  title: string;
  text: string;
  createdAt: any;
  duration: number;
  language: string;
  audioUrl?: string;
  lightsailKey?: string;
  summary?: any;
  userId: string;
}

const formatDuration = (seconds: number): string => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

export default function TranscriptionDetail() {
  const { id } = useParams<{ id: string }>();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [transcription, setTranscription] = useState<TranscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'transcript' | 'summary'>('summary');
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchTranscription = async () => {
      if (!currentUser || !id) {
        navigate('/dashboard');
        return;
      }

      try {
        const transcriptionRef = doc(db, 'transcriptions', id);
        const transcriptionDoc = await getDoc(transcriptionRef);
        
        if (!transcriptionDoc.exists()) {
          setError('Transcription not found');
          setLoading(false);
          return;
        }
        
        const data = transcriptionDoc.data() as TranscriptionData;
        
        // Verify ownership
        if (data.userId !== currentUser.uid) {
          setError('You do not have permission to view this transcription');
          setLoading(false);
          return;
        }
        
        setTranscription({
          ...data,
          id: transcriptionDoc.id
        });
      } catch (err) {
        console.error('Error fetching transcription:', err);
        setError('Failed to load transcription');
      } finally {
        setLoading(false);
      }
    };

    fetchTranscription();
  }, [id, currentUser, navigate]);

  // Handle export functionality
  const handleExportAsTxt = () => {
    if (!transcription) return;
    
    const content = activeTab === 'summary' 
      ? formatSummaryForExport(transcription.summary)
      : transcription.text;
    
    const filename = `${transcription.title || 'transcription'}.txt`;
    const blob = new Blob([content], { type: 'text/plain' });
    downloadBlob(blob, filename);
    setShowExportMenu(false);
  };

  const handleExportAsDocx = () => {
    if (!transcription) return;
    
    const content = activeTab === 'summary' 
      ? formatSummaryForExport(transcription.summary)
      : transcription.text;
    
    const htmlContent = `<!DOCTYPE html>
      <html>
        <head>
          <title>${transcription.title || 'Transcription'}</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; }
            h1 { font-size: 18pt; }
            .metadata { color: #666; margin-bottom: 20px; }
            .content { white-space: pre-line; }
          </style>
        </head>
        <body>
          <h1>${transcription.title || 'Transcription'}</h1>
          <div class="metadata">
            <div>Duration: ${formatDuration(transcription.duration || 0)}</div>
            <div>Date: ${formatDate(transcription.createdAt)}</div>
          </div>
          <div class="content">${content.replace(/\n/g, '<br>')}</div>
        </body>
      </html>`;
    
    const blob = new Blob([htmlContent], { type: 'text/html' });
    downloadBlob(blob, `${transcription.title || 'transcription'}.html`);
    setShowExportMenu(false);
  };
  
  // Helper for downloads
  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  // Format summary data for export
  const formatSummaryForExport = (summaryData: any): string => {
    if (!summaryData) return 'No summary available';
    
    let formatted = '';
    
    if (summaryData.meetingInfo?.title) {
      formatted += `# ${summaryData.meetingInfo.title}\n\n`;
    } else {
      formatted += `# ${transcription?.title || 'Meeting Summary'}\n\n`;
    }
    
    if (summaryData.meetingInfo) {
      const { date, duration, location } = summaryData.meetingInfo;
      formatted += 'Meeting Details:\n';
      if (date) formatted += `Date: ${date}\n`;
      if (duration) formatted += `Duration: ${duration}\n`;
      if (location) formatted += `Location: ${location}\n`;
      formatted += '\n';
    }
    
    if (summaryData.summary) {
      formatted += `## Summary\n${summaryData.summary}\n\n`;
    }
    
    if (Array.isArray(summaryData.topics) && summaryData.topics.length > 0) {
      formatted += '## Topics Discussed\n';
      summaryData.topics.forEach((topic: any) => {
        if (typeof topic === 'string') {
          formatted += `- ${topic}\n`;
        } else if (topic.title) {
          formatted += `- ${topic.title}\n`;
          if (Array.isArray(topic.points) && topic.points.length > 0) {
            topic.points.forEach((point: string) => {
              formatted += `  - ${point}\n`;
            });
          }
        }
      });
      formatted += '\n';
    }
    
    if (Array.isArray(summaryData.actionItems) && summaryData.actionItems.length > 0) {
      formatted += '## Action Items\n';
      summaryData.actionItems.forEach((item: any) => {
        if (typeof item === 'string') {
          formatted += `- ${item}\n`;
        } else if (item.task) {
          let actionItem = `- ${item.task}`;
          if (item.assignee) actionItem += ` (Assigned to: ${item.assignee})`;
          if (item.deadline) actionItem += ` (Due: ${item.deadline})`;
          formatted += `${actionItem}\n`;
        }
      });
      formatted += '\n';
    }
    
    return formatted;
  };
  
  // Format date helper
  const formatDate = (dateInput: any) => {
    try {
      const date = dateInput?.toDate 
        ? dateInput.toDate() 
        : new Date(dateInput);
      return date.toLocaleString('id-ID');
    } catch (e) {
      return 'Unknown date';
    }
  };
  
  // Handle sharing
  const handleShareViaEmail = () => {
    if (!transcription) return;
    
    const subject = encodeURIComponent(transcription.title || 'Shared Transcription from Notula.ai');
    const body = encodeURIComponent(
      `I'm sharing a transcription from Notula.ai with you.\n\n` +
      `Title: ${transcription.title || 'Untitled'}\n` +
      `Date: ${formatDate(transcription.createdAt)}\n\n` +
      `You can view it by creating an account at Notula.ai`
    );
    
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
    setShowShareMenu(false);
  };
  
  const handleShareViaWhatsApp = () => {
    if (!transcription) return;
    
    const text = encodeURIComponent(
      `*Shared Transcription from Notula.ai*\n\n` +
      `Title: ${transcription.title || 'Untitled'}\n` +
      `Date: ${formatDate(transcription.createdAt)}\n\n` +
      `You can view it by creating an account at Notula.ai`
    );
    
    window.open(`https://wa.me/?text=${text}`, '_blank');
    setShowShareMenu(false);
  };

  // Handle copy to clipboard
  const handleCopyToClipboard = async () => {
    if (!transcription) return;
    
    const content = activeTab === 'summary' 
      ? formatSummaryForExport(transcription.summary)
      : transcription.text;
    
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
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
        <Link to="/dashboard/transcriptions" className="mt-4 inline-flex items-center text-blue-600 hover:underline">
          <ArrowLeft className="w-4 h-4 mr-1" />
          Return to transcriptions
        </Link>
      </div>
    );
  }

  if (!transcription) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-yellow-50 text-yellow-600 p-4 rounded-lg">
          Transcription not found
        </div>
        <Link to="/dashboard/transcriptions" className="mt-4 inline-flex items-center text-blue-600 hover:underline">
          <ArrowLeft className="w-4 h-4 mr-1" />
          Return to transcriptions
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex flex-col space-y-6">
        {/* Header Section */}
        <div className="flex flex-col space-y-4">
          {/* Back Link */}
          <Link to="/dashboard/transcriptions" className="inline-flex items-center text-blue-600 hover:underline">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to transcriptions
          </Link>

          {/* Title and Actions Row */}
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900">{transcription.title}</h1>
              <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>{formatDuration(transcription.duration || 0)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Globe className="w-4 h-4" />
                  <span>{transcription.language ? transcription.language.split('-')[0].toUpperCase() : 'ID'}</span>
                </div>
                <div>{formatDate(transcription.createdAt)}</div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              {/* Export Button */}
              <div className="relative">
                <button 
                  onClick={() => {
                    setShowExportMenu(!showExportMenu);
                    setShowShareMenu(false);
                  }}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </button>
                {showExportMenu && (
                  <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
                    <div className="py-1" role="menu" aria-orientation="vertical">
                      <button
                        onClick={handleExportAsTxt}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        role="menuitem"
                      >
                        Download as TXT
                      </button>
                      <button
                        onClick={handleExportAsDocx}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        role="menuitem"
                      >
                        Download as HTML
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Share Button */}
              <div className="relative">
                <button
                  onClick={() => {
                    setShowShareMenu(!showShareMenu);
                    setShowExportMenu(false);
                  }}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </button>
                {showShareMenu && (
                  <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
                    <div className="py-1" role="menu" aria-orientation="vertical">
                      <button
                        onClick={handleShareViaEmail}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        role="menuitem"
                      >
                        Share via Email
                      </button>
                      <button
                        onClick={handleShareViaWhatsApp}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        role="menuitem"
                      >
                        Share via WhatsApp
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Copy Button */}
              <button
                onClick={handleCopyToClipboard}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Audio Player */}
        {transcription.audioUrl && (
          <div className="bg-white shadow-sm rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Audio Recording</h3>
            <audio controls className="w-full" src={transcription.audioUrl}>
              Your browser does not support the audio element.
            </audio>
          </div>
        )}

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('summary')}
              className={`py-2 px-1 inline-flex items-center border-b-2 font-medium text-sm ${
                activeTab === 'summary'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Summary
            </button>
            <button
              onClick={() => setActiveTab('transcript')}
              className={`py-2 px-1 inline-flex items-center border-b-2 font-medium text-sm ${
                activeTab === 'transcript'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Full Transcript
            </button>
          </nav>
        </div>

        {/* Content */}
        <div className="bg-white shadow-sm rounded-lg p-6">
          {activeTab === 'summary' ? (
            <MeetingSummaryDisplay summaryData={transcription.summary} />
          ) : (
            <div className="prose max-w-none">
              <div className="whitespace-pre-line">{transcription.text}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 