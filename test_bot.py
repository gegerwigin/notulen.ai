import requests
import json
import time
import argparse
import sys

def check_server_health(base_url):
    print(f"Memeriksa status server di {base_url}/health...")
    try:
        response = requests.get(f"{base_url}/health", timeout=10)
        response.raise_for_status()
        data = response.json()
        print("Status server:")
        print(f"  Status: {response.status_code}")
        print(f"  Bot initialized: {data.get('botInitialized', False)}")
        print(f"  Bot busy: {data.get('botBusy', False)}")
        print(f"  Current meeting: {data.get('currentMeeting')}")
        return True
    except requests.exceptions.RequestException as e:
        print(f"Error saat memeriksa server: {e}")
        return False

def join_meeting(base_url, meet_url, username):
    print(f"Mencoba bergabung ke meeting {meet_url} sebagai {username}...")
    
    data = {
        "url": meet_url,
        "username": username
    }
    
    print(f"Mengirim data: {json.dumps(data)}")
    
    try:
        response = requests.post(
            f"{base_url}/join", 
            json=data,
            headers={"Content-Type": "application/json"},
            timeout=60
        )
        
        print(f"Status response: {response.status_code}")
        print(f"Response body: {response.text}")
        
        if response.status_code == 200:
            print("✅ Berhasil mengirim permintaan join meeting!")
            return True
        else:
            print(f"❌ Gagal mengirim permintaan: {response.status_code}")
            return False
    except requests.exceptions.RequestException as e:
        print(f"❌ Error saat mengirim permintaan: {e}")
        return False

def main():
    parser = argparse.ArgumentParser(description="Test Bot Meeting")
    parser.add_argument("--url", default="http://localhost:3002", help="URL server bot")
    parser.add_argument("--meet", default="https://meet.google.com/xjr-zfvk-ckw", help="URL Google Meet")
    parser.add_argument("--name", default="Notulen AI Bot", help="Nama bot")
    parser.add_argument("--check", action="store_true", help="Hanya periksa status server")
    
    args = parser.parse_args()
    
    if args.check:
        if not check_server_health(args.url):
            print("❌ Server tidak merespon dengan benar.")
            sys.exit(1)
        sys.exit(0)
    
    # Periksa status server
    if not check_server_health(args.url):
        print("❌ Server tidak merespon dengan benar. Tidak dapat melanjutkan.")
        sys.exit(1)
    
    # Coba join meeting
    join_meeting(args.url, args.meet, args.name)

if __name__ == "__main__":
    main()
