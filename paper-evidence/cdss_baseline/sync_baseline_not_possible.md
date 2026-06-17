# Synchronous CDSS Baseline Not Possible

No successful asynchronous latency rows were available at `paper-evidence/cdss_latency/cdss_latency_results.csv`.

This repository currently exposes the X-Core upload/conversion flow asynchronously: the backend returns after upload/metadata persistence and triggers Python conversion in the background. A direct synchronous production route is not exposed. To avoid changing application behavior, this benchmark only computes a simulated synchronous baseline after asynchronous measurements exist.
