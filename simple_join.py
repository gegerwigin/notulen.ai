import requests
import json
import sys

def test_server():
    # Check if server is running
    try:
        response = requests.get("http://localhost:3003/status")
        if response.status_code == 200:
            print("Server is running!")
            return True
        else:
            print(f"Server returned status code: {response.status_code}")
            return False
    except Exception as e:
        print(f"Error connecting to server: {e}")
        return False

def join_meeting(url):
    # Simple JSON payload
    payload = json.dumps({"meetingUrl": url})
    
    # Print payload for debugging
    print(f"Sending payload: {payload}")
    
    try:
        # Direct request to server
        response = requests.post(
            "http://localhost:3003/join-meeting",
            data=payload,
            headers={"Content-Type": "application/json"}
        )
        
        # Print response for debugging
        print(f"Status code: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 200:
            return True
        else:
            return False
    except Exception as e:
        print(f"Error: {e}")
        return False

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python simple_join.py <meeting_url>")
        sys.exit(1)
    
    meeting_url = sys.argv[1]
    print(f"Will try to join: {meeting_url}")
    
    if not test_server():
        print("Failed to connect to server. Is it running?")
        sys.exit(1)
    
    print("Attempting to join the meeting...")
    if join_meeting(meeting_url):
        print("Join request successful!")
    else:
        print("Failed to join meeting.") 