import urllib.request
import json

def test_auth(api_key, name, email, pwd):
    url = f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={api_key}"
    data = json.dumps({"email": email, "password": pwd, "returnSecureToken": True}).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
    
    try:
        response = urllib.request.urlopen(req)
        print(f"[SUCCESS] {name}: {email} / {pwd}")
    except urllib.error.HTTPError as e:
        error_info = json.loads(e.read().decode())
        print(f"[FAILED]  {name}: {email} / {pwd} -> {error_info['error']['message']}")

API_SKY = "AIzaSyAc745FU-eHN8JU0pFAtPyHYOKDSwue7_I"
API_DEX = "AIzaSyDTlsbl1yl9_dUJZdnoSB275V3XNQ_aowo"

emails = ["smartmoneyonline@gmail.com", "moneywhop20@gmail.com"]
passwords = ["12345678", "724734", "!#646Im88."]

print("Testing all credential combinations...\n")
for email in emails:
    for pwd in passwords:
        test_auth(API_SKY, "Skyfortune", email, pwd)
        test_auth(API_DEX, "Eventilify", email, pwd)
