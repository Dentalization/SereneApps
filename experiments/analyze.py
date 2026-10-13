#!/usr/bin/env python3
"""
Statistical analysis and figure generation for CDSS X-Core A/B/C Experiment.
Produces:
- experiments/results/summary.csv (per-cell mean, SD, median, p90, p95, p99, throughput, RSS, CPU)
- experiments/results/stats.csv (Kruskal-Wallis, Dunn-Holm, Cliff's delta, bootstrap 95% CI)
- experiments/results/figures/p95_latency_vs_vu.png
- experiments/results/figures/throughput_vs_vu.png
- experiments/results/figures/peak_rss_vs_n.png
"""

import argparse
import csv
import json
import math
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from scipy.stats import kruskal
import scikit_posthocs as sp

REPO_ROOT = Path(__file__).resolve().parents[1]
RESULTS_DIR = REPO_ROOT / "experiments" / "results"
RAW_DIR = RESULTS_DIR / "raw"
FIGURES_DIR = RESULTS_DIR / "figures"


def cliffs_delta(x, y):
    """
    Computes Cliff's delta effect size between two groups.
    delta in [-1, 1].
    """
    n_x, n_y = len(x), len(y)
    if n_x == 0 or n_y == 0:
        return 0.0
    greater = sum(1 for xi in x for yj in y if xi > yj)
    less = sum(1 for xi in x for yj in y if xi < yj)
    return (greater - less) / (n_x * n_y)


def bootstrap_median_difference_ci(x, y, n_resamples=10000, seed=20261013):
    """
    Computes 95% bootstrap confidence interval for difference in medians: median(x) - median(y).
    """
    if len(x) == 0 or len(y) == 0:
        return None, None, None
    rng = np.random.default_rng(seed)
    nx, ny = len(x), len(y)
    diffs = []
    for _ in range(n_resamples):
        sample_x = rng.choice(x, size=nx, replace=True)
        sample_y = rng.choice(y, size=ny, replace=True)
        diffs.append(np.median(sample_x) - np.median(sample_y))
    ci_lower = np.percentile(diffs, 2.5)
    ci_upper = np.percentile(diffs, 97.5)
    obs_diff = np.median(x) - np.median(y)
    return ci_lower, ci_upper, obs_diff


def load_all_runs_data():
    master_csv = RAW_DIR / "master_runs.csv"
    if master_csv.exists():
        df = pd.read_csv(master_csv)
        # Filter for completed runs
        df = df[df["status"].isin(["success", "k6_failed"])].copy()
        if not df.empty:
            return df

    # Fallback to scanning metadata.json in raw folders
    rows = []
    for run_dir in sorted(RAW_DIR.glob("run_*")):
        meta_file = run_dir / "metadata.json"
        if not meta_file.exists():
            continue
        try:
            with open(meta_file, "r") as f:
                data = json.load(f)
            if data.get("status") in ["success", "k6_failed"]:
                k6_stats = data.get("k6_stats", {})
                tele = data.get("telemetry", {})
                provenance = data.get("harness_provenance", {})
                rows.append({
                    "run_id": data["run_id"],
                    "timestamp": data.get("timestamp"),
                    "arch": data["arch"],
                    "n_slices": data["n_slices"],
                    "vus": data["vus"],
                    "repetition": data["repetition"],
                    "status": data["status"],
                    "validation_only": data.get("validation_only", False),
                    "e2e_p50_ms": k6_stats.get("e2e_p50"),
                    "e2e_p95_ms": k6_stats.get("e2e_p95"),
                    "e2e_p99_ms": k6_stats.get("e2e_p99"),
                    "e2e_mean_ms": k6_stats.get("e2e_mean"),
                    "upload_p95_ms": k6_stats.get("upload_p95"),
                    "poll_p95_ms": k6_stats.get("poll_p95"),
                    "throughput_req_s": tele.get("throughput_req_per_s"),
                    "failure_rate": k6_stats.get("failure_rate", 0.0),
                    "peak_uvicorn_rss_mb": tele.get("peak_uvicorn_rss_mb", tele.get("peak_rss_mb")),
                    "peak_celery_rss_mb": tele.get("peak_celery_rss_mb", 0.0),
                    "peak_node_rss_mb": tele.get("peak_node_rss_mb", 0.0),
                    "peak_total_stack_rss_mb": tele.get("peak_total_stack_rss_mb", tele.get("peak_rss_mb")),
                    "avg_cpu_pct": tele.get("avg_cpu_pct"),
                    "peak_cpu_pct": tele.get("peak_cpu_pct"),
                    "swap_growth_mb": tele.get("swap_growth_mb"),
                    "git_commit": provenance.get("git_commit", "unknown"),
                    "script_sha256": provenance.get("script_sha256", "unknown"),
                })
        except Exception:
            continue
    return pd.DataFrame(rows)


def generate_cell_summary(df):
    summary_rows = []
    grouped = df.groupby(["n_slices", "vus", "arch"])

    for (n, vu, arch), group in grouped:
        latencies = group["e2e_p95_ms"].dropna().tolist()
        tputs = group["throughput_req_s"].dropna().tolist()
        uvi_rss = group["peak_uvicorn_rss_mb"].dropna().tolist() if "peak_uvicorn_rss_mb" in group else []
        total_rss = group["peak_total_stack_rss_mb"].dropna().tolist() if "peak_total_stack_rss_mb" in group else group.get("peak_rss_mb", pd.Series()).dropna().tolist()
        cpu_avgs = group["avg_cpu_pct"].dropna().tolist()
        cpu_peaks = group["peak_cpu_pct"].dropna().tolist()
        swaps = group["swap_growth_mb"].dropna().tolist()
        failures = group["failure_rate"].dropna().tolist()

        def stats(arr):
            if not arr: return [None]*6
            arr_s = sorted(arr)
            mean_v = sum(arr_s) / len(arr_s)
            sd_v = math.sqrt(sum((x - mean_v)**2 for x in arr_s) / (len(arr_s) - 1)) if len(arr_s) > 1 else 0.0
            med_v = float(np.median(arr_s))
            p90_v = float(np.percentile(arr_s, 90))
            p95_v = float(np.percentile(arr_s, 95))
            p99_v = float(np.percentile(arr_s, 99))
            return [round(mean_v, 2), round(sd_v, 2), round(med_v, 2), round(p90_v, 2), round(p95_v, 2), round(p99_v, 2)]

        lat_stats = stats(latencies)

        val_only = bool(group.get("validation_only", pd.Series([False])).any())
        summary_rows.append({
            "n_slices": n,
            "vus": vu,
            "architecture": arch,
            "sample_size_n": len(group),
            "validation_only": val_only,
            "is_pilot_validation": bool(val_only or len(group) < 5),
            "e2e_latency_mean_ms": lat_stats[0],
            "e2e_latency_sd_ms": lat_stats[1],
            "e2e_latency_median_ms": lat_stats[2],
            "e2e_latency_p90_ms": lat_stats[3],
            "e2e_latency_p95_ms": lat_stats[4],
            "e2e_latency_p99_ms": lat_stats[5],
            "throughput_mean_req_s": round(sum(tputs) / len(tputs), 2) if tputs else None,
            "failure_rate_mean": round(sum(failures) / len(failures), 4) if failures else 0.0,
            "peak_uvicorn_rss_mean_mb": round(sum(uvi_rss) / len(uvi_rss), 2) if uvi_rss else None,
            "peak_total_stack_rss_mean_mb": round(sum(total_rss) / len(total_rss), 2) if total_rss else None,
            "cpu_util_mean_pct": round(sum(cpu_avgs) / len(cpu_avgs), 2) if cpu_avgs else None,
            "cpu_util_peak_pct": round(max(cpu_peaks), 2) if cpu_peaks else None,
            "swap_growth_mean_mb": round(sum(swaps) / len(swaps), 2) if swaps else None,
        })

    summary_df = pd.DataFrame(summary_rows)
    out_file = RESULTS_DIR / "summary.csv"
    summary_df.to_csv(out_file, index=False)
    print(f"[Analyze] Saved summary table to {out_file} ({len(summary_df)} rows)")
    return summary_df


def generate_statistical_tests(df):
    stats_rows = []
    cells = df.groupby(["n_slices", "vus"])

    for (n, vu), group in cells:
        archs = group["arch"].unique()
        if len(archs) < 2:
            continue

        # Collect latency arrays
        arch_groups = {}
        for a in ["sync", "background", "celery"]:
            arch_groups[a] = group[group["arch"] == a]["e2e_p95_ms"].dropna().tolist()

        # Kruskal-Wallis across architectures present
        valid_groups = [v for v in arch_groups.values() if len(v) >= 2]
        h_stat, p_val, eps_sq = None, None, None
        if len(valid_groups) >= 2:
            try:
                h_stat, p_val = kruskal(*valid_groups)
                # Epsilon-squared: (H - k + 1) / (N - k)
                k = len(valid_groups)
                total_n = sum(len(v) for v in valid_groups)
                if total_n > k:
                    eps_sq = (h_stat - k + 1) / (total_n - k)
            except Exception as e:
                print(f"[Analyze] Kruskal-Wallis warning for N={n}, VU={vu}: {e}")

        # Pairwise tests
        pairs = [("sync", "background"), ("sync", "celery"), ("background", "celery")]
        dunn_p_values = {}
        try:
            if len(valid_groups) >= 2:
                dunn_df = sp.posthoc_dunn(group, val_col="e2e_p95_ms", group_col="arch", p_adjust="holm")
                for a1, a2 in pairs:
                    if a1 in dunn_df.index and a2 in dunn_df.columns:
                        dunn_p_values[(a1, a2)] = dunn_df.loc[a1, a2]
        except Exception:
            pass

        for a1, a2 in pairs:
            x, y = arch_groups[a1], arch_groups[a2]
            delta = cliffs_delta(x, y) if x and y else None
            ci_low, ci_high, obs_diff = bootstrap_median_difference_ci(x, y)

            stats_rows.append({
                "n_slices": n,
                "vus": vu,
                "comparison": f"{a1}_vs_{a2}",
                "sample_size_1": len(x),
                "sample_size_2": len(y),
                "kruskal_h_stat": round(h_stat, 4) if h_stat is not None else None,
                "kruskal_p_value": round(p_val, 6) if p_val is not None else None,
                "kruskal_epsilon_squared": round(eps_sq, 4) if eps_sq is not None else None,
                "dunn_holm_p_value": round(dunn_p_values.get((a1, a2), np.nan), 6),
                "cliffs_delta": round(delta, 4) if delta is not None else None,
                "median_diff_ms": round(obs_diff, 2) if obs_diff is not None else None,
                "bootstrap_ci_95_lower": round(ci_low, 2) if ci_low is not None else None,
                "bootstrap_ci_95_upper": round(ci_high, 2) if ci_high is not None else None,
            })

    stats_df = pd.DataFrame(stats_rows)
    out_file = RESULTS_DIR / "stats.csv"
    stats_df.to_csv(out_file, index=False)
    print(f"[Analyze] Saved statistical test results to {out_file} ({len(stats_df)} rows)")
    return stats_df


def generate_plots(summary_df):
    FIGURES_DIR.mkdir(parents=True, exist_ok=True)
    plt.rcParams["font.sans-serif"] = "DejaVu Sans"
    plt.rcParams["axes.edgecolor"] = "#333333"

    # Colorblind safe styling: Blue, Vermillion, Green
    arch_styles = {
        "sync": {"label": "Arch A: Sync", "color": "#0072B2", "marker": "o", "linestyle": "-"},
        "background": {"label": "Arch B: Background (Base)", "color": "#D55E00", "marker": "s", "linestyle": "--"},
        "celery": {"label": "Arch C: Celery Queue", "color": "#009E73", "marker": "^", "linestyle": "-."},
    }

    n_tiers = sorted(summary_df["n_slices"].unique())
    is_pilot = summary_df.get("is_pilot_validation", pd.Series([False])).any()
    status_suffix = " [VALIDATION PILOT ONLY - NON-EVIDENTIARY]" if is_pilot else " (n = 5 runs)"

    # 1. Figure: p95 Latency vs VU across N tiers
    fig, axes = plt.subplots(1, len(n_tiers), figsize=(5.5 * len(n_tiers), 4.5), sharey=True)
    if len(n_tiers) == 1:
        axes = [axes]

    for ax, n in zip(axes, n_tiers):
        sub = summary_df[summary_df["n_slices"] == n]
        for arch, style in arch_styles.items():
            arch_data = sub[sub["architecture"] == arch].sort_values("vus")
            if not arch_data.empty:
                ax.plot(
                    arch_data["vus"],
                    arch_data["e2e_latency_median_ms"],
                    label=style["label"],
                    color=style["color"],
                    marker=style["marker"],
                    linestyle=style["linestyle"],
                    linewidth=1.8,
                    markersize=6,
                )
        ax.set_title(f"Payload N = {n} slices", fontsize=11, fontweight="bold")
        ax.set_xlabel("Concurrency (Virtual Users)", fontsize=10)
        ax.grid(True, linestyle=":", alpha=0.6)

    axes[0].set_ylabel("Median p95 Latency (ms)", fontsize=10)
    axes[0].legend(frameon=True, fontsize=9)
    fig.suptitle(f"End-to-End Latency vs Concurrency by Architecture{status_suffix}", fontsize=11, y=1.02)
    fig.tight_layout()
    fig1_path = FIGURES_DIR / "p95_latency_vs_vu.png"
    fig.savefig(fig1_path, dpi=300, bbox_inches="tight")
    plt.close(fig)
    print(f"[Analyze] Generated figure: {fig1_path}")

    # 2. Figure: Throughput vs VU
    fig, ax = plt.subplots(figsize=(7, 4.5))
    avg_tput = summary_df.groupby(["architecture", "vus"])["throughput_mean_req_s"].mean().reset_index()
    for arch, style in arch_styles.items():
        arch_data = avg_tput[avg_tput["architecture"] == arch].sort_values("vus")
        if not arch_data.empty:
            ax.plot(
                arch_data["vus"],
                arch_data["throughput_mean_req_s"],
                label=style["label"],
                color=style["color"],
                marker=style["marker"],
                linestyle=style["linestyle"],
                linewidth=1.8,
                markersize=6,
            )
    ax.set_title(f"System Throughput vs Concurrency{status_suffix}", fontsize=11, fontweight="bold")
    ax.set_xlabel("Concurrency (Virtual Users)", fontsize=10)
    ax.set_ylabel("Mean Throughput (req / s)", fontsize=10)
    ax.grid(True, linestyle=":", alpha=0.6)
    ax.legend(frameon=True, fontsize=9)
    fig.tight_layout()
    fig2_path = FIGURES_DIR / "throughput_vs_vu.png"
    fig.savefig(fig2_path, dpi=300, bbox_inches="tight")
    plt.close(fig)
    print(f"[Analyze] Generated figure: {fig2_path}")

    # 3. Figure: Peak RSS vs N Slices
    fig, ax = plt.subplots(figsize=(7, 4.5))
    rss_col = "peak_total_stack_rss_mean_mb" if "peak_total_stack_rss_mean_mb" in summary_df else "peak_rss_mean_mb"
    rss_data = summary_df.groupby(["architecture", "n_slices"])[rss_col].mean().reset_index()
    for arch, style in arch_styles.items():
        sub = rss_data[rss_data["architecture"] == arch].sort_values("n_slices")
        if not sub.empty:
            ax.plot(
                sub["n_slices"],
                sub[rss_col],
                label=style["label"],
                color=style["color"],
                marker=style["marker"],
                linestyle=style["linestyle"],
                linewidth=1.8,
                markersize=6,
            )
    ax.set_title(f"Peak Resident Memory (RSS) vs Payload Tier{status_suffix}", fontsize=11, fontweight="bold")
    ax.set_xlabel("Payload Slices (N)", fontsize=10)
    ax.set_ylabel("Peak Total Stack RSS (MB)", fontsize=10)
    ax.grid(True, linestyle=":", alpha=0.6)
    ax.legend(frameon=True, fontsize=9)
    fig.tight_layout()
    fig3_path = FIGURES_DIR / "peak_rss_vs_n.png"
    fig.savefig(fig3_path, dpi=300, bbox_inches="tight")
    plt.close(fig)
    print(f"[Analyze] Generated figure: {fig3_path}")


def main():
    parser = argparse.ArgumentParser(description="CDSS X-Core Experiment Statistical Analyzer")
    parser.parse_args()

    print("[Analyze] Loading benchmark execution results...")
    df = load_all_runs_data()
    if df.empty:
        print("[Analyze] No run data found in raw directory. Please execute runs first.")
        return

    print(f"[Analyze] Found {len(df)} run execution records.")
    summary_df = generate_cell_summary(df)
    generate_statistical_tests(df)
    generate_plots(summary_df)
    print("[Analyze] Statistical analysis and figure generation complete!")


if __name__ == "__main__":
    main()
