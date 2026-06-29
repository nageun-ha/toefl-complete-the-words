import urllib.request
import urllib.error
import json

req = urllib.request.Request("http://127.0.0.1:8000/api/generate-problem")
try:
    resp = urllib.request.urlopen(req, timeout=60)
    data = json.loads(resp.read().decode())
    print(json.dumps(data, indent=2, ensure_ascii=False))
except urllib.error.HTTPError as e:
    print(f"Status: {e.code}")
    print(e.read().decode())
