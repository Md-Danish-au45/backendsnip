import requests
import time
import random
from datetime import datetime

URL = "http://localhost:3300/api/alarms/firealm"

# Change device IDs as needed
DEVICES = [
    "DEV001",
    "DEV002"
]

def send_alarm(dev_id, smoke, fire):
    payload = {
        "devid": dev_id,
        "smoke": smoke,
        "fire": fire,
        "time": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }

    try:
        res = requests.post(URL, json=payload, timeout=5)
        print(f"[{dev_id}] {res.status_code} -> {res.text}")
    except Exception as e:
        print(f"[{dev_id}] ERROR:", e)

if __name__ == "__main__":
    print("🔥 Fire Alarm Dummy Generator Started")
    print("Press CTRL+C to stop\n")

    while True:
        for dev in DEVICES:
            # Random alarm simulation
            smoke = random.choice([True, False])
            fire = random.choice([True, False])

            # If smoke OR fire happens, push alarm
            if smoke or fire:
                send_alarm(dev, smoke, fire)

        time.sleep(5)  # push every 5 seconds