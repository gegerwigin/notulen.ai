import requests
import json
import sys

def join_meeting(url):
    api_endpoint = "http://localhost:3002/join-meeting"
    payload = {"meetingUrl": url}
    
    try:
        response = requests.post(api_endpoint, json=payload)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        return response.json()
    except Exception as e:
        print(f"Error: {e}")
        return None

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python test_join.py [meeting_url]")
        sys.exit(1)
        
    meeting_url = sys.argv[1]
    print(f"Trying to join meeting: {meeting_url}")
    result = join_meeting(meeting_url)
    
    if result and result.get("success"):
        print("Successfully sent join request!")
        print(f"Bot ID: {result.get('botId')}")
    else:
        print("Failed to join meeting") 