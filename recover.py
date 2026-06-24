import os
import shutil
import json

history_dir = r"C:\Users\111\AppData\Roaming\Code\User\History"
target_dir = r"c:\Users\111\Binance"

files_to_recover = [
    "404.html",
    "assets.html",
    "deposit-network.html",
    "deposit-select-coin.html",
    "deposit-usdt.html",
    "history.html",
    "index.html",
    "select-coin.html",
    "send-usdt.html"
]

recovered = set()

for root, dirs, files in os.walk(history_dir):
    if "entries.json" in files:
        try:
            with open(os.path.join(root, "entries.json"), "r", encoding="utf-8") as f:
                data = json.load(f)
                resource = data.get("resource", "")
                
                # Check if this resource is one of the files we want to recover
                if "Binance" in resource and resource.endswith(".html"):
                    for fname in files_to_recover:
                        if fname in recovered:
                            continue
                            
                        # The resource URI might have forward slashes or encoded slashes
                        if resource.endswith("/" + fname) or resource.endswith("%2F" + fname) or resource.endswith("\\" + fname):
                            entries = data.get("entries", [])
                            # Sort by timestamp, newest first
                            entries = sorted(entries, key=lambda x: x.get("timestamp", 0), reverse=True)
                            
                            for entry in entries:
                                entry_file = os.path.join(root, entry["id"])
                                if os.path.exists(entry_file):
                                    size = os.path.getsize(entry_file)
                                    print(f"Checking {fname} version {entry_file} - size: {size}")
                                    if size > 0:
                                        dest = os.path.join(target_dir, fname)
                                        shutil.copy2(entry_file, dest)
                                        recovered.add(fname)
                                        print(f"SUCCESS: Recovered {fname}!")
                                        break
        except Exception as e:
            print(f"Error processing {root}: {e}")

print("Total recovered:", recovered)
