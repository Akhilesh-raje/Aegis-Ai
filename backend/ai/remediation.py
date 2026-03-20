import os
import subprocess
import psutil  # type: ignore
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger("AegisAI-Remediation")

class RemediationController:
    """
    The Sentinel: A safe execution layer for autonomous security mitigations.
    Provides host-level response actions with built-in safety checks and logging.
    """
    
    def __init__(self):
        self.history = []

    def execute_action(self, action_type: str, args: Dict[str, Any]) -> Dict[str, Any]:
        """Dispatch a mitigation action safely."""
        logger.info(f"Executing Mitigation: {action_type} with args: {args}")
        
        result = {"action": action_type, "success": False, "detail": ""}
        
        try:
            if action_type == "terminate_process":
                pid = int(args.get("pid", 0))
                result = self.terminate_process(pid)
            elif action_type == "block_ip":
                ip = args.get("ip_address")
                result = self.block_ip(ip)
            elif action_type == "quarantine_file":
                path = args.get("file_path")
                result = self.quarantine_file(path)
            else:
                result["detail"] = f"Unknown mitigation tool: {action_type}"
        except Exception as e:
            result["detail"] = f"Execution error: {str(e)}"
            logger.error(f"Execution Error: {str(e)}")

        self.history.append(result)
        return result

    def terminate_process(self, pid: int) -> Dict[str, Any]:
        """Safely terminate a suspicious process."""
        if pid <= 0:
            return {"success": False, "detail": "Invalid PID"}
            
        try:
            proc = psutil.Process(pid)
            name = proc.name()
            # Safety check: Don't kill critical system processes (simplified)
            if name.lower() in ["explorer.exe", "svchost.exe", "wininit.exe", "services.exe"]:
                return {"success": False, "detail": f"Protected system process: {name}"}
            
            proc.terminate()
            return {"success": True, "detail": f"Successfully terminated {name} (PID: {pid})"}
        except psutil.NoSuchProcess:
            return {"success": False, "detail": f"Process {pid} no longer exists"}
        except psutil.AccessDenied:
            return {"success": False, "detail": f"Access denied for terminating PID {pid}"}

    def block_ip(self, ip_address: Optional[str]) -> Dict[str, Any]:
        """Create a Windows Firewall rule to block a malicious IP."""
        if not ip_address:
            return {"success": False, "detail": "Invalid IP address"}
            
        rule_name = f"AegisAI_Mitigation_Block_{ip_address.replace('.', '_')}"
        
        # Command: netsh advfirewall firewall add rule name="..." dir=out action=block remoteip=...
        cmd = [
            "netsh", "advfirewall", "firewall", "add", "rule",
            f"name={rule_name}", "dir=out", "action=block",
            f"remoteip={ip_address}"
        ]
        
        try:
            subprocess.run(cmd, check=True, capture_output=True)
            return {"success": True, "detail": f"Created firewall rule to block {ip_address}"}
        except subprocess.CalledProcessError as e:
            return {"success": False, "detail": f"Firewall command failed: {e.stderr.decode()}"}
        except Exception as e:
            return {"success": False, "detail": f"System error during block: {str(e)}"}

    def quarantine_file(self, path: Optional[str]) -> Dict[str, Any]:
        """Mock implementation of file quarantine (to be expanded)."""
        if not path or not os.path.exists(path):
            return {"success": False, "detail": "File not found"}
            
        # For now, just simulated
        return {"success": True, "detail": f"Simulated quarantine of {path} (Sentinel Core)"}

# Singleton instance
sentinel = RemediationController()
