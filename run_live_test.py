import subprocess
import time
import os
import signal
import sys

def main():
    print("=== Starting AegisAI Admin Server ===")
    env_admin = os.environ.copy()
    env_admin["NODE_ROLE"] = "admin"
    admin_proc = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "backend.main:app", "--port", "8000"],
        env=env_admin,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True
    )

    # Wait for admin to be ready
    admin_ready = False
    start_time = time.time()
    print("Waiting for Admin Server ML models to initialize...")
    
    while time.time() - start_time < 30: # Wait up to 30 seconds
        stdout = admin_proc.stdout
        if stdout is not None:
            line = stdout.readline()
            if line:
                print("[ADMIN]", line.strip())
                if "Application startup complete" in line:
                    admin_ready = True
                    break
        else:
            time.sleep(1)
        
    if not admin_ready:
        print("Admin failed to start in time.")
        admin_proc.terminate()
        return

    print("\n=== Admin Server Ready. Starting Client Agent ===")
    env_client = os.environ.copy()
    env_client["NODE_ROLE"] = "client"
    env_client["ADMIN_URL"] = "http://127.0.0.1:8000"
    env_client["NODE_ID"] = "Test-Target-PC"
    
    client_proc = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "backend.main:app", "--port", "8001"],
        env=env_client,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True
    )

    # Watch interaction for a few seconds
    print("Capturing interaction...")
    end_time = time.time() + 10 # 10 seconds of logs
    
    import select
    
    while time.time() < end_time:
        # Read available lines from both processes (Windows doesn't support select on pipes nicely)
        # So we'll just poll them simply
        pass

    # Read remaining
    print("\n--- Output Complete ---")
    admin_proc.terminate()
    client_proc.terminate()

if __name__ == "__main__":
    main()
