import requests

try:
    response = requests.post("http://18.141.229.165/api/join-meeting", 
                           json={"meetingUrl": "https://meet.google.com/abc-defg-hij"})
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Error: {e}") 