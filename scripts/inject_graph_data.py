import urllib.request
import json
import time

events = [
    # 1. Initial Access
    {"event_type": "USER_LOGIN", "source_identity": "admin_svc", "source_node": "corp-web-01", "classification": "observation", "data": {}},
    # 2. Execution
    {"event_type": "PROCESS_SPAWN", "source_identity": "admin_svc", "source_node": "corp-web-01", "classification": "anomaly", "data": {"process": "powershell.exe"}},
    # 3. Network Connection
    {"event_type": "NET_OUTBOUND", "source_identity": "admin_svc", "source_node": "corp-web-01", "classification": "threat", "data": {"remote_ip": "185.23.44.12", "port": 443}},
    # 4. Lateral Movement
    {"event_type": "USER_LOGIN", "source_identity": "admin_svc", "source_node": "db-prod-main", "classification": "threat", "data": {}},
    {"event_type": "NET_OUTBOUND", "source_identity": "admin_svc", "source_node": "db-prod-main", "classification": "critical", "data": {"remote_ip": "185.23.44.12", "port": 443}},
    # 5. Data Exfiltration
    {"event_type": "FILE_ACCESS", "source_identity": "admin_svc", "source_node": "db-prod-main", "classification": "critical", "data": {"file": "customer_db_dump.bak"}},
]

for ev in events:
    data = json.dumps(ev).encode('utf-8')
    req = urllib.request.Request('http://localhost:8000/api/simulate/inject', data=data, headers={'Content-Type':'application/json'})
    try:
        urllib.request.urlopen(req)
        print(f"Injected: {ev['event_type']}")
    except Exception as e:
        print(f"Failed: {e}")
    time.sleep(0.5)
