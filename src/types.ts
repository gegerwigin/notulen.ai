export interface SummaryTopic {
  title: string;
  points: string[];
}

export interface ActionItem {
  task: string;
  assignee: string;
  deadline: string;
  status: string;
}

export interface Participant {
  name: string;
  role: string;
  contribution: string;
}

export interface MeetingInfo {
  title: string;
  date: string;
  duration: string;
  location: string;
}

export interface SummaryData {
  meetingInfo?: MeetingInfo;
  summary?: string;
  topics?: Array<SummaryTopic | string>;
  actionItems?: Array<ActionItem | string>;
  participants?: Array<Participant>;
} 