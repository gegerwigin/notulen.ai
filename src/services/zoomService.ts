// Interface for Zoom meeting request
interface ZoomMeetingRequest {
  meetingId: string;
  password?: string;
}

// Interface for Zoom API response
interface ZoomMeetingResponse {
  success: boolean;
  meetingUrl?: string;
  joinUrl?: string;
  error?: string;
}

// Interface for Zoom transcription response
interface ZoomTranscriptionResponse {
  transcription: string;
  summary?: string;
  actionItems?: string[];
  participants?: string[];
}

// Interface for Zoom SDK signature response
interface ZoomSignatureResponse {
  success: boolean;
  signature?: string;
  sdkKey?: string;
  error?: string;
}

/**
 * Service to handle Zoom API integration
 */
class ZoomService {
  private accountId: string;
  private clientId: string;
  private clientSecret: string;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor() {
    // Initialize with environment variables or stored credentials
    this.accountId = 'M_fFy1vtTfql15uK6klUgg';
    this.clientId = 'YE_cHkKqTgix54ZCDLhHlQ';
    this.clientSecret = '2G2taqDMba88KII2y650nubsqD40i8ZD';
  }

  /**
   * Get OAuth access token for Zoom API
   * Uses Server-to-Server OAuth flow
   */
  public async getAccessToken(credentials?: any): Promise<string> {
    try {
      // Check if we have a valid token
      if (this.accessToken && Date.now() < this.tokenExpiry) {
        return this.accessToken;
      }

      // Prepare the request for token
      const tokenEndpoint = 'https://zoom.us/oauth/token';
      
      // Use provided credentials or default ones
      const clientId = credentials?.apiKeys?.clientId || this.clientId;
      const clientSecret = credentials?.apiKeys?.clientSecret || this.clientSecret;
      const accountId = credentials?.apiKeys?.accountId || this.accountId;
      
      const authCredentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
      
      const response = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${authCredentials}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          'grant_type': 'account_credentials',
          'account_id': accountId
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to get Zoom access token: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Store the token and its expiry time
      this.accessToken = data.access_token;
      this.tokenExpiry = Date.now() + (data.expires_in * 1000);
      
      // Return empty string if token is null (should never happen)
      return this.accessToken || '';
    } catch (error) {
      console.error('Error getting Zoom access token:', error);
      throw new Error('Failed to authenticate with Zoom API');
    }
  }

  /**
   * Join a Zoom meeting programmatically
   * In a real implementation, this would use Zoom SDK or API
   */
  async joinMeeting(request: ZoomMeetingRequest): Promise<ZoomMeetingResponse> {
    try {
      const token = await this.getAccessToken();
      
      // Gunakan Zoom API untuk membuat bot yang bergabung ke meeting
      // Ini menggunakan Zoom Meeting SDK yang memungkinkan bot bergabung sebagai peserta terpisah
      
      // Endpoint untuk membuat signature JWT untuk Meeting SDK
      const apiUrl = `https://api.zoom.us/v2/meetings/${request.meetingId}/join`;
      
      // Buat signature untuk Meeting SDK
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          // Gunakan role 0 untuk bergabung sebagai peserta (bukan host)
          role: 0,
          // Jika ada password, sertakan
          password: request.password || '',
          // Tambahkan parameter lain yang diperlukan
          join_from_web: true
        })
      });
      
      if (!response.ok) {
        console.error('Failed to join meeting via Zoom API:', await response.text());
        throw new Error(`Failed to join meeting: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Buat URL join yang bisa digunakan oleh browser untuk bergabung ke meeting
      // URL ini akan membuat peserta baru bergabung, bukan menggunakan akun yang sudah login
      const joinUrl = data.join_url || `https://zoom.us/wc/${request.meetingId}/join?pwd=${request.password || ''}`;
      
      return {
        success: true,
        meetingUrl: `https://zoom.us/j/${request.meetingId}`,
        joinUrl: joinUrl
      };
    } catch (error) {
      console.error('Error joining Zoom meeting:', error);
      
      // Fallback jika API gagal - buat URL join manual
      return {
        success: false,
        error: `Failed to join via API: ${error}`,
        joinUrl: `https://zoom.us/wc/${request.meetingId}/join?pwd=${request.password || ''}`
      };
    }
  }

  /**
   * Get meeting information from Zoom API
   */
  async getMeetingInfo(meetingId: string): Promise<any> {
    try {
      const token = await this.getAccessToken();
      
      const response = await fetch(`https://api.zoom.us/v2/meetings/${meetingId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to get meeting info: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting Zoom meeting info:', error);
      throw new Error('Failed to get Zoom meeting information');
    }
  }

  /**
   * Get meeting transcript from Zoom API
   * Note: This requires the Cloud Recording feature to be enabled
   */
  async getMeetingTranscript(meetingId: string): Promise<ZoomTranscriptionResponse> {
    try {
      // Get token but don't use it in this mock implementation
      await this.getAccessToken();
      
      // In a real implementation, you would call the Zoom API to get the transcript
      // For example: GET /meetings/{meetingId}/recordings
      console.log(`Getting transcript for meeting ID: ${meetingId}`);
      
      // For now, simulate API delay and return mock data
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Simulate transcription result
      return {
        transcription: "This is a simulated transcription of the Zoom meeting. In a real implementation, this would be the actual transcription from Zoom's cloud recording.",
        summary: "This Zoom meeting discussed project updates, timeline changes, and resource allocation. The team agreed to move the launch date to next quarter.",
        actionItems: [
          "Alex to update the project timeline by Friday",
          "Maria to coordinate with the design team on new mockups",
          "Team to review resource allocation in next week's meeting"
        ],
        participants: [
          "Alex Wong",
          "Maria Garcia",
          "David Johnson",
          "Notulen Bot"
        ]
      };
    } catch (error) {
      console.error('Error getting Zoom transcript:', error);
      throw new Error('Failed to get Zoom meeting transcript');
    }
  }

  /**
   * Get Zoom SDK signature for joining a meeting
   * This is required by the Zoom Web SDK to join a meeting
   */
  public async getZoomSignature(meetingId: string, userName: string, credentials?: any): Promise<ZoomSignatureResponse> {
    try {
      const token = await this.getAccessToken(credentials);
      
      // Use provided credentials or default ones
      const clientId = credentials?.apiKeys?.clientId || this.clientId;
      
      // Endpoint untuk mendapatkan signature
      const apiUrl = `https://api.zoom.us/v2/sdk/signature`;
      
      // Buat signature untuk Meeting SDK
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          meetingNumber: meetingId,
          role: 0, // 0 untuk attendee/participant, 1 untuk host
          sdkKey: clientId, // SDK Key sama dengan Client ID
          userName: userName,
          userEmail: '' // Kosongkan email agar tidak menggunakan akun yang sudah login
        })
      });
      
      if (!response.ok) {
        console.error('Failed to get Zoom signature:', await response.text());
        throw new Error(`Failed to get signature: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      return {
        success: true,
        signature: data.signature,
        sdkKey: clientId
      };
    } catch (error) {
      console.error('Error getting Zoom signature:', error);
      return {
        success: false,
        error: `Failed to get Zoom signature: ${error}`
      };
    }
  }

  /**
   * Schedule a Zoom meeting programmatically
   */
  async scheduleMeeting(topic: string, startTime: Date, duration: number): Promise<any> {
    try {
      const token = await this.getAccessToken();
      
      const meetingData = {
        topic,
        type: 2, // Scheduled meeting
        start_time: startTime.toISOString(),
        duration,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        settings: {
          host_video: true,
          participant_video: true,
          join_before_host: true,
          mute_upon_entry: false,
          auto_recording: 'cloud'
        }
      };
      
      const response = await fetch('https://api.zoom.us/v2/users/me/meetings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(meetingData)
      });

      if (!response.ok) {
        throw new Error(`Failed to schedule meeting: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error scheduling Zoom meeting:', error);
      throw new Error('Failed to schedule Zoom meeting');
    }
  }
}

export default new ZoomService();
