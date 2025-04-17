import React from 'react';
import { SummaryData, SummaryTopic, ActionItem } from '../types';

interface Participant {
  name: string;
  role: string;
  contribution: string;
}

interface MeetingInfo {
  title: string;
  date: string;
  duration: string;
  location: string;
}

interface MeetingSummaryDisplayProps {
  summaryData: SummaryData | null | undefined;
  isLoading?: boolean;
}

const MeetingSummaryDisplay: React.FC<MeetingSummaryDisplayProps> = ({ summaryData, isLoading = false }) => {
  console.log('MeetingSummaryDisplay received:', summaryData);
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!summaryData) {
    return <div className="text-gray-500">No summary available yet. Generate a summary to see results here.</div>;
  }

  const { summary, topics = [], actionItems = [] } = summaryData;

  const renderTopics = () => {
    if (!topics || topics.length === 0) {
      return <div className="text-gray-500">No topics available</div>;
    }

    return (
      <div className="mt-4">
        <h3 className="text-lg font-semibold mb-2">Topics Discussed</h3>
        <ul className="list-disc list-inside space-y-2">
          {topics.map((topic, index) => {
            if (typeof topic === 'string') {
              return <li key={index} className="ml-4">{topic}</li>;
            } else if (typeof topic === 'object' && topic !== null) {
              const typedTopic = topic as SummaryTopic;
              return (
                <li key={index} className="ml-4">
                  <span className="font-medium">{typedTopic.title || 'Untitled Topic'}</span>
                  {typedTopic.points && typedTopic.points.length > 0 && (
                    <ul className="list-disc list-inside ml-4 mt-1">
                      {typedTopic.points.map((point, pointIndex) => (
                        <li key={pointIndex} className="ml-4">{point}</li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            }
            return null;
          }).filter(Boolean)}
        </ul>
      </div>
    );
  };

  const renderActionItems = () => {
    if (!actionItems || actionItems.length === 0) {
      return <div className="text-gray-500">No action items available</div>;
    }

    return (
      <div className="mt-4">
        <h3 className="text-lg font-semibold mb-2">Action Items</h3>
        <ul className="list-disc list-inside space-y-2">
          {actionItems.map((item, index) => {
            if (typeof item === 'string') {
              return <li key={index} className="ml-4">{item}</li>;
            } else if (typeof item === 'object' && item !== null) {
              const typedItem = item as ActionItem;
              return (
                <li key={index} className="ml-4">
                  <span className="font-medium">{typedItem.task || 'Undefined Task'}</span>
                  {typedItem.assignee && <span className="text-sm text-gray-600"> - Assigned to: {typedItem.assignee}</span>}
                  {typedItem.deadline && <span className="text-sm text-gray-600"> - Due: {typedItem.deadline}</span>}
                </li>
              );
            }
            return null;
          }).filter(Boolean)}
        </ul>
      </div>
    );
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow-sm border border-gray-200">
      {summary ? (
        <div>
          <h3 className="text-lg font-semibold mb-2">Summary</h3>
          <p className="text-gray-700 whitespace-pre-line">{summary}</p>
        </div>
      ) : (
        <div className="text-gray-500">No summary content available</div>
      )}
      
      {renderTopics()}
      {renderActionItems()}
    </div>
  );
};

export default MeetingSummaryDisplay; 