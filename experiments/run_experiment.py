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

import psutil
import requests

REPO_ROOT = Path(__file__).resolve().parents[1]
CONFIG_PATH = REPO_ROOT / "experiments" / "config" / "experiment.json"
RESET_SCRIPT = REPO_ROOT / "experiments" / "scripts" / "reset_env.js"


def load_config():
    with open(CONFIG_PATH, "r") as f:
        return json.load(f)


def get_harness_provenance():
    try:
        git_sha = subprocess.check_output(
            ["git", "rev-parse", "HEAD"], cwd=str(REPO_ROOT), text=True
        ).strip()
        git_status_out = subprocess.check_output(
            ["git", "status", "--porcelain"], cwd=str(REPO_ROOT), text=True
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
    }


def get_swap_used_mb():
    try:
        out = subprocess.check_output(["sysctl", "vm.swapusage"], text=True)
        m = re.search(r"used\s*=\s*([\d.]+)M", out)
        return float(m.group(1)) if m else None
    except Exception as e:
        print(f"[Gate] Error reading swapusage: {e}")
        return None


def get_available_memory_mb():
    try:
        out = subprocess.check_output(["vm_stat"], text=True)
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
        out = subprocess.check_output(["pmset", "-g", "batt"], text=True)
        return "AC Power" in out
    except Exception as e:
        print(f"[Gate] Error reading battery status: {e}")
        return False


def get_disk_free_gb(path=REPO_ROOT):
    total, used, free = shutil.disk_usage(path)
    return free / (1024 ** 3)


def get_thermal_state():
    try:
        out = subprocess.check_output(["pmset", "-g", "therm"], text=True).strip()
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
                swap_mb = get_swap_used_mb() or 0.0
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


def execute_single_run(cell, config, master_csv_path, skip_gate=False):
    arch, n_slices, vus, rep = cell["arch"], cell["n"], cell["vu"], cell["rep"]
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    run_id = f"run_{timestamp}_{arch}_N{n_slices}_VU{vus}_rep{rep}"
    raw_dir = REPO_ROOT / config["paths"]["results_raw_dir"] / run_id
    raw_dir.mkdir(parents=True, exist_ok=True)

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
        print(f"[Run] RECORDING GATE FAILURE for {run_id}. Threshold not met.")
        metadata = {
            "run_id": run_id,
            "status": "gate_failed",
            "validation_only": validation_only,
            "validation_triggers": validation_triggers,
            "arch": arch,
            "n_slices": n_slices,
            "vus": vus,
            "repetition": rep,
            "timestamp": timestamp,
            "gate_readings": gate_readings,
            "worker_concurrency": config.get("worker_concurrency", 4),
            "worker_pool": config.get("worker_pool", "threads"),
            "git_commit": provenance["git_commit"],
            "script_sha256": provenance["script_sha256"],
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
    except Exception as e:
        print(f"[Run] Error during load execution: {e}")
        run_status = "error"
        run_duration = 0.0
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
        },
        "git_commit": provenance["git_commit"],
        "script_sha256": provenance["script_sha256"],
        "harness_provenance": provenance,
    }

    with open(raw_dir / "metadata.json", "w") as f:
        json.dump(metadata, f, indent=2)

    # Append to master_runs.csv
    file_exists = master_csv_path.exists()
    with open(master_csv_path, "a", newline="") as f:
        writer = csv.writer(f)
        if not file_exists:
            writer.writerow([
                "run_id", "timestamp", "arch", "n_slices", "vus", "repetition",
                "status", "validation_only", "e2e_p50_ms", "e2e_p95_ms", "e2e_p99_ms", "e2e_mean_ms",
                "upload_p95_ms", "poll_p95_ms", "throughput_req_s", "failure_rate",
                "peak_uvicorn_rss_mb", "peak_celery_rss_mb", "peak_node_rss_mb", "peak_total_stack_rss_mb",
                "avg_cpu_pct", "peak_cpu_pct", "swap_growth_mb", "git_commit", "script_sha256"
            ])
        writer.writerow([
            run_id, timestamp, arch, n_slices, vus, rep, run_status, validation_only,
            stats["e2e_p50"], stats["e2e_p95"], stats["e2e_p99"], stats["e2e_mean"],
            stats["upload_p95"], stats["poll_p95"], round(throughput, 2), stats["failure_rate"],
            round(peak_uvicorn_rss_mb, 2), round(peak_celery_rss_mb, 2), round(peak_node_rss_mb, 2), round(peak_total_stack_rss_mb, 2),
            round(avg_cpu_pct, 2), round(peak_cpu_pct, 2), round(swap_growth_mb, 2),
            provenance["git_commit"], provenance["script_sha256"]
        ])

    print(f"[Run] COMPLETE: e2e_p95={stats['e2e_p95']}ms, Throughput={throughput:.2f}req/s, "
          f"UvicornRSS={peak_uvicorn_rss_mb:.1f}MB, CeleryRSS={peak_celery_rss_mb:.1f}MB, "
          f"TotalStackRSS={peak_total_stack_rss_mb:.1f}MB, FailureRate={stats['failure_rate'] * 100:.1f}%")

    cooldown = config.get("cooldown_seconds", 10)
    print(f"[Run] Cooling down for {cooldown}s...")
    time.sleep(cooldown)

    return True, metadata


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


def main():
    parser = argparse.ArgumentParser(description="CDSS X-Core A/B/C Experiment Harness")
    parser.add_argument("--pilot", action="store_true", help="Execute Full Pilot protocol (Task 4)")
    parser.add_argument("--pilot-phase2", action="store_true", help="Execute Pilot Phase 2 only (reproducibility check: reps 2 & 3)")
    parser.add_argument("--full", action="store_true", help="Execute Full 180-run factorial experiment (Task 5)")
    parser.add_argument("--single", action="store_true", help="Execute single run for verification")
    parser.add_argument("--arch", choices=["sync", "background", "celery"], default="background")
    parser.add_argument("--n", type=int, choices=[25, 100, 200], default=25)
    parser.add_argument("--vu", type=int, choices=[10, 50, 100, 200], default=10)
    parser.add_argument("--rep", type=int, default=1)
    parser.add_argument("--skip-gate", action="store_true", help="Skip gate checks (debug only)")
    args = parser.parse_args()

    config = load_config()
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
        print(f"\n[Full Factorial] Total planned runs: {len(schedule)} (Seed: {config['randomization_seed']})")
        for idx, cell in enumerate(schedule, 1):
            print(f"\nProgress: Run {idx} / {len(schedule)}")
            success, _ = execute_single_run(cell, config, master_csv, skip_gate=args.skip_gate)
            if not success:
                print(f"[Full Factorial] Run {idx} encountered an infrastructure/gate failure. Retrying once after cooldown...")
                time.sleep(config.get("cooldown_seconds", 10))
                execute_single_run(cell, config, master_csv, skip_gate=args.skip_gate)
        return

    parser.print_help()


if __name__ == "__main__":
    main()
