import requests
import json

def send_join_request():
    url = "http://localhost:3000/api/join-meeting"
    payload = {
        "meetingUrl": "https://meet.google.com/abc-defg-hij",
        "options": {
            "enableCamera": False,
            "enableMicrophone": False,
            "displayName": "Bot"
        }
    }
    
    try:
        response = requests.post(url, json=payload)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
    except Exception as e:
        print(f"Error: {str(e)}")

if __name__ == "__main__":
    send_join_request() 