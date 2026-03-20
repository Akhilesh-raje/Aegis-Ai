"""
AegisAI — Cybersecurity AI Prompt Templates
Structured prompts for the AI reasoning engine.
All context templates, persona definitions, and knowledge seeds.
"""

# ---------------------------------------------------------------------------
# Core System Persona
# ---------------------------------------------------------------------------
SYSTEM_PROMPT = """You are AEGIS — an elite AI cybersecurity analyst embedded in a real-time Security Operations Center (SOC).

Your capabilities:
- Real-time host telemetry analysis (CPU, RAM, network, processes, connections)
- Threat detection via Isolation Forest anomaly detection and Random Forest classification
- MITRE ATT&CK framework mapping
- Network exposure auditing (open ports, listening services)
- Risk scoring and trend analysis
- Attack chain prediction and forensic analysis

Your personality:
- You are precise, confident, and action-oriented
- You speak like a senior SOC analyst briefing a team lead
- You quantify everything: percentages, counts, scores
- You always explain WHY something is a risk, not just WHAT
- You provide specific, actionable recommendations
- You reference MITRE ATT&CK techniques when relevant
- You never use filler phrases like "I think" or "maybe" — you state facts and assessments
- When system is healthy, you confirm with evidence, not just "everything is fine"

Response format:
- Keep responses concise but thorough (3-6 sentences for simple queries, more for complex analysis)
- Use **bold** for critical findings
- Use bullet points for lists of observations or recommendations
- Always end with a concrete next step or recommendation
- Never use emojis or casual language — you are a professional analyst
- **Autonomous Remediation (The Sentinel)**: If you identify a critical, actionable threat (e.g., Ransomware, Brute-force, Malicious Process), you MUST append a structured mitigation command at the end of your analysis.
- **Mitigation Format**: `[MITIGATION: tool_name|{"arg": "value"}]`
- **Available Tools**:
    - `terminate_process|{"pid": 1234}` (Use for malicious executables)
    - `block_ip|{"ip": "1.2.3.4"}` (Use for C2, Brute-force, or Exfiltration)
    - `quarantine_file|{"path": "C:\\temp\\virus.exe"}` (Use for identified malicious payloads)
    - `isolate_host|{}` (Use for lateral movement or widespread infection)"""

# ---------------------------------------------------------------------------
# Live Context Builder Template
# ---------------------------------------------------------------------------
CONTEXT_TEMPLATE = """## LIVE SYSTEM STATE (Real-Time Telemetry Snapshot)

**Host Metrics:**
- CPU Usage: {cpu_usage}%
- RAM Usage: {ram_usage}% ({ram_used_gb}/{ram_total_gb} GB)

**Network Status:**
- Public IP: {public_ip}
- ISP: {isp}
- Location: {location}
- VPN Active: {vpn_active}
- Upload: {upload_mbps} Mbps | Download: {download_mbps} Mbps

**Active Connections:**
{connections_summary}

**Exposed Services (Listening Ports on 0.0.0.0):**
{exposed_ports}

**Top Processes (by CPU):**
{top_processes}

**Security Posture:**
- Security Score: {risk_score}/100 (higher = safer)
- Risk Level: {risk_level}
- Risk Trend: {risk_trend}
- Active Threats: {active_threats} ({threat_trend})
- Mitigated Threats: {mitigated_threats}
- Total Events Processed: {total_events}

**Current Security Observations:**
{observations}

**Recent Threat Detections:**
{recent_threats}
"""

# ---------------------------------------------------------------------------
# Chat Query Template
# ---------------------------------------------------------------------------
CHAT_TEMPLATE = """The analyst is asking you a question about the live security state.
Use ONLY the LIVE SYSTEM STATE below to provide an accurate, evidence-based response.
Do NOT make up data. If something is not in the system state, say it's not available.

{context}

---

**Analyst Query:** {query}

Respond with specific data from the system state above. Be precise and actionable.
If the query is about something not covered in the data, explain what you can see and suggest how to investigate further."""

# ---------------------------------------------------------------------------
# Proactive Advisory Template
# ---------------------------------------------------------------------------
ADVISORY_TEMPLATE = """Based on the current system state, generate a brief (2-3 sentence) security advisory for the SOC dashboard.
Focus on the MOST CRITICAL finding. If the system is healthy, confirm stability with specific evidence.

{context}

Generate a proactive advisory that:
1. States the single most important finding right now (CAUSAL: Explain WHY this matters)
2. Explains the risk level with evidence or confirms safety with metrics
3. Analyzes TEMPORAL TRENDS (e.g., "Risk is spiking +20% since last check")
4. Recommends one specific action

Keep it under 3 sentences. Be direct, authoritative, and data-driven. No filler."""

# ---------------------------------------------------------------------------
# Deep Event Analysis Template
# ---------------------------------------------------------------------------
EVENT_ANALYSIS_TEMPLATE = """Perform a deep Multi-Agent Swarm forensic analysis of this security event.

**Event Details:**
- Type: {event_type}
- Severity: {severity}
- Base Confidence: {confidence}%
- Source IP: {source_ip}
- Anomaly Score: {anomaly_score}
- Description: {explanation}
- MITRE Mapping: {mitre_id} ({mitre_tactic})

**Current System Context:**
{context}

You must debate this event from 3 distinct persona perspectives to reach an absolute consensus.
Structure your response EXACTLY like this:

### 🌐 [NETSEC_ANALYSIS]
(Assume the persona of an elite Network Analyst. Analyze ONLY the network telemetry: ports, IPs, connections, exfiltration, C2 potential.)

### 💻 [ENDPOINT_ANALYSIS]
(Assume the persona of an elite Host Analyst. Analyze ONLY the host telemetry: CPU spikes, RAM usage, spawned processes, system load.)

### 👑 [COMMANDER_DECISION]
(Assume the persona of the SOC Commander. Synthesize both analyses. State your final verdict, list top anomalies, and project the next logical adversary action with a temporal forecast.)
- **Anomalies Detected**: (List specific anomalies found during the debate)
- **PREDICTION**: (e.g., "This pattern will lead to lateral movement via SMB in ~8 minutes")
- **SWARM_CONFIDENCE**: (0.00 to 1.00)
- **SENTINEL COMMAND**: [MITIGATION: tool_name|{{"arg": "value"}}] (Only emit if SWARM_CONFIDENCE >= 0.98)
"""

# ---------------------------------------------------------------------------
# Incident Summary Template
# ---------------------------------------------------------------------------
INCIDENT_SUMMARY_TEMPLATE = """Generate a concise incident summary suitable for an executive briefing.

**Active Incidents:** {incident_count}
**System Score:** {risk_score}/100
**Time Window:** Last {time_window}

**Incident Details:**
{incident_details}

**System Observations:**
{observations}

Format as a structured brief:
1. **Situation** — Current threat landscape (1-2 sentences)
2. **Impact** — What is affected and severity
3. **Response** — Actions taken or recommended
4. **Outlook** — Expected trajectory if actions are/aren't taken
"""

# ---------------------------------------------------------------------------
# Fallback Response Templates (when LLM is unavailable)
# ---------------------------------------------------------------------------
FALLBACK_RESPONSES = {
    "score": "System security posture is currently at **{score}/100** ({verdict}). {top_issue}. Review the Neural Advisor panel for detailed signal breakdown and evidence-based remediation steps.",

    "risk": "Current risk level: **{risk_level}**. {active_threats} active threat(s) detected across the monitoring mesh. {observation_summary}. Navigate to the SOAR Center for available response playbooks and autonomous mitigation options.",

    "network": "Network analysis complete: VPN tunnel is **{vpn_status}**. {exposed_count} exposed service(s) detected on public interfaces. {network_detail}. Recommendation: restrict public bindings via firewall policy or enforce VPN-only ingress rules.",

    "threat": "Threat intelligence: **{active_threats}** active behavioral anomalies flagged by the Neural Core (Isolation Forest + Random Forest ensemble). {threat_detail}. Initialize a forensic audit from the Investigation panel for full attack chain visibility.",

    "cpu": "System resource analysis: CPU at **{cpu_usage}%**, RAM at **{ram_usage}%**. {cpu_detail}. Monitor active process trees for unauthorized high-consumption executables that deviate from the known-good baseline.",

    "process": "Process intelligence: Top consumers — {process_list}. {process_detail}. Cross-reference against the known-good software baseline for behavioral anomaly detection.",

    "port": "Port exposure analysis: {exposed_ports}. {port_detail}. Services bound to 0.0.0.0 are directly accessible from the public internet, significantly expanding the attack surface. Apply firewall restrictions immediately.",

    "help": "AEGIS Neural Core capabilities: I can analyze **risk factors**, **exposed ports**, **CPU/resource anomalies**, **active threats**, **network posture**, **process behavior**, and **security score breakdowns**. Ask me anything about your system's security state.",

    "default": "AEGIS Neural Core — Current posture: **{verdict}** (Score: {score}/100). {summary}. Query me about risk factors, exposed services, resource anomalies, active threats, or network status for real-time, evidence-backed intelligence."
}

# ---------------------------------------------------------------------------
# Cybersecurity Knowledge Seeds (for vector memory pre-population)
# ---------------------------------------------------------------------------
KNOWLEDGE_SEEDS = [
    {
        "id": "ssh_brute_force",
        "pattern": "Multiple failed SSH login attempts from a single IP address targeting port 22. Pattern matches brute-force credential stuffing behavior. Typical indicators include >10 failed attempts per minute from the same source.",
        "category": "credential_attack",
        "mitre": "T1110 - Brute Force",
        "response": "Block source IP at firewall, implement fail2ban or rate limiting on SSH, enforce key-only authentication, consider moving SSH to a non-standard port."
    },
    {
        "id": "rdp_exposure",
        "pattern": "Remote Desktop Protocol (RDP) port 3389 exposed on public interface 0.0.0.0. Direct internet exposure enables credential brute-force attacks, BlueKeep exploit delivery (CVE-2019-0708), and session hijacking.",
        "category": "service_exposure",
        "mitre": "T1021.001 - Remote Services: RDP",
        "response": "Disable public RDP binding immediately, enforce VPN-only access, enable Network Level Authentication (NLA), implement account lockout policies, apply all RDP security patches."
    },
    {
        "id": "port_scan_recon",
        "pattern": "Sequential connection attempts across multiple ports from a single source IP within a short time window. Indicates active network reconnaissance and service enumeration. Often precedes targeted exploitation.",
        "category": "reconnaissance",
        "mitre": "T1046 - Network Service Discovery",
        "response": "Block scanning source IP at perimeter firewall, audit which services responded to probes, close all unnecessary listening ports, implement port knocking for sensitive services."
    },
    {
        "id": "lateral_movement",
        "pattern": "Authenticated connections spreading from a compromised host to other internal network segments. Uses stolen credentials, pass-the-hash, or session token replay. Indicates post-initial-access stage of attack.",
        "category": "lateral_movement",
        "mitre": "T1021 - Remote Services",
        "response": "Immediately isolate compromised host from network, force credential rotation for all affected accounts, implement network segmentation, review authentication logs across all contacted systems."
    },
    {
        "id": "data_exfiltration",
        "pattern": "Anomalous outbound data transfer volume exceeding 3 standard deviations from normal baseline. Large data volumes being transmitted to external IP addresses, often over encrypted channels to avoid content inspection.",
        "category": "exfiltration",
        "mitre": "T1041 - Exfiltration Over C2 Channel",
        "response": "Block destination IP immediately, capture and preserve network traffic for forensic analysis, identify source process and user context, check for data staging directories on the host."
    },
    {
        "id": "privilege_escalation",
        "pattern": "Process executing with SYSTEM or Administrator privileges that does not match known administrative task patterns. May indicate kernel exploit, DLL injection, or credential theft escalation path.",
        "category": "privilege_escalation",
        "mitre": "T1068 - Exploitation for Privilege Escalation",
        "response": "Terminate suspicious elevated process, audit privilege assignments and group memberships, check for newly created admin accounts, review Windows Security event logs for Event ID 4672/4673."
    },
    {
        "id": "crypto_mining",
        "pattern": "Sustained CPU usage above 90% from an unknown or recently installed process. Computation pattern exhibits repetitive hashing operations consistent with cryptocurrency mining (Monero XMR common).",
        "category": "resource_hijacking",
        "mitre": "T1496 - Resource Hijacking",
        "response": "Terminate mining process immediately, identify infection vector (email attachment, drive-by download, supply chain), scan for persistence mechanisms (scheduled tasks, services), block known mining pool domains at DNS level."
    },
    {
        "id": "dns_tunneling",
        "pattern": "Abnormally high DNS query volume with unusually long subdomain labels (>50 chars). Pattern consistent with data exfiltration or C2 communication tunneled through DNS protocol to bypass firewall rules.",
        "category": "exfiltration",
        "mitre": "T1071.004 - Application Layer Protocol: DNS",
        "response": "Enable detailed DNS logging and monitoring, block suspicious domains, implement DNS filtering (Pi-hole, DNSFilter), analyze query payloads for Base64-encoded data exfiltration."
    },
    {
        "id": "vpn_bypass",
        "pattern": "Direct unencrypted internet traffic detected bypassing VPN tunnel. Public IP and traffic metadata exposed to ISP and any intermediate network observers. DNS queries may leak actual browsing destinations.",
        "category": "network_safety",
        "mitre": "T1573 - Encrypted Channel (absence)",
        "response": "Activate VPN kill-switch to prevent traffic leaks, enforce VPN-only routing policy at OS level, enable DNS leak protection, audit split-tunneling configuration."
    },
    {
        "id": "smb_exposure",
        "pattern": "Server Message Block (SMB) port 445 exposed on public interface 0.0.0.0. Internet-facing SMB enables ransomware delivery vectors (WannaCry via EternalBlue MS17-010) and credential relay attacks.",
        "category": "service_exposure",
        "mitre": "T1210 - Exploitation of Remote Services",
        "response": "Block port 445 at perimeter firewall IMMEDIATELY, disable SMBv1 protocol, apply MS17-010 and all subsequent SMB patches, restrict file sharing to internal network segments only."
    },
    {
        "id": "telnet_exposure",
        "pattern": "Telnet service active on port 23 with public interface binding. Telnet transmits all data including credentials in cleartext, trivially intercepted by any network observer via packet sniffing.",
        "category": "service_exposure",
        "mitre": "T1021 - Remote Services",
        "response": "Disable Telnet service immediately, replace with SSH for encrypted remote access, audit any existing Telnet sessions for credential compromise, review authentication logs."
    },
    {
        "id": "anomalous_process",
        "pattern": "Unknown process with no valid digital signature consuming significant system resources. Process name and hash do not match known-good software baseline. Parent process chain may indicate injection or dropper activity.",
        "category": "execution",
        "mitre": "T1059 - Command and Scripting Interpreter",
        "response": "Quarantine the executable, submit hash to VirusTotal and sandbox analysis, trace parent process chain to identify injection point, perform full system scan with updated definitions."
    },
    {
        "id": "ransomware_indicators",
        "pattern": "Rapid file system changes detected with encryption-consistent patterns. Multiple file extensions being modified simultaneously across directory trees. Possible ransom note file creation detected.",
        "category": "impact",
        "mitre": "T1486 - Data Encrypted for Impact",
        "response": "CRITICAL: Immediately disconnect system from ALL networks, do NOT power off or reboot (encryption keys may be in memory), preserve RAM dump for forensic key recovery, activate incident response plan and notify CISO."
    },
    {
        "id": "os_error_burst",
        "pattern": "Abnormally high frequency of OS application errors in Windows Event Log (>5 errors per minute). May indicate failing security services, disk corruption, driver conflicts, or active exploitation disrupting system stability.",
        "category": "system_health",
        "mitre": "T1489 - Service Stop",
        "response": "Review Event Viewer for specific failing services, check security software status (AV, EDR, firewall), verify disk health with chkdsk, run System File Checker (sfc /scannow)."
    },
    {
        "id": "credential_dumping",
        "pattern": "Detected access to credential storage locations (SAM database, LSASS process memory, Windows registry hives). Indicates post-compromise credential harvesting for lateral movement.",
        "category": "credential_access",
        "mitre": "T1003 - OS Credential Dumping",
        "response": "Enable Windows Credential Guard, configure LSA RunAsPPL protection, monitor LSASS access via Sysmon Event ID 10, force immediate rotation of all domain credentials."
    },
    {
        "id": "c2_beacon",
        "pattern": "Regular periodic outbound connections to a single external IP at fixed intervals (beaconing). Pattern indicates Command and Control (C2) communication channel used by implant or RAT.",
        "category": "command_control",
        "mitre": "T1071 - Application Layer Protocol",
        "response": "Block C2 destination IP and domain at firewall and DNS, identify the beacon source process, analyze traffic content for encoded commands, check for persistence mechanisms."
    },
    {
        "id": "http_exposure",
        "pattern": "HTTP server (port 80) exposed on public interface without TLS encryption. Any data transmitted is in cleartext. If hosting admin panels or APIs, credentials can be trivially intercepted.",
        "category": "service_exposure",
        "mitre": "T1071.001 - Web Protocols",
        "response": "Enable HTTPS with valid TLS certificate, redirect HTTP to HTTPS, implement HSTS header, restrict access to sensitive endpoints via authentication and IP whitelist."
    }
]
