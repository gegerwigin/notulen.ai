import requests
import json

url = 'http://localhost:3002/join'
headers = {'Content-Type': 'application/json'}
data = {
    'url': 'https://meet.google.com/test',
    'username': 'test'
}

response = requests.post(url, headers=headers, json=data)
print(f'Status Code: {response.status_code}')
print('Response:', response.text) 