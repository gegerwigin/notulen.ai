import requests
import json

# Data yang akan dikirim
data = {
    "url": "https://meet.google.com/abc-defg-hij",
    "username": "Test Bot"
}

# Headers
headers = {
    "Content-Type": "application/json"
}

# Kirim request
response = requests.post("http://localhost:8080/join", headers=headers, json=data)

# Cetak hasil
print("Status Code:", response.status_code)
print("Response:")
print(response.text) 