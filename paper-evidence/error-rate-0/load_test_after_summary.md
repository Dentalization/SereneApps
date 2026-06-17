# Load Test After Summary

This document presents the metrics gathered from the final stabilized load tests.

## 1. Environment Metadata
- **Date**: 2026-06-17
- **API URL**: `http://localhost:4000/v1`
- **Duration**: 5m (300 seconds) per scenario
- **Database**: PostgreSQL 16 (Local)
- **Engine**: Prisma v6.16.1 (with Singleton Pool Connection of size 50)
- **External Mocking**: Enabled (`BENCHMARK_MOCK_EXTERNALS=true`)

## 2. Stabilized Load Test Results
The table below lists the metrics for each concurrent scenario:

| Scenario | Status | Avg Latency | p90 Latency | p95 Latency | p99 Latency | Throughput | Total Requests | Failed Requests | Error Rate |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **100 VU** | Completed | 232.67 ms | 797.26 ms | 1362.12 ms | 1556.69 ms | 206.38 req/s | 62,396 | 0 | **0.00%** |
| **200 VU** | Failed Threshold | 809.65 ms | 3412.39 ms | 4000.42 ms | 4613.82 ms | 187.31 req/s | 57,108 | 0 | **0.00%** |

## 3. Core Insights & Bottleneck Analysis
1. **100 VU Scenario (Passes SLA)**:
   - The p95 latency is **`1362.12 ms`**, satisfying the SLA requirement of `< 2000 ms`.
   - The error rate is exactly **`0.00%`**, satisfying the target of 0 errors.
   - Throughput reached **`206.38 req/s`**.
2. **200 VU Scenario (Machine Limit)**:
   - The error rate remains **`0.00%`**, showing that the backend is fully stable.
   - The p95 latency increased to **`4000.42 ms`**, exceeding the k6 SLA check (`p(95) < 3000 ms`) and failing the threshold check (exit code `99`).
   - Throughput dropped slightly to **`187.31 req/s`** (from `206.38 req/s` at 100 VU) because the single-core/local DB engine hit CPU/IO bottlenecks. This represents the local system's physical limit.
