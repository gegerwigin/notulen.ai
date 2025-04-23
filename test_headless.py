import requests
import json
import sys
import time

def join_meeting(url):
    api_endpoint = "http://localhost:3003/join-meeting"
    payload = {"meetingUrl": url}
    
    try:
        response = requests.post(api_endpoint, json=payload)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        return response.json()
    except Exception as e:
        print(f"Error: {e}")
        return None

def check_status():
    api_endpoint = "http://localhost:3003/status"
    
    try:
        response = requests.get(api_endpoint)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        return response.json()
    except Exception as e:
        print(f"Error: {e}")
        return None

def leave_meeting(bot_id):
    api_endpoint = "http://localhost:3003/leave-meeting"
    payload = {"botId": bot_id}
    
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
        print("Usage: python test_headless.py [meeting_url]")
        sys.exit(1)
        
    meeting_url = sys.argv[1]
    print(f"Trying to join meeting: {meeting_url}")
    
    # Join meeting
    result = join_meeting(meeting_url)
    
    if result and result.get("success"):
        print("Successfully sent join request!")
        bot_id = result.get("botId")
        print(f"Bot ID: {bot_id}")
        
        # Check status after 10 seconds
        print("Waiting 10 seconds...")
        time.sleep(10)
        status = check_status()
        
        if status and status.get("success"):
            print(f"Active bots: {status.get('activeBots')}")
            for bot in status.get("bots", []):
                print(f"Bot {bot.get('botId')}: {bot.get('meetingUrl')}")
            
            # Ask to leave
            choice = input("Press 'q' to quit the meeting or any other key to keep it running: ")
            if choice.lower() == 'q':
                leave_result = leave_meeting(bot_id)
                if leave_result and leave_result.get("success"):
                    print("Successfully left meeting")
                else:
                    print("Failed to leave meeting")
        else:
            print("Failed to get status")
    else:
        print("Failed to join meeting") 