import json
import urllib.request
from datetime import datetime, timezone
import logging

logger = logging.getLogger("aegis.webhook")

class WebhookEngine:
    def __init__(self):
        # In a real app, this would be retrieved from db configurations per tenant
        self.webhook_urls = []

    def add_webhook(self, url):
        if url not in self.webhook_urls:
            self.webhook_urls.append(url)

    def dispatch_alert(self, threat: dict):
        if threat.get("severity") != "critical":
            return
            
        payload = {
            "text": f"🚨 *CRITICAL AEGIX-XDR ALERT* 🚨\n\n*Threat Detected:* {threat.get('explanation', threat.get('threat_type'))}\n*Target IP:* {threat.get('source_ip')}\n*Confidence:* {threat.get('confidence', 0):.2f}%\n*Risk Score Indicator:* {threat.get('anomaly_score', 0):.4f}\n*MITRE:* {threat.get('mitre_id')} - {threat.get('mitre_tactic')}",
            "blocks": [
                {
                    "type": "header",
                    "text": {
                        "type": "plain_text",
                        "text": f"🚨 Critical Alert: {threat.get('threat_type')}",
                        "emoji": True
                    }
                },
                {
                    "type": "section",
                    "fields": [
                        {"type": "mrkdwn", "text": f"*Source IP:*\n{threat.get('source_ip')}"},
                        {"type": "mrkdwn", "text": f"*Confidence:*\n{threat.get('confidence', 0):.2f}%"}
                    ]
                }
            ]
        }
        
        data = json.dumps(payload).encode('utf-8')
        
        for url in self.webhook_urls:
            try:
                req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'})
                with urllib.request.urlopen(req, timeout=5) as response:
                    logger.info(f"[Webhook] Dispatched to {url} - Status: {response.status}")
            except Exception as e:
                logger.error(f"[Webhook] Failed to dispatch to {url}: {e}")
                
        # Simulating external dispatch in console if no webhooks configured
        if not self.webhook_urls:
            print(f"\n[WEBHOOK EMULATOR] Dispatched CRITICAL alert for {threat.get('threat_type')} at {threat.get('source_ip')}\n")

webhook_engine = WebhookEngine()
