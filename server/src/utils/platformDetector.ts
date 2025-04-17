export interface MeetingInfo {
  platform: 'google-meet' | 'zoom' | 'teams';
  meetingId: string;
  password?: string;
  url: string;
}

export function detectPlatform(url: string): MeetingInfo {
  const urlObj = new URL(url);
  
  if (urlObj.hostname === 'meet.google.com') {
    return {
      platform: 'google-meet',
      meetingId: urlObj.pathname.replace('/', ''),
      url
    };
  }
  
  if (urlObj.hostname === 'zoom.us' || urlObj.hostname.endsWith('.zoom.us')) {
    const meetingId = urlObj.pathname.match(/\/j\/(\d+)/)?.[1] || '';
    return {
      platform: 'zoom',
      meetingId,
      password: urlObj.searchParams.get('pwd') || undefined,
      url
    };
  }
  
  if (urlObj.hostname === 'teams.microsoft.com') {
    return {
      platform: 'teams',
      meetingId: urlObj.pathname.split('/').pop() || '',
      url
    };
  }
  
  throw new Error('Unsupported meeting platform');
} 