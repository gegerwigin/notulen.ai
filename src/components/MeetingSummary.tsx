import { useState } from 'react';
import { ClipboardList, Copy, Check } from 'lucide-react';
import { SummaryData, SummaryTopic, ActionItem } from '../types';

interface MeetingSummaryProps {
  summary: SummaryData | undefined;
}

export default function MeetingSummary({ summary }: MeetingSummaryProps) {
  const [isCopied, setIsCopied] = useState(false);

  // Handle empty summary or malformed data
  if (!summary || typeof summary !== 'object') {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-6">
        <h3 className="text-lg font-semibold text-yellow-800">Ringkasan Tidak Tersedia</h3>
        <p className="text-yellow-700">Ringkasan rapat tidak tersedia atau belum dibuat.</p>
      </div>
    );
  }

  console.log("MeetingSummary rendering with data:", JSON.stringify(summary));
  
  const { meetingInfo, summary: summaryText, topics, actionItems, participants } = summary;

  // Safety checks for each section
  const hasMeetingInfo = meetingInfo && Object.keys(meetingInfo).length > 0;
  const hasTopics = Array.isArray(topics) && topics.length > 0;
  const hasActionItems = Array.isArray(actionItems) && actionItems.length > 0;
  const hasParticipants = Array.isArray(participants) && participants.length > 0;

  const handleCopySummary = async () => {
    try {
      if (!meetingInfo) return;
      
      let formattedSummary = `# ${meetingInfo.title || 'Untitled Meeting'}\n`;
      formattedSummary += `Tanggal: ${meetingInfo.date || 'N/A'} • Durasi: ${meetingInfo.duration || 'N/A'}`;
      
      if (meetingInfo.location && meetingInfo.location !== "Tidak disebutkan" && meetingInfo.location !== "Tidak terdeteksi") {
        formattedSummary += ` • Lokasi: ${meetingInfo.location}`;
      }
      
      formattedSummary += '\n\n';
      
      if (hasTopics && topics) {
        formattedSummary += `## Topik\n${topics.map(topic => {
          return typeof topic === 'string' 
            ? topic 
            : (topic as SummaryTopic).title || 'Untitled Topic';
        }).join(', ')}\n\n`;
      }
      
      formattedSummary += `## Ringkasan\n${summaryText || 'No summary available'}\n\n`;
      
      if (hasTopics && topics) {
      formattedSummary += `## Poin-Poin Penting\n`;
        topics.forEach((topic, index) => {
          if (typeof topic === 'string') {
            formattedSummary += `### Topic ${index + 1}\n- ${topic}\n\n`;
            return;
          }
          
          const typedTopic = topic as SummaryTopic;
          formattedSummary += `### ${typedTopic.title || `Topic ${index + 1}`}\n`;
          if (Array.isArray(typedTopic.points) && typedTopic.points.length > 0) {
            typedTopic.points.forEach((point: string, pointIndex: number) => {
              formattedSummary += `- ${point}\n`;
            });
          }
      formattedSummary += '\n';
        });
      }
      
      if (hasActionItems && actionItems) {
      formattedSummary += `## Tindakan\n`;
        actionItems.forEach((item, index) => {
          if (typeof item === 'string' && item.trim().startsWith('{')) {
            try {
              const parsedItem = JSON.parse(item);
              if (parsedItem && parsedItem.task) {
                formattedSummary += `- **${parsedItem.task || 'Undefined Task'}** - ${parsedItem.assignee || 'Tidak ditentukan'} - ${parsedItem.deadline || 'Tidak ditentukan'}\n`;
              }
            } catch (e) {
              const cleanedText = item.replace(/Transkrip:.+?JSON terstruktur:/s, '').trim();
              const shortenedText = cleanedText.length > 100 ? cleanedText.substring(0, 100) + '...' : cleanedText;
              formattedSummary += `- ${shortenedText}\n`;
            }
            return;
          }
          
          if (typeof item === 'string') {
            formattedSummary += `- ${item}\n`;
            return;
          }
          
          const typedItem = item as ActionItem;
          formattedSummary += `- **${typedItem.task || 'Undefined Task'}** - ${typedItem.assignee || 'Tidak ditentukan'} - ${typedItem.deadline || 'Tidak ditentukan'}\n`;
      });
      formattedSummary += '\n';
      }
      
      if (hasParticipants && participants) {
        formattedSummary += `## Peserta\n${participants.map(participant => participant.name).join(', ')}\n\n`;
      }
      
      formattedSummary += `---\nRingkasan ini dihasilkan secara otomatis menggunakan Notula.ai`;
      
      await navigator.clipboard.writeText(formattedSummary);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy summary:', error);
    }
  };

  return (
    <div className="space-y-6">
      {hasMeetingInfo && meetingInfo && (
        <div>
          <h3 className="text-xl font-semibold mb-3 text-gray-900">Informasi Rapat</h3>
          <div className="bg-white rounded-md border border-gray-200 overflow-hidden">
            <div className="grid grid-cols-2 gap-4 p-4">
              <div>
                <h4 className="text-sm font-medium text-gray-500">Judul</h4>
                <p className="mt-1 text-base font-medium text-gray-900">{meetingInfo.title || 'Tidak tersedia'}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-500">Tanggal</h4>
                <p className="mt-1 text-base text-gray-900">{meetingInfo.date || 'Tidak tersedia'}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-500">Durasi</h4>
                <p className="mt-1 text-base text-gray-900">{meetingInfo.duration || 'Tidak tersedia'}</p>
              </div>
          <div>
                <h4 className="text-sm font-medium text-gray-500">Lokasi</h4>
                <p className="mt-1 text-base text-gray-900">{meetingInfo.location || 'Tidak tersedia'}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {summaryText && (
        <div>
          <h3 className="text-xl font-semibold mb-3 text-gray-900">Ringkasan</h3>
          <div className="bg-white rounded-md border border-gray-200 p-4">
            <p className="text-base text-gray-700 whitespace-pre-line">{summaryText}</p>
          </div>
        </div>
      )}

      {hasTopics && topics && (
        <div>
          <h3 className="text-xl font-semibold mb-3 text-gray-900">Topik yang Dibahas</h3>
          <div className="space-y-4">
            {topics.map((topic, index) => {
              if (typeof topic === 'string') {
                return (
                  <div key={index} className="bg-white rounded-md border border-gray-200 p-4">
                    <p className="text-gray-700">{topic}</p>
                  </div>
                );
              }
              
              const typedTopic = topic as SummaryTopic;
              return (
                <div key={index} className="bg-white rounded-md border border-gray-200 p-4">
                  <h4 className="text-lg font-medium text-gray-900 mb-2">{typedTopic.title || 'Untitled Topic'}</h4>
                  {Array.isArray(typedTopic.points) && typedTopic.points.length > 0 ? (
                    <ul className="list-disc pl-5 space-y-1">
                      {typedTopic.points.map((point: string, pointIndex: number) => (
                        <li key={pointIndex} className="text-gray-700">{point}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-500 italic">Tidak ada poin pembahasan yang teridentifikasi</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {hasActionItems && actionItems && (
        <div>
          <h3 className="text-xl font-semibold mb-3 text-gray-900">Item Tindakan</h3>
          <div className="bg-white rounded-md border border-gray-200 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tugas</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Penanggung Jawab</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tenggat Waktu</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {actionItems.map((item, index) => {
                  if (typeof item === 'string' && item.trim().startsWith('{')) {
                    try {
                      const parsedItem = JSON.parse(item);
                      if (parsedItem && parsedItem.task) {
                        return (
                          <tr key={index}>
                            <td className="px-6 py-4 whitespace-normal text-sm font-medium text-gray-900">{parsedItem.task || 'Undefined Task'}</td>
                            <td className="px-6 py-4 whitespace-normal text-sm text-gray-700">{parsedItem.assignee || 'Tidak ditentukan'}</td>
                            <td className="px-6 py-4 whitespace-normal text-sm text-gray-700">{parsedItem.deadline || 'Tidak ditentukan'}</td>
                            <td className="px-6 py-4 whitespace-normal text-sm text-gray-700">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                parsedItem.status?.toLowerCase().includes('selesai') || parsedItem.status?.toLowerCase().includes('done') 
                                  ? 'bg-green-100 text-green-800' 
                                  : parsedItem.status?.toLowerCase().includes('progress') 
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {parsedItem.status || 'Pending'}
                              </span>
                            </td>
                          </tr>
                        );
                      }
                    } catch (e) {
                      const cleanedText = item.replace(/Transkrip:.+?JSON terstruktur:/s, '').trim();
                      const shortenedText = cleanedText.length > 100 ? cleanedText.substring(0, 100) + '...' : cleanedText;
                      return (
                        <tr key={index}>
                          <td colSpan={4} className="px-6 py-4 whitespace-normal text-sm font-medium text-gray-900">{shortenedText}</td>
                        </tr>
                      );
                    }
                  }
                  
                  if (typeof item === 'string') {
                    const taskMatch = item.match(/Deskripsi tugas:?\s*([^-]+)/i);
                    const assigneeMatch = item.match(/Penanggung jawab:?\s*([^-]+)/i);
                    const deadlineMatch = item.match(/Tenggat:?\s*([^-]+)/i);
                    const statusMatch = item.match(/Status:?\s*([^-]+)/i);
                    
                    if (taskMatch) {
                      return (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-normal text-sm font-medium text-gray-900">{taskMatch[1].trim()}</td>
                          <td className="px-6 py-4 whitespace-normal text-sm text-gray-700">{assigneeMatch ? assigneeMatch[1].trim() : 'Tidak ditentukan'}</td>
                          <td className="px-6 py-4 whitespace-normal text-sm text-gray-700">{deadlineMatch ? deadlineMatch[1].trim() : 'Tidak ditentukan'}</td>
                          <td className="px-6 py-4 whitespace-normal text-sm text-gray-700">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              {statusMatch ? statusMatch[1].trim() : 'Pending'}
                            </span>
                          </td>
                        </tr>
                      );
                    }
                    
                    const displayText = item.length > 100 ? item.substring(0, 100) + '...' : item;
                    return (
                      <tr key={index}>
                        <td colSpan={4} className="px-6 py-4 whitespace-normal text-sm font-medium text-gray-900">{displayText}</td>
                      </tr>
                    );
                  }
                  
                  const typedItem = item as ActionItem;
                  return (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-normal text-sm font-medium text-gray-900">{typedItem.task || 'Undefined Task'}</td>
                      <td className="px-6 py-4 whitespace-normal text-sm text-gray-700">{typedItem.assignee || 'Tidak ditentukan'}</td>
                      <td className="px-6 py-4 whitespace-normal text-sm text-gray-700">{typedItem.deadline || 'Tidak ditentukan'}</td>
                      <td className="px-6 py-4 whitespace-normal text-sm text-gray-700">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          typedItem.status?.toLowerCase().includes('selesai') || typedItem.status?.toLowerCase().includes('done') 
                            ? 'bg-green-100 text-green-800' 
                            : typedItem.status?.toLowerCase().includes('progress') 
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {typedItem.status || 'Pending'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {hasParticipants && participants && (
        <div>
          <h3 className="text-xl font-semibold mb-3 text-gray-900">Peserta</h3>
          <div className="bg-white rounded-md border border-gray-200 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nama</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Peran/Jabatan</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kontribusi</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {participants.map((participant, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-normal text-sm font-medium text-gray-900">{participant.name}</td>
                    <td className="px-6 py-4 whitespace-normal text-sm text-gray-700">{participant.role || 'Tidak disebutkan'}</td>
                    <td className="px-6 py-4 whitespace-normal text-sm text-gray-700">{participant.contribution || 'Tidak disebutkan'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="bg-gray-50 px-4 py-3 border border-gray-200 rounded-md flex items-center justify-between">
        <p className="text-xs text-gray-500">
          Ringkasan ini dihasilkan secara otomatis menggunakan Notula.ai
        </p>
            <button
          className={`px-3 py-1.5 rounded-md text-sm font-medium flex items-center ${
            isCopied ? 'bg-green-500 text-white' : 'bg-indigo-600 text-white hover:bg-indigo-700'
              }`}
              onClick={handleCopySummary}
              title="Salin ringkasan dengan format"
            >
              {isCopied ? (
                <>
                  <Check className="h-4 w-4 mr-1" />
                  Tersalin
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-1" />
              Salin Ringkasan
                </>
              )}
            </button>
      </div>
    </div>
  );
}
