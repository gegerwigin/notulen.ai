import requests
import json

url = 'http://18.141.229.165:3002/join-meeting'
data = {
    'meetingUrl': 'https://meet.google.com/kzy-xevz-idz'  # URL meeting yang valid
}

headers = {
    'Content-Type': 'application/json'
}

response = requests.post(url, json=data, headers=headers)
print('Status:', response.status_code)
print('Response:', response.json()) 