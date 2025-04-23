import json

data = {
    "url": "https://meet.google.com/xjr-zfvk-ckw",
    "username": "Notulen Bot"
}

with open('request.json', 'w') as f:
    json.dump(data, f)

print("JSON file created successfully")
with open('request.json', 'r') as f:
    print(f.read()) 