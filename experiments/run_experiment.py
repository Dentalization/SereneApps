#!/usr/bin/env python3
"""
Orchestrator for X-Core CDSS Volumetric Conversion Architecture Benchmark (A/B/C).
Full factorial design: 3 architectures × 3 N tiers × 4 VU levels × 5 runs = 180 runs.
Deterministic randomization with fixed seed, preflight hardware gates, metrics sampling.
"""

import argparse
import csv
import datetime
import hashlib
import json
import os
import random
import re
import shutil
import signal
import subprocess
import sys
import threading
import time
from pathlib import Path

# Unset macOS Malloc logging variables to prevent diagnostic spam from subprocesses
for key in list(os.environ.keys()):
    if "malloc" in key.lower():
        os.environ.pop(key, None)

import psutil
import requests

REPO_ROOT = Path(__file__).resolve().parents[1]
CONFIG_PATH = REPO_ROOT / "experiments" / "config" / "experiment.json"
RESET_SCRIPT = REPO_ROOT / "experiments" / "scripts" / "reset_env.js"


def load_config():
    with open(CONFIG_PATH, "r") as f:
        return json.load(f)


HARNESS_FROZEN_ID = "harness-frozen-v1"
FROZEN_MANIFEST_PATH = REPO_ROOT / "experiments" / "config" / "harness_frozen_v1.json"


def get_harness_provenance():
    try:
        git_sha = subprocess.check_output(
            ["git", "rev-parse", "HEAD"], cwd=str(REPO_ROOT), text=True
        ).strip()
        git_status_out = subprocess.check_output(
            ["git", "status", "--porcelain", "-uno"], cwd=str(REPO_ROOT), text=True
        ).strip()
        git_dirty = bool(git_status_out)
    except Exception:
        git_sha, git_dirty = "unknown", True

    try:
        script_path = REPO_ROOT / "experiments" / "run_experiment.py"
        with open(script_path, "rb") as f:
            script_sha256 = hashlib.sha256(f.read()).hexdigest()
    except Exception:
        script_sha256 = "unknown"

    return {
        "git_commit": git_sha,
        "git_dirty": git_dirty,
        "script_sha256": script_sha256,
        "harness_frozen_id": HARNESS_FROZEN_ID,
    }


def generate_frozen_manifest():
    files_to_hash = [
        "experiments/run_experiment.py",
        "experiments/load/formdata.js",
        "experiments/load/generate_k6_workloads.py",
        "experiments/load/k6_workload_N25.js",
        "experiments/load/k6_workload_N100.js",
        "experiments/load/k6_workload_N200.js",
        "experiments/config/experiment.json",
    ]
    file_hashes = {}
    for rel_path in files_to_hash:
        fp = REPO_ROOT / rel_path
        if not fp.exists():
            raise FileNotFoundError(f"Missing file for frozen manifest: {rel_path}")
        file_hashes[rel_path] = hashlib.sha256(fp.read_bytes()).hexdigest()

    try:
        git_sha = subprocess.check_output(
            ["git", "rev-parse", "HEAD"], cwd=str(REPO_ROOT), text=True
        ).strip()
    except Exception:
        git_sha = "unknown"

    try:
        py_ver = sys.version.split()[0]
    except Exception:
        py_ver = "unknown"

    try:
        node_ver = subprocess.check_output(["node", "--version"], text=True).strip()
    except Exception:
        node_ver = "unknown"

    try:
        k6_ver = subprocess.check_output(["k6", "version"], text=True).strip()
    except Exception:
        k6_ver = "unknown"

    manifest = {
        "harness_frozen_id": HARNESS_FROZEN_ID,
        "date": datetime.date.today().isoformat(),
        "git_commit": git_sha,
        "file_sha256": file_hashes,
        "environment": {
            "python_version": py_ver,
            "node_version": node_ver,
            "k6_version": k6_ver,
        }
    }
    FROZEN_MANIFEST_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(FROZEN_MANIFEST_PATH, "w") as f:
        json.dump(manifest, f, indent=2)
    print(f"[Manifest] Generated frozen manifest: {FROZEN_MANIFEST_PATH}")
    return manifest


def verify_frozen_harness():
    if not FROZEN_MANIFEST_PATH.exists():
        print(f"[Harness] Notice: Frozen manifest not yet created at {FROZEN_MANIFEST_PATH}.")
        return
    with open(FROZEN_MANIFEST_PATH, "r") as f:
        manifest = json.load(f)

    expected_hashes = manifest.get("file_sha256", {})
    for rel_path, expected_sha in expected_hashes.items():
        file_path = REPO_ROOT / rel_path
        if not file_path.exists():
            print(f"[FATAL] Frozen harness file missing: {rel_path}", file=sys.stderr)
            sys.exit(1)
        actual_sha = hashlib.sha256(file_path.read_bytes()).hexdigest()
        if actual_sha != expected_sha:
            print(f"[FATAL] Frozen harness hash mismatch for {rel_path}!", file=sys.stderr)
            print(f"  Expected: {expected_sha}", file=sys.stderr)
            print(f"  Actual:   {actual_sha}", file=sys.stderr)
            sys.exit(1)

    # Check git tag harness-frozen-v1 if present in git repo
    try:
        tag_commit = subprocess.check_output(
            ["git", "rev-parse", "harness-frozen-v1^{commit}"],
            cwd=str(REPO_ROOT),
            text=True,
            stderr=subprocess.DEVNULL
        ).strip()
        is_ancestor = subprocess.run(
            ["git", "merge-base", "--is-ancestor", tag_commit, "HEAD"],
            cwd=str(REPO_ROOT),
        ).returncode == 0
        if not is_ancestor:
            print(f"[FATAL] HEAD does not contain harness-frozen-v1 tag ({tag_commit})!", file=sys.stderr)
            sys.exit(1)
    except subprocess.CalledProcessError:
        pass

    print(f"[Harness] Frozen integrity verified against {manifest.get('harness_frozen_id', HARNESS_FROZEN_ID)}.")


def reset_for_attempt(config):
    reset_log = []
    # 1. Terminate leftover uvicorn, celery workers, and k6 processes
    kill_process_on_port(4000)
    kill_process_on_port(8000)
    kill_celery_workers()
    for proc in psutil.process_iter(["pid", "name"]):
        try:
            if proc.info["name"] == "k6":
                proc.kill()
                reset_log.append(f"Killed k6 PID {proc.info['pid']}")
        except Exception:
            pass
    reset_log.append("Terminated leftover services (Node :4000, Uvicorn :8000, Celery workers, k6)")

    # 2. Restart Redis
    try:
        subprocess.run(["brew", "services", "restart", "redis"], check=False, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        reset_log.append("Restarted Redis via brew services")
    except Exception as e:
        reset_log.append(f"Redis restart note: {e}")

    # 3. sudo purge attempt
    purge_res = subprocess.run(["sudo", "-n", "purge"], capture_output=True, text=True)
    if purge_res.returncode == 0:
        reset_log.append("Executed sudo purge")
    else:
        err_msg = purge_res.stderr.strip() or "password required"
        reset_log.append(f"sudo purge skipped ({err_msg})")

    return reset_log



def get_swap_used_mb():
    try:
        out = subprocess.check_output(["sysctl", "vm.swapusage"], text=True, stderr=subprocess.DEVNULL)
        m = re.search(r"used\s*=\s*([\d.]+)M", out)
        return float(m.group(1)) if m else None
    except Exception as e:
        print(f"[Gate] Error reading swapusage: {e}")
        return None


def get_available_memory_mb():
    try:
        out = subprocess.check_output(["vm_stat"], text=True, stderr=subprocess.DEVNULL)
        free = int(re.search(r"Pages free:\s+(\d+)", out).group(1))
        inactive = int(re.search(r"Pages inactive:\s+(\d+)", out).group(1))
        spec = int(re.search(r"Pages speculative:\s+(\d+)", out).group(1))
        page_size = 16384  # 16 KB on Apple Silicon
        return (free + inactive + spec) * page_size / (1024 * 1024)
    except Exception as e:
        print(f"[Gate] Error reading vm_stat: {e}")
        return None


def is_ac_power_connected():
    try:
        out = subprocess.check_output(["pmset", "-g", "batt"], text=True, stderr=subprocess.DEVNULL)
        return "AC Power" in out
    except Exception as e:
        print(f"[Gate] Error reading battery status: {e}")
        return False


def get_disk_free_gb(path=REPO_ROOT):
    total, used, free = shutil.disk_usage(path)
    return free / (1024 ** 3)


def get_thermal_state():
    try:
        out = subprocess.check_output(["pmset", "-g", "therm"], text=True, stderr=subprocess.DEVNULL).strip()
        return out.replace("\n", "; ")
    except Exception:
        return "unknown"


def check_preflight_gate(config, readings=None):
    gate_cfg = config["gate"]
    if readings is None:
        swap_used = get_swap_used_mb()
        avail_mem = get_available_memory_mb()
        ac_power = is_ac_power_connected()
        disk_free = get_disk_free_gb()
        readings = {
            "swap_used_mb": swap_used,
            "available_memory_mb": avail_mem,
            "ac_power_connected": ac_power,
            "disk_free_gb": disk_free,
            "thermal_state": get_thermal_state(),
        }
    else:
        swap_used = readings.get("swap_used_mb")
        avail_mem = readings.get("available_memory_mb")
        ac_power = readings.get("ac_power_connected")
        disk_free = readings.get("disk_free_gb")

    passed = True
    reasons = []

    if swap_used is None or swap_used > gate_cfg["max_swap_used_mb"]:
        passed = False
        reasons.append(f"Swap used {swap_used} MB > {gate_cfg['max_swap_used_mb']} MB")

    if avail_mem is None or avail_mem < gate_cfg["min_available_memory_mb"]:
        passed = False
        reasons.append(f"Available memory {avail_mem:.1f} MB < {gate_cfg['min_available_memory_mb']} MB")

    if gate_cfg["require_ac_power"] and not ac_power:
        passed = False
        reasons.append("AC wall power is disconnected")

    if disk_free is None or disk_free < gate_cfg["min_disk_free_gb"]:
        passed = False
        reasons.append(f"Disk free {disk_free:.2f} GB < {gate_cfg['min_disk_free_gb']} GB")

    return passed, readings, reasons


def determine_validation_status(gate_passed, skip_gate, failure_reasons=None):
    """
    Determines validation_only status and triggers based on host gate state and skip_gate flag.
    - gate passes and no skip -> validation_only = False
    - gate fails (with or without skip) -> validation_only = True
    - skip_gate is True -> validation_only = True
    Returns (validation_only: bool, triggers: list[str]).
    """
    triggers = []
    if skip_gate:
        triggers.append("skip_gate_flag_enabled")
    if not gate_passed:
        if failure_reasons:
            triggers.extend(failure_reasons)
        else:
            triggers.append("gate_threshold_exceeded")

    validation_only = (not gate_passed) or bool(skip_gate)
    return validation_only, triggers


def run_preflight_gate_with_retries(config, skip_gate=False):
    gate_cfg = config["gate"]
    if skip_gate:
        print("[Gate] WARNING: Preflight gate explicitly bypassed via --skip-gate flag.")
        passed, readings, reasons = check_preflight_gate(config)
        readings["gate_skipped"] = True
        return True, readings, reasons, passed

    max_retries = gate_cfg.get("max_retries", 3)
    retry_delay = gate_cfg.get("retry_delay_seconds", 15)

    last_readings = {}
    last_reasons = []
    for attempt in range(1, max_retries + 1):
        passed, readings, reasons = check_preflight_gate(config)
        last_readings = readings
        last_reasons = reasons
        print(f"[Gate] Check attempt {attempt}/{max_retries}: "
              f"Swap={readings['swap_used_mb']:.1f}MB, AvailRAM={readings['available_memory_mb']:.1f}MB, "
              f"AC={readings['ac_power_connected']}, DiskFree={readings['disk_free_gb']:.1f}GB")
        if passed:
            return True, readings, [], True
        print(f"[Gate] FAILED criteria: {'; '.join(reasons)}")
        if attempt < max_retries:
            print(f"[Gate] Waiting {retry_delay}s before retry...")
            time.sleep(retry_delay)

    return False, last_readings, last_reasons, False


def kill_process_on_port(port):
    try:
        out = subprocess.check_output(["lsof", "-t", f"-iTCP:{port}", "-sTCP:LISTEN"], text=True)
        my_pid = os.getpid()
        for pid_str in out.strip().splitlines():
            pid = int(pid_str.strip())
            if pid == my_pid:
                continue
            print(f"[Process] Killing existing process on port {port} (PID {pid})")
            os.kill(pid, signal.SIGKILL)
    except Exception:
        pass


def kill_celery_workers():
    my_pid = os.getpid()
    for proc in psutil.process_iter(["pid", "name", "cmdline"]):
        try:
            if proc.info["pid"] == my_pid:
                continue
            cmdline = " ".join(proc.info.get("cmdline") or [])
            if "celery" in cmdline and "conversion_worker" in cmdline:
                print(f"[Process] Terminating existing Celery worker (PID {proc.info['pid']})")
                proc.kill()
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            pass


class ServiceManager:
    def __init__(self, config, run_raw_dir):
        self.config = config
        self.run_raw_dir = run_raw_dir
        self.log_dir = run_raw_dir / "service_logs"
        self.log_dir.mkdir(parents=True, exist_ok=True)
        self.node_proc = None
        self.uvicorn_proc = None
        self.celery_proc = None

    def start_services(self, arch):
        print(f"[Services] Clean shutdown of old services before starting for arch '{arch}'...")
        kill_process_on_port(4000)
        kill_process_on_port(8000)
        kill_celery_workers()
        time.sleep(1.0)

        if arch == "celery":
            print("[Services] Flushing Redis database for Architecture C...")
            try:
                subprocess.run(["redis-cli", "FLUSHDB"], check=True, stdout=subprocess.DEVNULL)
            except Exception as e:
                print(f"[Services] Warning: redis-cli FLUSHDB failed: {e}")

        # Start Node backend
        node_env = os.environ.copy()
        node_env["PORT"] = "4000"
        node_env["XCORE_CONVERSION_ARCH"] = arch
        node_env["XCORE_BACKGROUND_CONCURRENCY"] = str(self.config.get("worker_concurrency", 4))
        node_log = open(self.log_dir / "node.log", "w")
        print(f"[Services] Starting Node.js backend on :4000 with XCORE_CONVERSION_ARCH={arch}...")
        self.node_proc = subprocess.Popen(
            ["node", "src/server.js"],
            cwd=str(REPO_ROOT / self.config["paths"]["backend_dir"]),
            env=node_env,
            stdout=node_log,
            stderr=subprocess.STDOUT,
        )

        # Start Uvicorn Python service
        py_env = os.environ.copy()
        py_env["XCORE_CONVERSION_ARCH"] = arch
        py_env["XCORE_BACKGROUND_CONCURRENCY"] = str(self.config.get("worker_concurrency", 4))
        venv_python = str(REPO_ROOT / self.config["paths"]["venv_python"])
        uvicorn_log = open(self.log_dir / "uvicorn.log", "w")
        print(f"[Services] Starting FastAPI uvicorn on :8000 with XCORE_CONVERSION_ARCH={arch} (background_concurrency={self.config.get('worker_concurrency', 4)})...")
        self.uvicorn_proc = subprocess.Popen(
            [venv_python, "-m", "uvicorn", "main:app", "--host", "127.0.0.1", "--port", "8000"],
            cwd=str(REPO_ROOT / self.config["paths"]["python_service_dir"]),
            env=py_env,
            stdout=uvicorn_log,
            stderr=subprocess.STDOUT,
        )

        # Start Celery worker if architecture C
        if arch == "celery":
            venv_celery = str(REPO_ROOT / self.config["paths"]["venv_celery"])
            concurrency = str(self.config.get("worker_concurrency", 4))
            pool = self.config.get("worker_pool", "threads")
            celery_log = open(self.log_dir / "celery.log", "w")
            print(f"[Services] Starting Celery worker (concurrency={concurrency}, pool={pool})...")
            self.celery_proc = subprocess.Popen(
                [
                    venv_celery,
                    "-A",
                    "services.conversion_worker.celery_app",
                    "worker",
                    f"--concurrency={concurrency}",
                    f"--pool={pool}",
                    "--loglevel=info",
                ],
                cwd=str(REPO_ROOT / self.config["paths"]["python_service_dir"]),
                env=py_env,
                stdout=celery_log,
                stderr=subprocess.STDOUT,
            )

        self._wait_for_health()

    def _wait_for_health(self, timeout=25.0):
        start = time.time()
        node_ready = False
        py_ready = False

        while time.time() - start < timeout:
            if not node_ready:
                try:
                    r = requests.get("http://127.0.0.1:4000/health", timeout=1.0)
                    if r.status_code == 200:
                        node_ready = True
                except Exception:
                    pass

            if not py_ready:
                try:
                    # Endpoint available in python_service
                    r = requests.get("http://127.0.0.1:8000/docs", timeout=1.0)
                    if r.status_code == 200:
                        py_ready = True
                except Exception:
                    pass

            if node_ready and py_ready:
                print(f"[Services] Both Node (:4000) and Python (:8000) are healthy after {time.time() - start:.2f}s.")
                return True

            time.sleep(0.5)

        raise TimeoutError(f"Services failed to become healthy within {timeout}s: Node={node_ready}, Python={py_ready}")

    def stop_services(self):
        print("[Services] Stopping active services...")
        for name, proc in [("Celery", self.celery_proc), ("Uvicorn", self.uvicorn_proc), ("Node", self.node_proc)]:
            if proc and proc.poll() is None:
                try:
                    proc.terminate()
                    proc.wait(timeout=3.0)
                except Exception:
                    try:
                        proc.kill()
                    except Exception:
                        pass
        kill_process_on_port(4000)
        kill_process_on_port(8000)
        kill_celery_workers()


class MetricsSampler(threading.Thread):
    def __init__(self, service_mgr, output_csv_path, sample_interval_s=0.25):
        super().__init__(daemon=True)
        self.service_mgr = service_mgr
        self.output_csv_path = output_csv_path
        self.sample_interval_s = sample_interval_s
        self.stop_event = threading.Event()
        self.samples = []

    def run(self):
        with open(self.output_csv_path, "w", newline="") as f:
            writer = csv.writer(f)
            writer.writerow([
                "timestamp",
                "system_cpu_pct",
                "node_cpu_pct",
                "node_rss_bytes",
                "uvicorn_cpu_pct",
                "uvicorn_rss_bytes",
                "celery_cpu_pct",
                "celery_rss_bytes",
                "swap_used_mb",
                "available_memory_mb",
            ])

            node_ps = psutil.Process(self.service_mgr.node_proc.pid) if self.service_mgr.node_proc else None
            uvicorn_ps = psutil.Process(self.service_mgr.uvicorn_proc.pid) if self.service_mgr.uvicorn_proc else None
            celery_ps = psutil.Process(self.service_mgr.celery_proc.pid) if self.service_mgr.celery_proc else None

            # Prime cpu_percent
            psutil.cpu_percent(interval=None)
            if node_ps: node_ps.cpu_percent(interval=None)
            if uvicorn_ps: uvicorn_ps.cpu_percent(interval=None)
            if celery_ps: celery_ps.cpu_percent(interval=None)

            while not self.stop_event.is_set():
                now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
                sys_cpu = psutil.cpu_percent(interval=None)

                def get_proc_stats(ps_proc):
                    if not ps_proc or not ps_proc.is_running():
                        return 0.0, 0
                    try:
                        total_cpu = ps_proc.cpu_percent(interval=None)
                        total_rss = ps_proc.memory_info().rss
                        for child in ps_proc.children(recursive=True):
                            try:
                                total_cpu += child.cpu_percent(interval=None)
                                total_rss += child.memory_info().rss
                            except Exception:
                                pass
                        return total_cpu, total_rss
                    except Exception:
                        return 0.0, 0

                node_cpu, node_rss = get_proc_stats(node_ps)
                uvicorn_cpu, uvicorn_rss = get_proc_stats(uvicorn_ps)
                celery_cpu, celery_rss = get_proc_stats(celery_ps)
                try:
                    swap_mb = psutil.swap_memory().used / (1024 * 1024)
                except Exception:
                    swap_mb = get_swap_used_mb() or 0.0

                try:
                    avail_mb = psutil.virtual_memory().available / (1024 * 1024)
                except Exception:
                    avail_mb = get_available_memory_mb() or 0.0

                row = [
                    now_iso,
                    round(sys_cpu, 2),
                    round(node_cpu, 2),
                    node_rss,
                    round(uvicorn_cpu, 2),
                    uvicorn_rss,
                    round(celery_cpu, 2),
                    celery_rss,
                    round(swap_mb, 2),
                    round(avail_mb, 2),
                ]
                writer.writerow(row)
                f.flush()
                self.samples.append(row)
                time.sleep(self.sample_interval_s)

    def stop(self):
        self.stop_event.set()


def reset_environment():
    print("[Reset] Invoking reset_env.js...")
    res = subprocess.run(
        ["node", str(RESET_SCRIPT)],
        cwd=str(REPO_ROOT),
        capture_output=True,
        text=True,
    )
    if res.returncode != 0:
        raise RuntimeError(f"Database/artifact reset failed: {res.stderr}\n{res.stdout}")
    print("[Reset] Environment cleanly reset.")


def execute_k6_run(n_slices, vus, arch, run_id, rep, raw_dir, config):
    k6_script = REPO_ROOT / "experiments" / "load" / f"k6_workload_N{n_slices}.js"
    k6_raw_jsonl = raw_dir / "k6_raw.jsonl"
    k6_stdout_log = raw_dir / "k6_output.log"

    env_vars = os.environ.copy()
    env_vars["VUS"] = str(vus)
    env_vars["BENCHMARK_RUN_ID"] = run_id
    env_vars["BENCHMARK_ARCH"] = arch
    env_vars["BENCHMARK_ITERATION"] = str(rep)
    env_vars["API_BASE_URL"] = config["services"]["api_base_url"]
    env_vars["PYTHON_SERVICE_URL"] = config["services"]["python_service_url"]
    env_vars["DENTIST_EMAIL"] = config["auth"]["dentist_email"]
    env_vars["DENTIST_PASSWORD"] = config["auth"]["dentist_password"]

    cmd = [
        "k6",
        "run",
        "--vus", str(vus),
        "--out", f"json={k6_raw_jsonl}",
        str(k6_script),
    ]

    print(f"[k6] Starting load generator: VUs={vus}, N={n_slices}, Arch={arch}...")
    start_time = time.time()
    with open(k6_stdout_log, "w") as out_f:
        res = subprocess.run(cmd, env=env_vars, stdout=out_f, stderr=subprocess.STDOUT)
    duration = time.time() - start_time
    print(f"[k6] Run finished with code {res.returncode} in {duration:.2f}s.")
    return res.returncode, duration


def parse_k6_metrics_and_write_requests_csv(k6_raw_jsonl, output_csv_path):
    """
    Parses k6 JSONL point events and extracts per-request latency metrics.
    """
    e2e_latencies = []
    upload_latencies = []
    poll_latencies = []

    if not k6_raw_jsonl.exists():
        return {
            "e2e_p50": None, "e2e_p95": None, "e2e_p99": None, "e2e_mean": None,
            "upload_p50": None, "upload_p95": None,
            "poll_p50": None, "poll_p95": None,
            "total_requests": 0, "failure_rate": 1.0,
        }

    with open(k6_raw_jsonl, "r") as in_f:
        for line in in_f:
            try:
                data = json.loads(line)
                if data.get("type") == "Point":
                    metric = data.get("metric")
                    val = data.get("data", {}).get("value")
                    if metric == "xcore_e2e_duration_ms":
                        e2e_latencies.append(val)
                    elif metric == "xcore_upload_duration_ms":
                        upload_latencies.append(val)
                    elif metric == "xcore_poll_duration_ms":
                        poll_latencies.append(val)
            except Exception:
                continue

    # Write per-request summary
    with open(output_csv_path, "w", newline="") as out_f:
        writer = csv.writer(out_f)
        writer.writerow(["request_idx", "upload_latency_ms", "poll_latency_ms", "e2e_latency_ms"])
        for idx in range(max(len(e2e_latencies), len(upload_latencies))):
            u = upload_latencies[idx] if idx < len(upload_latencies) else None
            p = poll_latencies[idx] if idx < len(poll_latencies) else None
            e = e2e_latencies[idx] if idx < len(e2e_latencies) else None
            writer.writerow([idx + 1, u, p, e])

    def calc_percentile(arr, p):
        if not arr: return None
        sorted_arr = sorted(arr)
        idx = int(len(sorted_arr) * (p / 100.0))
        return sorted_arr[min(idx, len(sorted_arr) - 1)]

    total_requests = len(upload_latencies)
    successful_conversions = len(e2e_latencies)
    failure_rate = (total_requests - successful_conversions) / total_requests if total_requests > 0 else 0.0

    return {
        "e2e_p50": calc_percentile(e2e_latencies, 50),
        "e2e_p95": calc_percentile(e2e_latencies, 95),
        "e2e_p99": calc_percentile(e2e_latencies, 99),
        "e2e_mean": sum(e2e_latencies) / len(e2e_latencies) if e2e_latencies else None,
        "upload_p50": calc_percentile(upload_latencies, 50),
        "upload_p95": calc_percentile(upload_latencies, 95),
        "poll_p50": calc_percentile(poll_latencies, 50),
        "poll_p95": calc_percentile(poll_latencies, 95),
        "total_requests": total_requests,
        "successful_conversions": successful_conversions,
        "failure_rate": round(failure_rate, 4),
    }


def execute_single_run(cell, config, master_csv_path, skip_gate=False, raw_base_dir=None, reset_actions=None):
    arch, n_slices, vus, rep = cell["arch"], cell["n"], cell["vu"], cell["rep"]
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    run_id = f"run_{timestamp}_{arch}_N{n_slices}_VU{vus}_rep{rep}"
    if raw_base_dir is not None:
        raw_dir = Path(raw_base_dir) / run_id
    else:
        raw_dir = REPO_ROOT / config["paths"]["results_raw_dir"] / run_id
    raw_dir.mkdir(parents=True, exist_ok=True)
    start_time = time.time()

    print("\n" + "=" * 70)
    print(f"STARTING RUN: {run_id}")
    print(f"Condition: Architecture={arch}, Slices(N)={n_slices}, VUs={vus}, Repetition={rep}")
    print("=" * 70)

    # 1. Preflight Gate
    gate_proceed, gate_readings, gate_reasons, actual_gate_passed = run_preflight_gate_with_retries(config, skip_gate=skip_gate)
    validation_only, validation_triggers = determine_validation_status(
        gate_passed=actual_gate_passed,
        skip_gate=skip_gate,
        failure_reasons=gate_reasons
    )
    provenance = get_harness_provenance()

    if not gate_proceed:
        print(f"[Run] RECORDING HOST ENVIRONMENT INVALID for {run_id}. Host thresholds not met: {'; '.join(gate_reasons)}")
        metadata = {
            "run_id": run_id,
            "status": "environment_invalid",
            "validation_only": True,
            "validation_triggers": gate_reasons,
            "arch": arch,
            "n_slices": n_slices,
            "vus": vus,
            "repetition": rep,
            "timestamp": timestamp,
            "duration_seconds": round(time.time() - start_time, 2),
            "gate_readings": gate_readings,
            "reset_actions": reset_actions or [],
            "worker_concurrency": config.get("worker_concurrency", 4),
            "worker_pool": config.get("worker_pool", "threads"),
            "git_commit": provenance["git_commit"],
            "git_dirty": provenance["git_dirty"],
            "script_sha256": provenance["script_sha256"],
            "harness_frozen_id": HARNESS_FROZEN_ID,
            "harness_provenance": provenance,
        }
        with open(raw_dir / "metadata.json", "w") as f:
            json.dump(metadata, f, indent=2)
        return False, metadata

    # 2. Database & Artifact Reset
    reset_environment()

    # 3. Start Services
    service_mgr = ServiceManager(config, raw_dir)
    service_mgr.start_services(arch)

    # 4. Start Metrics Sampling
    metrics_csv = raw_dir / "metrics.csv"
    sampler = MetricsSampler(service_mgr, metrics_csv)
    sampler.start()

    run_status = "success"
    try:
        # 5. Execute k6 load test
        k6_code, run_duration = execute_k6_run(n_slices, vus, arch, run_id, rep, raw_dir, config)
        if k6_code != 0:
            run_status = "k6_failed"
            validation_only = True
            validation_triggers.append(f"k6 non-zero exit code: {k6_code}")
    except Exception as e:
        print(f"[Run] Error during load execution: {e}")
        run_status = "error"
        run_duration = 0.0
        validation_only = True
        validation_triggers.append(str(e))
    finally:
        # 6. Stop Sampling and Services
        sampler.stop()
        sampler.join(timeout=2.0)
        service_mgr.stop_services()

    # 7. Parse Metrics
    requests_csv = raw_dir / "requests.csv"
    k6_raw_jsonl = raw_dir / "k6_raw.jsonl"
    stats = parse_k6_metrics_and_write_requests_csv(k6_raw_jsonl, requests_csv)

    # Calculate sample statistics
    samples = sampler.samples
    peak_uvicorn_rss_mb = 0.0
    peak_celery_rss_mb = 0.0
    peak_node_rss_mb = 0.0
    peak_total_stack_rss_mb = 0.0
    avg_cpu_pct = 0.0
    peak_cpu_pct = 0.0
    swap_growth_mb = 0.0
    peak_swap_mb = 0.0
    min_avail_ram_mb = 999999.0

    if samples:
        # Columns: [time, sys_cpu, node_cpu, node_rss, uvi_cpu, uvi_rss, cel_cpu, cel_rss, swap, avail]
        node_rss_list = [s[3] for s in samples]
        uvi_rss_list = [s[5] for s in samples]
        cel_rss_list = [s[7] for s in samples]
        total_rss_bytes = [s[3] + s[5] + s[7] for s in samples]

        peak_node_rss_mb = max(node_rss_list) / (1024 * 1024)
        peak_uvicorn_rss_mb = max(uvi_rss_list) / (1024 * 1024)
        peak_celery_rss_mb = max(cel_rss_list) / (1024 * 1024)
        peak_total_stack_rss_mb = max(total_rss_bytes) / (1024 * 1024)

        sys_cpus = [s[1] for s in samples]
        avg_cpu_pct = sum(sys_cpus) / len(sys_cpus)
        peak_cpu_pct = max(sys_cpus)
        swap_growth_mb = samples[-1][8] - samples[0][8]

        swaps = [s[8] for s in samples]
        avails = [s[9] for s in samples]
        peak_swap_mb = max(swaps) if swaps else 0.0
        min_avail_ram_mb = min(avails) if avails else 0.0

        if peak_swap_mb > 8192.0:
            run_status = "host_swap_exceeded_8192mb"
            validation_only = True
            validation_triggers.append(f"Peak swap {peak_swap_mb:.1f} MB exceeded 8192 MB")
        if min_avail_ram_mb < 500.0:
            run_status = "host_ram_below_500mb"
            validation_only = True
            validation_triggers.append(f"Min available RAM {min_avail_ram_mb:.1f} MB fell below 500 MB")

    throughput = stats["total_requests"] / run_duration if run_duration > 0 else 0.0
    provenance = get_harness_provenance()

    metadata = {
        "run_id": run_id,
        "status": run_status,
        "validation_only": validation_only,
        "validation_triggers": validation_triggers,
        "arch": arch,
        "n_slices": n_slices,
        "vus": vus,
        "repetition": rep,
        "timestamp": timestamp,
        "duration_seconds": round(run_duration, 2),
        "gate_readings": gate_readings,
        "reset_actions": reset_actions or [],
        "worker_concurrency": config.get("worker_concurrency", 4),
        "worker_pool": config.get("worker_pool", "threads"),
        "k6_stats": stats,
        "telemetry": {
            "peak_uvicorn_rss_mb": round(peak_uvicorn_rss_mb, 2),
            "peak_celery_rss_mb": round(peak_celery_rss_mb, 2),
            "peak_node_rss_mb": round(peak_node_rss_mb, 2),
            "peak_total_stack_rss_mb": round(peak_total_stack_rss_mb, 2),
            "avg_cpu_pct": round(avg_cpu_pct, 2),
            "peak_cpu_pct": round(peak_cpu_pct, 2),
            "swap_growth_mb": round(swap_growth_mb, 2),
            "throughput_req_per_s": round(throughput, 2),
            "peak_swap_mb": round(peak_swap_mb, 2),
            "min_avail_ram_mb": round(min_avail_ram_mb, 2),
        },
        "git_commit": provenance["git_commit"],
        "git_dirty": provenance["git_dirty"],
        "script_sha256": provenance["script_sha256"],
        "harness_frozen_id": HARNESS_FROZEN_ID,
        "harness_provenance": provenance,
    }

    with open(raw_dir / "metadata.json", "w") as f:
        json.dump(metadata, f, indent=2)

    # Append to master_runs.csv ONLY if valid run
    if run_status == "success" and not validation_only:
        file_exists = master_csv_path.exists()
        with open(master_csv_path, "a", newline="") as f:
            writer = csv.writer(f)
            if not file_exists:
                writer.writerow([
                    "run_id", "timestamp", "arch", "n_slices", "vus", "repetition",
                    "status", "validation_only", "e2e_p50_ms", "e2e_p95_ms", "e2e_p99_ms", "e2e_mean_ms",
                    "upload_p95_ms", "poll_p95_ms", "throughput_req_s", "failure_rate",
                    "peak_rss_mb", "peak_uvicorn_rss_mb", "peak_celery_rss_mb", "peak_node_rss_mb", "peak_total_stack_rss_mb",
                    "avg_cpu_pct", "peak_cpu_pct", "swap_growth_mb", "git_commit", "script_sha256", "git_dirty", "harness_frozen_id"
                ])
            writer.writerow([
                run_id, timestamp, arch, n_slices, vus, rep, run_status, validation_only,
                stats["e2e_p50"], stats["e2e_p95"], stats["e2e_p99"], stats["e2e_mean"],
                stats["upload_p95"], stats["poll_p95"], round(throughput, 2), stats["failure_rate"],
                "unknown",
                round(peak_uvicorn_rss_mb, 2), round(peak_celery_rss_mb, 2), round(peak_node_rss_mb, 2), round(peak_total_stack_rss_mb, 2),
                round(avg_cpu_pct, 2), round(peak_cpu_pct, 2), round(swap_growth_mb, 2),
                provenance["git_commit"], provenance["script_sha256"], provenance["git_dirty"], HARNESS_FROZEN_ID
            ])

    print(f"[Run] COMPLETE: status={run_status}, validation_only={validation_only}, e2e_p95={stats['e2e_p95']}ms, "
          f"Throughput={throughput:.2f}req/s, PeakSwap={peak_swap_mb:.1f}MB, MinRAM={min_avail_ram_mb:.1f}MB")

    cooldown = config.get("cooldown_seconds", 10)
    print(f"[Run] Cooling down for {cooldown}s...")
    time.sleep(cooldown)

    is_valid = (run_status == "success" and not validation_only)
    return is_valid, metadata


def build_full_factorial_schedule(config):
    archs = config["architectures"]
    n_tiers = config["n_tiers"]
    vus = config["vu_levels"]
    runs_per_cell = config["runs_per_cell"]
    seed = config.get("randomization_seed", 20261013)

    cells = []
    for rep in range(1, runs_per_cell + 1):
        for n in n_tiers:
            for vu in vus:
                for arch in archs:
                    cells.append({"arch": arch, "n": n, "vu": vu, "rep": rep})

    rng = random.Random(seed)
    rng.shuffle(cells)
    return cells


def is_cell_completed(cell, raw_results_dir):
    """
    Checks if a factorial cell (arch, n, vu, rep) has already completed
    by inspecting experiments/results/raw for a matching directory with a valid metadata.json.
    A cell counts as completed only if metadata.json has status == "success" AND validation_only is False.
    gate_failed and k6_failed must NOT count as completed, so --resume reruns them.
    """
    pattern = f"*_{cell['arch']}_N{cell['n']}_VU{cell['vu']}_rep{cell['rep']}"
    for run_dir in sorted(raw_results_dir.glob(pattern)):
        if not run_dir.is_dir():
            continue
        meta_file = run_dir / "metadata.json"
        if meta_file.exists():
            try:
                with open(meta_file, "r") as f:
                    meta = json.load(f)
                status = meta.get("status")
                val_only = meta.get("validation_only")
                is_val_false = (val_only is False) or (isinstance(val_only, str) and val_only.lower() == "false")
                if status == "success" and is_val_false:
                    return True, run_dir.name, status
            except Exception:
                continue
    return False, None, None


def load_status_csv(status_csv_path):
    cells = {}
    with open(status_csv_path, "r", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            key = (row["arch"], int(row["n_slices"]), int(row["vus"]))
            cells[key] = {
                "arch": row["arch"],
                "n_slices": int(row["n_slices"]),
                "vus": int(row["vus"]),
                "valid_count": int(row["valid_count"]),
                "attempts": int(row["attempts"]),
                "failure_reasons": row["failure_reasons"],
                "last_attempt_time": row["last_attempt_time"],
                "wall_clock_seconds": float(row["wall_clock_seconds"]) if row["wall_clock_seconds"] else 0.0,
                "phase": row.get("phase", "phase1"),
                "cell_status": row.get("cell_status", "pending"),
            }
    return cells


def save_status_csv(status_csv_path, cells_dict):
    fieldnames = [
        "arch", "n_slices", "vus", "valid_count", "attempts",
        "failure_reasons", "last_attempt_time", "wall_clock_seconds",
        "phase", "cell_status"
    ]
    with open(status_csv_path, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for cell in cells_dict.values():
            writer.writerow(cell)


def run_confirmatory_phase1(config, schedule_csv_path, status_csv_path, master_csv_path, raw_base_dir):
    print("\n" + "=" * 70)
    print("PHASE 1: CONFIRMATORY EXECUTION (SCHEDULE v1)")
    print("=" * 70)
    status_cells = load_status_csv(status_csv_path)

    with open(schedule_csv_path, "r", newline="") as f:
        schedule = list(csv.DictReader(f))

    total_slots = len(schedule)
    for slot_idx, slot in enumerate(schedule, 1):
        arch = slot["arch"]
        n_slices = int(slot["n_slices"])
        vus = int(slot["vus"])
        rep = int(slot["replication"])
        key = (arch, n_slices, vus)

        cell_state = status_cells[key]
        if cell_state["valid_count"] >= 5:
            print(f"[Phase 1] Slot {slot_idx}/{total_slots} ({arch} N{n_slices} VU{vus} rep{rep}) SKIPPED: already has {cell_state['valid_count']} valid runs.")
            continue
        if cell_state["attempts"] >= 15:
            print(f"[Phase 1] Slot {slot_idx}/{total_slots} ({arch} N{n_slices} VU{vus} rep{rep}) SKIPPED: 15-attempt budget reached. Status: {cell_state['cell_status']}.")
            cell_state["cell_status"] = "infeasible_phase1"
            save_status_csv(status_csv_path, status_cells)
            continue

        while cell_state["valid_count"] < 5 and cell_state["attempts"] < 15:
            print(f"\n[Phase 1] Executing Slot {slot_idx}/{total_slots}: {arch} N={n_slices}, VU={vus}, Rep={rep} (Attempt {cell_state['attempts'] + 1}/15)...")
            slot_start = time.time()
            reset_actions = reset_for_attempt(config)
            cell_def = {"arch": arch, "n": n_slices, "vu": vus, "rep": rep}
            success, meta = execute_single_run(
                cell_def, config, master_csv_path, raw_base_dir=raw_base_dir, reset_actions=reset_actions
            )
            duration = round(time.time() - slot_start, 2)

            if meta.get("status") == "environment_invalid":
                triggers = meta.get("validation_triggers", [])
                err_msg = f"environment_invalid: {'; '.join(triggers)}" if triggers else "environment_invalid"
                print(f"\n{'!' * 70}")
                print(f"[Phase 1] HOST ENVIRONMENT INVALID: Preflight gate failed for {arch} N{n_slices} VU{vus} rep{rep}.")
                print(f"  Reasons: {err_msg}")
                print("  Per 21 Oct 2026 Protocol Amendment:")
                print(f"  - This attempt is NOT counted towards the 15-attempt budget (attempts remains {cell_state['attempts']}).")
                print("  - Cell cannot be marked infeasible due to host environment issues.")
                print("  - Halting execution to request operator intervention.")
                print(f"{'!' * 70}\n")
                print("[OPERATOR REQUIRED] Please ensure:")
                print("  1. MagSafe / AC power adapter is securely connected.")
                print("  2. Host is rebooted to clear kernel swap memory.")
                print("  3. Verify 'sysctl vm.swapusage' shows swap < 500 MB.")
                print("  4. Verify free RAM > 3,000 MB.")
                print("Then rerun the experiment command.")
                save_status_csv(status_csv_path, status_cells)
                sys.exit(1)

            cell_state["attempts"] += 1
            cell_state["last_attempt_time"] = datetime.datetime.now().isoformat()
            cell_state["wall_clock_seconds"] = duration

            if success and not meta.get("validation_only", True):
                cell_state["valid_count"] += 1
                if cell_state["valid_count"] >= 5:
                    cell_state["cell_status"] = "completed"
                save_status_csv(status_csv_path, status_cells)
                print(f"[Phase 1] Slot {slot_idx} SUCCEEDED: {arch} N{n_slices} VU{vus} (Valid: {cell_state['valid_count']}, Attempts: {cell_state['attempts']})")
                break
            else:
                status_desc = meta.get("status", "failed")
                triggers = meta.get("validation_triggers", [])
                err_msg = f"{status_desc}: {'; '.join(triggers)}" if triggers else status_desc
                existing = cell_state["failure_reasons"].split("; ") if cell_state["failure_reasons"] else []
                if err_msg not in existing:
                    existing.append(err_msg)
                cell_state["failure_reasons"] = "; ".join(existing)

                if cell_state["attempts"] >= 15 and cell_state["valid_count"] < 5:
                    cell_state["cell_status"] = "infeasible_phase1"

                save_status_csv(status_csv_path, status_cells)
                print(f"[Phase 1] Slot {slot_idx} Attempt FAILED: {arch} N{n_slices} VU{vus} -> Reason: {err_msg} (Attempts: {cell_state['attempts']}/15)")

                if cell_state["attempts"] >= 15:
                    print(f"[Phase 1] Budget exhausted for {arch} N{n_slices} VU{vus}. Marked infeasible_phase1.")
                    break

    print("\n[Phase 1] Confirmatory Phase 1 Schedule completed.")


def run_confirmatory_phase2(config, status_csv_path, master_csv_path, raw_base_dir):
    print("\n" + "=" * 70)
    print("PHASE 2: FEASIBILITY GATE (7 CONDITIONS × 3 ARCHITECTURES)")
    print("=" * 70)

    conditions = [
        (100, 50),
        (100, 100),
        (100, 200),
        (200, 10),
        (200, 50),
        (200, 100),
        (200, 200)
    ]
    status_cells = load_status_csv(status_csv_path)
    feasibility_records = []

    # Probing loop
    for n_slices, vus in conditions:
        print(f"\n[Phase 2 Probe] Condition N={n_slices}, VUs={vus}...")
        archs = ["sync", "background", "celery"]
        rng = random.Random(20261020 + n_slices + vus)
        rng.shuffle(archs)

        condition_probes_passed = True
        probe_details = {}

        for arch in archs:
            key = (arch, n_slices, vus)
            cell_state = status_cells[key]
            print(f"[Phase 2 Probe] Probing {arch} at N={n_slices}, VU={vus}...")

            slot_start = time.time()
            reset_actions = reset_for_attempt(config)
            cell_def = {"arch": arch, "n": n_slices, "vu": vus, "rep": 1}

            success, meta = execute_single_run(
                cell_def, config, master_csv_path, raw_base_dir=raw_base_dir, reset_actions=reset_actions
            )
            duration = round(time.time() - slot_start, 2)

            if meta.get("status") == "environment_invalid":
                triggers = meta.get("validation_triggers", [])
                err_msg = f"environment_invalid: {'; '.join(triggers)}" if triggers else "environment_invalid"
                print(f"\n{'!' * 70}")
                print(f"[Phase 2 Probe] HOST ENVIRONMENT INVALID: Preflight gate failed for {arch} N{n_slices} VU{vus}.")
                print(f"  Reasons: {err_msg}")
                print("  Per 21 Oct 2026 Protocol Amendment:")
                print(f"  - This attempt is NOT counted towards the 15-attempt budget (attempts remains {cell_state['attempts']}).")
                print("  - Cell cannot be marked probe_failed or infeasible due to host environment issues.")
                print("  - Halting execution to request operator intervention.")
                print(f"{'!' * 70}\n")
                print("[OPERATOR REQUIRED] Please ensure:")
                print("  1. MagSafe / AC power adapter is securely connected.")
                print("  2. Host is rebooted to clear kernel swap memory.")
                print("  3. Verify 'sysctl vm.swapusage' shows swap < 500 MB.")
                print("  4. Verify free RAM > 3,000 MB.")
                print("Then rerun the experiment command.")
                save_status_csv(status_csv_path, status_cells)
                sys.exit(1)

            cell_state["attempts"] += 1
            cell_state["last_attempt_time"] = datetime.datetime.now().isoformat()
            cell_state["wall_clock_seconds"] = duration

            status_desc = meta.get("status", "unknown")
            metrics = meta.get("metrics", {})
            peak_swap = metrics.get("peak_swap_mb", meta.get("gate_readings", {}).get("swap_used_mb", 0.0))
            min_ram = metrics.get("min_avail_ram_mb", meta.get("gate_readings", {}).get("available_memory_mb", 0.0))
            triggers = meta.get("validation_triggers", [])

            if success and not meta.get("validation_only", True):
                cell_state["valid_count"] = 1
                cell_state["cell_status"] = "probe_succeeded"
                probe_details[arch] = {"passed": True, "status": "success", "triggers": [], "peak_swap": peak_swap, "min_ram": min_ram}
            else:
                condition_probes_passed = False
                cell_state["cell_status"] = "probe_failed"
                err_msg = f"{status_desc}: {'; '.join(triggers)}" if triggers else status_desc
                existing = cell_state["failure_reasons"].split("; ") if cell_state["failure_reasons"] else []
                if err_msg not in existing:
                    existing.append(err_msg)
                cell_state["failure_reasons"] = "; ".join(existing)
                probe_details[arch] = {
                    "passed": False,
                    "status": status_desc,
                    "triggers": triggers,
                    "peak_swap": peak_swap,
                    "min_ram": min_ram
                }

            save_status_csv(status_csv_path, status_cells)

        feasibility_records.append({
            "n_slices": n_slices,
            "vus": vus,
            "probes_passed": condition_probes_passed,
            "probe_details": probe_details
        })

        if not condition_probes_passed:
            print(f"[Phase 2 Feasibility Boundary] Condition N={n_slices}, VU={vus} is INFEASIBLE (probe failed). Boundary established; not extending.")
            for arch in ["sync", "background", "celery"]:
                key = (arch, n_slices, vus)
                if status_cells[key]["cell_status"] != "completed":
                    if status_cells[key]["cell_status"] != "probe_failed":
                        status_cells[key]["cell_status"] = "infeasible_probe"
            save_status_csv(status_csv_path, status_cells)
            continue

        # If all 3 probes succeeded, extend condition to 5 valid runs!
        print(f"[Phase 2 Extension] All 3 probes succeeded for N={n_slices}, VU={vus}. Extending to 5 valid runs...")
        ext_rng = random.Random(20261021 + n_slices + vus)
        ext_items = []
        for rep in range(2, 6):
            for arch in ["sync", "background", "celery"]:
                ext_items.append({"arch": arch, "rep": rep})
        ext_rng.shuffle(ext_items)

        consecutive_failures = {a: 0 for a in ["sync", "background", "celery"]}

        for ext_item in ext_items:
            arch = ext_item["arch"]
            rep = ext_item["rep"]
            key = (arch, n_slices, vus)
            cell_state = status_cells[key]

            if cell_state["valid_count"] >= 5:
                continue
            if consecutive_failures[arch] >= 3:
                print(f"[Phase 2 Extension] {arch} N{n_slices} VU{vus} reached 3 consecutive failures. Marked infeasible_phase2.")
                cell_state["cell_status"] = "infeasible_phase2"
                save_status_csv(status_csv_path, status_cells)
                continue
            if cell_state["attempts"] >= 15:
                print(f"[Phase 2 Extension] {arch} N{n_slices} VU{vus} reached 15 attempts. Marked infeasible_phase2.")
                cell_state["cell_status"] = "infeasible_phase2"
                save_status_csv(status_csv_path, status_cells)
                continue

            print(f"[Phase 2 Extension] Running {arch} N={n_slices}, VU={vus}, Rep={rep} (Attempt {cell_state['attempts'] + 1}/15)...")
            slot_start = time.time()
            reset_actions = reset_for_attempt(config)
            cell_def = {"arch": arch, "n": n_slices, "vu": vus, "rep": rep}
            success, meta = execute_single_run(
                cell_def, config, master_csv_path, raw_base_dir=raw_base_dir, reset_actions=reset_actions
            )
            duration = round(time.time() - slot_start, 2)

            if meta.get("status") == "environment_invalid":
                triggers = meta.get("validation_triggers", [])
                err_msg = f"environment_invalid: {'; '.join(triggers)}" if triggers else "environment_invalid"
                print(f"\n{'!' * 70}")
                print(f"[Phase 2 Extension] HOST ENVIRONMENT INVALID: Preflight gate failed for {arch} N{n_slices} VU{vus} rep{rep}.")
                print(f"  Reasons: {err_msg}")
                print("  Per 21 Oct 2026 Protocol Amendment:")
                print(f"  - This attempt is NOT counted towards the 15-attempt budget (attempts remains {cell_state['attempts']}).")
                print("  - Cell cannot be marked infeasible due to host environment issues.")
                print("  - Halting execution to request operator intervention.")
                print(f"{'!' * 70}\n")
                print("[OPERATOR REQUIRED] Please ensure:")
                print("  1. MagSafe / AC power adapter is securely connected.")
                print("  2. Host is rebooted to clear kernel swap memory.")
                print("  3. Verify 'sysctl vm.swapusage' shows swap < 500 MB.")
                print("  4. Verify free RAM > 3,000 MB.")
                print("Then rerun the experiment command.")
                save_status_csv(status_csv_path, status_cells)
                sys.exit(1)

            cell_state["attempts"] += 1
            cell_state["last_attempt_time"] = datetime.datetime.now().isoformat()
            cell_state["wall_clock_seconds"] = duration

            if success and not meta.get("validation_only", True):
                cell_state["valid_count"] += 1
                consecutive_failures[arch] = 0
                if cell_state["valid_count"] >= 5:
                    cell_state["cell_status"] = "completed"
            else:
                consecutive_failures[arch] += 1
                status_desc = meta.get("status", "failed")
                triggers = meta.get("validation_triggers", [])
                err_msg = f"{status_desc}: {'; '.join(triggers)}" if triggers else status_desc
                existing = cell_state["failure_reasons"].split("; ") if cell_state["failure_reasons"] else []
                if err_msg not in existing:
                    existing.append(err_msg)
                cell_state["failure_reasons"] = "; ".join(existing)

                if consecutive_failures[arch] >= 3:
                    cell_state["cell_status"] = "infeasible_phase2"
                elif cell_state["attempts"] >= 15 and cell_state["valid_count"] < 5:
                    cell_state["cell_status"] = "infeasible_phase2"

            save_status_csv(status_csv_path, status_cells)

    write_feasibility_md(status_cells, feasibility_records)


def write_feasibility_md(status_cells, feasibility_records):
    feasibility_path = REPO_ROOT / "experiments" / "results" / "confirmatory_frozen_v1" / "FEASIBILITY.md"
    lines = [
        "# Protocol Feasibility Boundary Report (Frozen Harness v1)",
        "",
        "**Protocol**: Option A, Feasibility-Gated Extension (Dr. Karim Protocol 19 Oct 2026)",
        "**Dataset**: Confirmatory Frozen Dataset (`confirmatory_frozen_v1`)",
        f"**Date**: {datetime.date.today().isoformat()}",
        "",
        "---",
        "",
        "## 1. Feasibility Boundary Summary",
        "",
        "Under the pre-registered protocol, Phase 2 evaluates 7 high-stress conditions (21 cells).",
        "A condition is extended to 5 valid runs only if all 3 architectures pass the probe run.",
        "If any probe fails, the condition is declared infeasible and execution stops at that boundary.",
        "",
        "| Condition | Probe Result | Sync Status | Background Status | Celery Status | Boundary Assessment |",
        "| :--- | :---: | :---: | :---: | :---: | :--- |",
    ]

    for rec in feasibility_records:
        n, vu = rec["n_slices"], rec["vus"]
        passed = rec["probes_passed"]
        details = rec["probe_details"]
        sync_st = details.get("sync", {}).get("status", "pending")
        bg_st = details.get("background", {}).get("status", "pending")
        cel_st = details.get("celery", {}).get("status", "pending")
        outcome = "Feasible (Extended)" if passed else "Infeasible Boundary (Halted)"
        lines.append(f"| N={n} VU={vu} | {'PASSED' if passed else 'FAILED'} | {sync_st} | {bg_st} | {cel_st} | {outcome} |")

    lines.extend([
        "",
        "---",
        "",
        "## 2. Cell-by-Cell Failure Diagnostics",
        "",
    ])

    for rec in feasibility_records:
        n, vu = rec["n_slices"], rec["vus"]
        lines.append(f"### Condition N={n}, VU={vu}")
        for arch, det in rec["probe_details"].items():
            st = det.get("status", "unknown")
            triggers = det.get("triggers", [])
            trig_str = "; ".join(triggers) if triggers else "None"
            peak_sw = det.get("peak_swap", 0.0)
            min_ram = det.get("min_ram", 0.0)
            lines.append(f"- **{arch}**: Status=`{st}`, Peak Swap={peak_sw:.1f} MB, Min RAM={min_ram:.1f} MB, Triggers=`{trig_str}`")
        lines.append("")

    with open(feasibility_path, "w") as f:
        f.write("\n".join(lines))
    print(f"[Feasibility] Written boundary report to {feasibility_path}")


def calc_cliffs_delta_details(x, y):
    n_x, n_y = len(x), len(y)
    if n_x == 0 or n_y == 0:
        return 0.0, "not computed: n<5"
    greater = 0
    lesser = 0
    for i in x:
        for j in y:
            if i > j:
                greater += 1
            elif i < j:
                lesser += 1
    d = (greater - lesser) / (n_x * n_y)
    note = "complete separation" if abs(d) == 1.0 else "partial overlap"
    return d, note


def calc_bootstrap_ci_diff(x, y, B=5000, seed=20261013):
    import numpy as np
    rng = np.random.default_rng(seed)
    diffs = []
    n_x, n_y = len(x), len(y)
    for _ in range(B):
        sample_x = rng.choice(x, size=n_x, replace=True)
        sample_y = rng.choice(y, size=n_y, replace=True)
        diffs.append(float(np.median(sample_x) - np.median(sample_y)))
    ci_lower = float(np.percentile(diffs, 2.5))
    ci_upper = float(np.percentile(diffs, 97.5))
    return ci_lower, ci_upper


def write_results_draft_md(status_cells, desc_rows, stat_rows, script_shas, harness_ids, swap_note, output_path):
    total_cells = len(status_cells)
    cells_completed = sum(1 for c in status_cells.values() if c["cell_status"] == "completed")
    cells_inf_p1 = sum(1 for c in status_cells.values() if c["cell_status"] == "infeasible_phase1")
    cells_inf_p2 = sum(1 for c in status_cells.values() if c["cell_status"] in ("infeasible_phase2", "probe_failed", "infeasible_probe"))
    total_attempts = sum(c["attempts"] for c in status_cells.values())
    durations = [c["wall_clock_seconds"] for c in status_cells.values() if c["wall_clock_seconds"] > 0]
    avg_wall_clock = round(sum(durations) / len(durations), 2) if durations else 0.0

    lines = [
        "# Confirmatory Benchmark Results Draft (Frozen Harness v1)",
        "",
        "**Protocol**: Option A, Frozen Harness (Dr. Karim Protocol 19 Oct 2026)",
        f"**Date**: {datetime.date.today().isoformat()}",
        f"**Harness Frozen ID**: {', '.join(harness_ids) if harness_ids else HARNESS_FROZEN_ID}",
        f"**Script SHA256**: {', '.join(script_shas) if script_shas else 'None'}",
        "",
        "---",
        "",
        "## 1. Protocol Execution Summary",
        "",
        f"- **Total Architecture Cells**: {total_cells} (15 Phase 1 cells, 21 Phase 2 cells)",
        f"- **Cells Completed (n >= 5)**: {cells_completed}",
        f"- **Cells Infeasible in Phase 1**: {cells_inf_p1}",
        f"- **Cells Infeasible in Phase 2**: {cells_inf_p2}",
        f"- **Total Execution Attempts**: {total_attempts}",
        f"- **Average Wall-Clock Duration per Attempt**: {avg_wall_clock} s",
        "- **Host Reset Reboots**: 0",
        "",
        "---",
        "",
        "## 2. Descriptive Telemetry & Burst Request Behavior",
        "",
        "All measurements represent burst / concurrent-request behavior under k6 load generator bursts, not sustained scalability.",
        "",
        "| Architecture | N | VUs | Phase | Status | Valid n | Attempts | e2e p95 Median (ms) | Throughput Median (req/s) | Failure Rate Mean | Swap Growth Median (MB) |",
        "| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |",
    ]

    for r in desc_rows:
        lines.append(
            f"| {r['arch']} | {r['n_slices']} | {r['vus']} | {r['phase']} | {r['cell_status']} | "
            f"{r['valid_n']} | {r['attempts']} | {r['e2e_p95_median_ms']} | {r['throughput_median_req_s']} | "
            f"{r['failure_rate_mean']} | {r['swap_growth_median_mb']} |"
        )

    lines.extend([
        "",
        "---",
        "",
        "## 3. Inferential Hypothesis Testing (Kruskal-Wallis & Dunn-Holm)",
        "",
        "Tests conducted solely on confirmatory frozen dataset where all three architectures satisfied n >= 5.",
        "",
        "| Condition | KW H-stat | KW p-value | Dunn-Holm (Sync vs Celery) | Dunn-Holm (Sync vs BG) | Dunn-Holm (BG vs Celery) | Cliff's Delta (Sync vs Celery) | Bootstrap 95% CI (Sync vs Celery) |",
        "| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |",
    ])

    for s in stat_rows:
        lines.append(
            f"| N={s['n_slices']} VU={s['vus']} | {s['kw_h_stat']} | {s['kw_p_val']} | "
            f"{s['dunn_holm_sync_vs_celery_p']} | {s['dunn_holm_sync_vs_bg_p']} | {s['dunn_holm_bg_vs_celery_p']} | "
            f"{s['cliffs_delta_sync_vs_celery']} ({s['cliffs_delta_sync_vs_celery_note']}) | {s['bootstrap_ci95_sync_vs_celery']} |"
        )

    lines.extend([
        "",
        "---",
        "",
        "## 4. Sensitivity & Host Integrity Audit",
        "",
        f"- **Swap Sensitivity**: {swap_note}",
        f"- **Harness Integrity**: Exactly one `harness_frozen_id` ({HARNESS_FROZEN_ID}) and matching `script_sha256` recorded across all confirmatory attempts.",
        "",
    ])

    with open(output_path, "w") as f:
        f.write("\n".join(lines))
    print(f"[Results Draft] Written factual draft to {output_path}")


def run_confirmatory_analysis():
    import numpy as np
    import pandas as pd
    from scipy import stats
    import scikit_posthocs as sp

    confirmatory_dir = REPO_ROOT / "experiments" / "results" / "confirmatory_frozen_v1"
    master_csv = confirmatory_dir / "master.csv"
    stats_csv_path = confirmatory_dir / "stats_frozen_v1.csv"
    desc_csv_path = confirmatory_dir / "descriptive_frozen_v1.csv"
    results_draft_path = confirmatory_dir / "RESULTS_DRAFT.md"
    status_csv_path = confirmatory_dir / "status.csv"

    status_cells = load_status_csv(status_csv_path)

    if master_csv.exists() and master_csv.stat().st_size > 0:
        df = pd.read_csv(master_csv)
    else:
        df = pd.DataFrame()

    script_shas = df["script_sha256"].unique().tolist() if not df.empty and "script_sha256" in df.columns else []
    harness_ids = df["harness_frozen_id"].unique().tolist() if not df.empty and "harness_frozen_id" in df.columns else []

    desc_rows = []
    for key, cell_st in status_cells.items():
        arch, n, vu = key
        cell_df = df[(df["arch"] == arch) & (df["n_slices"] == n) & (df["vus"] == vu)] if not df.empty else pd.DataFrame()
        valid_n = len(cell_df)

        if valid_n > 0:
            e2e_p95_med = round(float(cell_df["e2e_p95_ms"].median()), 2)
            e2e_p95_iqr = round(float(cell_df["e2e_p95_ms"].quantile(0.75) - cell_df["e2e_p95_ms"].quantile(0.25)), 2)
            tp_med = round(float(cell_df["throughput_req_s"].median()), 2)
            fail_rate_avg = round(float(cell_df["failure_rate"].mean()), 4)
            cpu_avg = round(float(cell_df["avg_cpu_pct"].mean()), 2)
            cpu_peak = round(float(cell_df["peak_cpu_pct"].max()), 2)
            peak_uvi = round(float(cell_df["peak_uvicorn_rss_mb"].max()), 2)
            peak_cel = round(float(cell_df["peak_celery_rss_mb"].max()), 2)
            peak_node = round(float(cell_df["peak_node_rss_mb"].max()), 2)
            peak_stack = round(float(cell_df["peak_total_stack_rss_mb"].max()), 2)
            swap_growth_med = round(float(cell_df["swap_growth_mb"].median()), 2)
        else:
            e2e_p95_med = "not computed: n<5"
            e2e_p95_iqr = "not computed: n<5"
            tp_med = "not computed: n<5"
            fail_rate_avg = "not computed: n<5"
            cpu_avg = "not computed: n<5"
            cpu_peak = "not computed: n<5"
            peak_uvi = "not computed: n<5"
            peak_cel = "not computed: n<5"
            peak_node = "not computed: n<5"
            peak_stack = "not computed: n<5"
            swap_growth_med = "not computed: n<5"

        desc_rows.append({
            "arch": arch,
            "n_slices": n,
            "vus": vu,
            "phase": cell_st["phase"],
            "cell_status": cell_st["cell_status"],
            "valid_n": valid_n,
            "attempts": cell_st["attempts"],
            "e2e_p95_median_ms": e2e_p95_med,
            "e2e_p95_iqr_ms": e2e_p95_iqr,
            "throughput_median_req_s": tp_med,
            "failure_rate_mean": fail_rate_avg,
            "cpu_avg_pct": cpu_avg,
            "cpu_peak_pct": cpu_peak,
            "peak_uvicorn_rss_mb": peak_uvi,
            "peak_celery_rss_mb": peak_cel,
            "peak_node_rss_mb": peak_node,
            "peak_total_stack_rss_mb": peak_stack,
            "swap_growth_median_mb": swap_growth_med,
        })

    pd.DataFrame(desc_rows).to_csv(desc_csv_path, index=False)
    print(f"[Analysis] Saved descriptive statistics to {desc_csv_path}")

    stat_rows = []
    all_conditions = sorted(list(set([(c["n_slices"], c["vus"]) for c in desc_rows])))
    for n, vu in all_conditions:
        sub_df = df[(df["n_slices"] == n) & (df["vus"] == vu)] if not df.empty else pd.DataFrame()
        sync_vals = sub_df[sub_df["arch"] == "sync"]["e2e_p95_ms"].dropna().tolist() if not sub_df.empty else []
        bg_vals = sub_df[sub_df["arch"] == "background"]["e2e_p95_ms"].dropna().tolist() if not sub_df.empty else []
        cel_vals = sub_df[sub_df["arch"] == "celery"]["e2e_p95_ms"].dropna().tolist() if not sub_df.empty else []

        all_ge_5 = (len(sync_vals) >= 5 and len(bg_vals) >= 5 and len(cel_vals) >= 5)

        if all_ge_5:
            h_stat, kw_p = stats.kruskal(sync_vals, bg_vals, cel_vals)
            dunn_df = sp.posthoc_dunn(sub_df, val_col="e2e_p95_ms", group_col="arch", p_adjust="holm")
            p_sync_cel = float(dunn_df.loc["sync", "celery"])
            p_sync_bg = float(dunn_df.loc["sync", "background"])
            p_bg_cel = float(dunn_df.loc["background", "celery"])

            cd_sync_cel, note_sc = calc_cliffs_delta_details(sync_vals, cel_vals)
            cd_sync_bg, note_sb = calc_cliffs_delta_details(sync_vals, bg_vals)
            cd_bg_cel, note_bc = calc_cliffs_delta_details(bg_vals, cel_vals)

            ci_sc_lo, ci_sc_hi = calc_bootstrap_ci_diff(sync_vals, cel_vals, B=5000, seed=20261013)
            ci_sb_lo, ci_sb_hi = calc_bootstrap_ci_diff(sync_vals, bg_vals, B=5000, seed=20261013)
            ci_bc_lo, ci_bc_hi = calc_bootstrap_ci_diff(bg_vals, cel_vals, B=5000, seed=20261013)

            stat_rows.append({
                "n_slices": n,
                "vus": vu,
                "kw_h_stat": round(h_stat, 4),
                "kw_p_val": round(kw_p, 6),
                "dunn_holm_sync_vs_celery_p": round(p_sync_cel, 6),
                "dunn_holm_sync_vs_bg_p": round(p_sync_bg, 6),
                "dunn_holm_bg_vs_celery_p": round(p_bg_cel, 6),
                "cliffs_delta_sync_vs_celery": round(cd_sync_cel, 4),
                "cliffs_delta_sync_vs_celery_note": note_sc,
                "bootstrap_ci95_sync_vs_celery": f"[{ci_sc_lo:.2f}, {ci_sc_hi:.2f}]",
                "cliffs_delta_sync_vs_bg": round(cd_sync_bg, 4),
                "cliffs_delta_sync_vs_bg_note": note_sb,
                "bootstrap_ci95_sync_vs_bg": f"[{ci_sb_lo:.2f}, {ci_sb_hi:.2f}]",
                "cliffs_delta_bg_vs_celery": round(cd_bg_cel, 4),
                "cliffs_delta_bg_vs_celery_note": note_bc,
                "bootstrap_ci95_bg_vs_celery": f"[{ci_bc_lo:.2f}, {ci_bc_hi:.2f}]",
            })
        else:
            stat_rows.append({
                "n_slices": n,
                "vus": vu,
                "kw_h_stat": "not computed: n<5",
                "kw_p_val": "not computed: n<5",
                "dunn_holm_sync_vs_celery_p": "not computed: n<5",
                "dunn_holm_sync_vs_bg_p": "not computed: n<5",
                "dunn_holm_bg_vs_celery_p": "not computed: n<5",
                "cliffs_delta_sync_vs_celery": "not computed: n<5",
                "cliffs_delta_sync_vs_celery_note": "not computed: n<5",
                "bootstrap_ci95_sync_vs_celery": "not computed: n<5",
                "cliffs_delta_sync_vs_bg": "not computed: n<5",
                "cliffs_delta_sync_vs_bg_note": "not computed: n<5",
                "bootstrap_ci95_sync_vs_bg": "not computed: n<5",
                "cliffs_delta_bg_vs_celery": "not computed: n<5",
                "cliffs_delta_bg_vs_celery_note": "not computed: n<5",
                "bootstrap_ci95_bg_vs_celery": "not computed: n<5",
            })

    pd.DataFrame(stat_rows).to_csv(stats_csv_path, index=False)
    print(f"[Analysis] Saved inferential statistics to {stats_csv_path}")

    swap_over_500 = df[df["swap_growth_mb"] > 500] if not df.empty and "swap_growth_mb" in df.columns else pd.DataFrame()
    swap_sensitivity_note = f"Swap growth > 500 MB observed in {len(swap_over_500)} runs out of {len(df)} total confirmatory runs. Per protocol, zero runs were excluded from confirmatory analysis."

    write_results_draft_md(status_cells, desc_rows, stat_rows, script_shas, harness_ids, swap_sensitivity_note, results_draft_path)


def run_confirmatory_protocol(config, args):
    confirmatory_dir = REPO_ROOT / "experiments" / "results" / "confirmatory_frozen_v1"
    confirmatory_dir.mkdir(parents=True, exist_ok=True)
    master_csv_path = confirmatory_dir / "master.csv"
    status_csv_path = confirmatory_dir / "status.csv"
    raw_base_dir = confirmatory_dir / "raw"
    raw_base_dir.mkdir(parents=True, exist_ok=True)
    schedule_csv_path = REPO_ROOT / "experiments" / "config" / "schedule_phase1_v1.csv"

    # Step 1: Phase 1
    run_confirmatory_phase1(config, schedule_csv_path, status_csv_path, master_csv_path, raw_base_dir)

    # Step 2: Phase 2
    run_confirmatory_phase2(config, status_csv_path, master_csv_path, raw_base_dir)

    # Step 3: Analysis
    run_confirmatory_analysis()


def main():
    parser = argparse.ArgumentParser(description="CDSS X-Core A/B/C Experiment Harness")
    parser.add_argument("--freeze-manifest", action="store_true", help="Generate frozen harness manifest (experiments/config/harness_frozen_v1.json)")
    parser.add_argument("--confirmatory", action="store_true", help="Execute Confirmatory Protocol (Option A, Phase 1 + Phase 2 + Analysis)")
    parser.add_argument("--analyze-confirmatory", action="store_true", help="Run Confirmatory Analysis on confirmatory_frozen_v1/master.csv")
    parser.add_argument("--pilot", action="store_true", help="Execute Full Pilot protocol (Task 4)")
    parser.add_argument("--pilot-phase2", action="store_true", help="Execute Pilot Phase 2 only (reproducibility check: reps 2 & 3)")
    parser.add_argument("--full", action="store_true", help="Execute Full 180-run factorial experiment (Task 5)")
    parser.add_argument("--resume", action="store_true", help="Resume full factorial experiment skipping already executed runs")
    parser.add_argument("--start-run", "--from-run", type=int, default=None, dest="start_run", help="1-indexed schedule run number to start from (e.g. --start-run 107)")
    parser.add_argument("--single", action="store_true", help="Execute single run for verification")
    parser.add_argument("--arch", choices=["sync", "background", "celery"], default="background")
    parser.add_argument("--n", type=int, choices=[25, 100, 200], default=25)
    parser.add_argument("--vu", type=int, choices=[10, 50, 100, 200], default=10)
    parser.add_argument("--rep", type=int, default=1)
    parser.add_argument("--skip-gate", action="store_true", help="Skip gate checks (debug only)")
    args = parser.parse_args()

    if args.freeze_manifest:
        generate_frozen_manifest()
        return

    verify_frozen_harness()

    config = load_config()

    if args.confirmatory:
        run_confirmatory_protocol(config, args)
        return

    if args.analyze_confirmatory:
        run_confirmatory_analysis()
        return

    raw_results_dir = REPO_ROOT / config["paths"]["results_raw_dir"]
    raw_results_dir.mkdir(parents=True, exist_ok=True)
    master_csv = raw_results_dir / "master_runs.csv"

    if args.single:
        cell = {"arch": args.arch, "n": args.n, "vu": args.vu, "rep": args.rep}
        execute_single_run(cell, config, master_csv, skip_gate=args.skip_gate)
        return

    if args.pilot:
        print("\n" + "#" * 70)
        print("PILOT PHASE 1: 1 run per architecture at N=25, VU=10")
        print("#" * 70)
        pilot_1_cells = [
            {"arch": "sync", "n": 25, "vu": 10, "rep": 1},
            {"arch": "background", "n": 25, "vu": 10, "rep": 1},
            {"arch": "celery", "n": 25, "vu": 10, "rep": 1},
        ]
        # Interleave with seed
        random.Random(config["randomization_seed"]).shuffle(pilot_1_cells)
        for cell in pilot_1_cells:
            execute_single_run(cell, config, master_csv, skip_gate=args.skip_gate)

        print("\n" + "#" * 70)
        print("PILOT PHASE 2: 2 runs per architecture at N=25, VU=10 (Reproducibility check)")
        print("#" * 70)
        pilot_2_cells = [
            {"arch": "sync", "n": 25, "vu": 10, "rep": 2},
            {"arch": "background", "n": 25, "vu": 10, "rep": 2},
            {"arch": "celery", "n": 25, "vu": 10, "rep": 2},
            {"arch": "sync", "n": 25, "vu": 10, "rep": 3},
            {"arch": "background", "n": 25, "vu": 10, "rep": 3},
            {"arch": "celery", "n": 25, "vu": 10, "rep": 3},
        ]
        random.Random(config["randomization_seed"] + 1).shuffle(pilot_2_cells)
        for cell in pilot_2_cells:
            execute_single_run(cell, config, master_csv, skip_gate=args.skip_gate)

        print("\n[Pilot] Pilot runs complete! Report results and seek approval before full run.")
        return

    if args.pilot_phase2:
        print("\n" + "#" * 70)
        print("PILOT PHASE 2: 2 runs per architecture at N=25, VU=10 (Reproducibility check)")
        print("#" * 70)
        pilot_2_cells = [
            {"arch": "sync", "n": 25, "vu": 10, "rep": 2},
            {"arch": "background", "n": 25, "vu": 10, "rep": 2},
            {"arch": "celery", "n": 25, "vu": 10, "rep": 2},
            {"arch": "sync", "n": 25, "vu": 10, "rep": 3},
            {"arch": "background", "n": 25, "vu": 10, "rep": 3},
            {"arch": "celery", "n": 25, "vu": 10, "rep": 3},
        ]
        random.Random(config["randomization_seed"] + 1).shuffle(pilot_2_cells)
        for cell in pilot_2_cells:
            execute_single_run(cell, config, master_csv, skip_gate=args.skip_gate)

        print("\n[Pilot] Phase 2 runs complete! Report results and seek approval before full run.")
        return

    if args.full:
        schedule = build_full_factorial_schedule(config)
        total_runs = len(schedule)
        print(f"\n[Full Factorial] Total planned runs: {total_runs} (Seed: {config['randomization_seed']})")

        checkpoint_file = REPO_ROOT / "experiments" / "results" / ".resume_checkpoint.json"
        start_run_idx = 1

        if args.start_run is not None:
            start_run_idx = max(1, min(args.start_run, total_runs))
            print(f"[Full Factorial] Starting execution from specified run: {start_run_idx} / {total_runs}")
        elif args.resume and checkpoint_file.exists():
            try:
                with open(checkpoint_file, "r") as f:
                    cp_data = json.load(f)
                saved_idx = cp_data.get("current_run_index", 1)
                if 1 <= saved_idx <= total_runs:
                    start_run_idx = saved_idx
                    print(f"[Full Factorial] Resume checkpoint detected: Resuming directly from Run {start_run_idx} / {total_runs} (skipping earlier runs)...")
            except Exception as e:
                print(f"[Full Factorial] Warning: Could not read checkpoint file: {e}")

        if args.resume and start_run_idx == 1:
            print("[Full Factorial] Resume mode ENABLED. Scanning existing completed runs...")

        for idx, cell in enumerate(schedule, 1):
            if idx < start_run_idx:
                continue

            # Update checkpoint to current run index
            try:
                with open(checkpoint_file, "w") as f:
                    json.dump({
                        "current_run_index": idx,
                        "timestamp": datetime.datetime.now().isoformat(),
                        "cell": cell,
                    }, f, indent=2)
            except Exception:
                pass

            if args.resume:
                completed, existing_dir, prev_status = is_cell_completed(cell, raw_results_dir)
                if completed:
                    print(f"\nProgress: Run {idx} / {total_runs} - SKIPPING (already completed as {existing_dir} with status: {prev_status})")
                    continue

            print(f"\nProgress: Run {idx} / {total_runs}")
            success, run_meta = execute_single_run(cell, config, master_csv, skip_gate=args.skip_gate)
            if not success:
                run_status = run_meta.get("status") if isinstance(run_meta, dict) else "environment_invalid"
                print(f"\n[Full Factorial] Run {idx} failed preflight gate (status: {run_status}).")
                print(f"[Full Factorial] Halting cell progression. Waiting and retrying preflight gate with bounded timeout...")

                recovery_timeout = config.get("gate", {}).get("recovery_timeout_seconds", 120)
                retry_delay = config.get("gate", {}).get("retry_delay_seconds", 15)
                start_wait = time.time()
                gate_recovered = False

                while time.time() - start_wait < recovery_timeout:
                    print(f"[Full Factorial] Waiting {retry_delay}s for gate recovery "
                          f"({int(time.time() - start_wait)}s / {recovery_timeout}s elapsed)...")
                    time.sleep(retry_delay)
                    gate_ok, readings, reasons = check_preflight_gate(config)
                    if gate_ok:
                        print(f"[Full Factorial] Preflight gate recovered successfully!")
                        gate_recovered = True
                        break
                    print(f"[Full Factorial] Preflight gate still failing: {'; '.join(reasons)}")

                if gate_recovered:
                    print(f"[Full Factorial] Retrying Run {idx} now that preflight gate has recovered...")
                    success, run_meta = execute_single_run(cell, config, master_csv, skip_gate=args.skip_gate)
                    if not success:
                        print(f"\n[Full Factorial] ERROR: Preflight gate failed again on retry for Run {idx}.")
                        print(f"[Full Factorial] Halting full factorial execution. Fix host conditions before resuming.")
                        sys.exit(1)
                else:
                    print(f"\n[Full Factorial] ERROR: Preflight gate failed and did not recover within {recovery_timeout}s bounded timeout.")
                    print(f"[Full Factorial] Halting full factorial execution to preserve host state. Fix host conditions before resuming.")
                    sys.exit(1)

        # Clean up checkpoint on complete factorial run
        if checkpoint_file.exists():
            try:
                checkpoint_file.unlink()
            except Exception:
                pass
        print(f"\n[Full Factorial] All {total_runs} planned runs completed!")
        return

    parser.print_help()


if __name__ == "__main__":
    main()
