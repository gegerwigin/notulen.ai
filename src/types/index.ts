// Types for Meeting Summary
export interface SummaryData {
  meetingInfo: {
    title: string;
    date: string;
    duration: string;
    location: string;
  };
  summary: string;
  topics: Array<{
    title: string;
    points: string[];
  }>;
  actionItems: Array<{
    task: string;
    assignee: string;
    deadline: string;
    status: string;
  }>;
  participants: Array<{
    name: string;
    role: string;
    contribution: string;
  }>;
}

// Types for Transcription
export interface Transcription {
  id: string;
  userId: string;
  title: string;
  text: string;
  audioUrl?: string;
  createdAt: any; // Firestore Timestamp
  updatedAt: any; // Firestore Timestamp
  language?: string;
  summary?: SummaryData;
  duration?: number;
  isProcessed?: boolean;
}

// Types for User
export interface User {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  isAdmin?: boolean;
} 