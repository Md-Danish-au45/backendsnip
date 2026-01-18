import requests
import time
import random
from datetime import datetime, UTC

URL = "https://api.snipcol.com/api/alarms/firealm"

DEVICES = [
    "dev201",
    "dev202"
]

def send_alarm(dev_id):
    payload = {
        "devid": dev_id,  # ⚠️ lowercase 'devid' (important)
        "button": True,
        "time": datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")
    }

    try:
        res = requests.post(
            URL,
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=5
        )
        print(f"[{dev_id}] {res.status_code} -> {res.text}")
    except Exception as e:
        print(f"[{dev_id}] ERROR:", e)

if __name__ == "__main__":
    print("🔥 Fire Alarm Dummy Generator Started")
    print("Press CTRL+C to stop\n")

    while True:
        for dev in DEVICES:
            if random.choice([True, False]):
                send_alarm(dev)

        time.sleep(5)
