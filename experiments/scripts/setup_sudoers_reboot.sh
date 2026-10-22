#!/bin/bash
set -euo pipefail

SUDOERS_FILE="/etc/sudoers.d/harness_reboot"
RULE="adrianhalim ALL=(ALL) NOPASSWD: /sbin/shutdown -r *"

echo "=== Least-Privilege Sudoers Rule Setup for Experiment Auto-Reboot ==="
echo "Target file: ${SUDOERS_FILE}"
echo "Rule content: ${RULE}"
echo ""

if [ -f "${SUDOERS_FILE}" ]; then
    CURRENT_CONTENT=$(cat "${SUDOERS_FILE}" 2>/dev/null || true)
    if [ "${CURRENT_CONTENT}" = "${RULE}" ]; then
        echo "[OK] Sudoers rule is already correctly installed."
        exit 0
    fi
fi

echo "Installing sudoers rule..."
if [ "$(id -u)" -ne 0 ]; then
    echo "${RULE}" | sudo tee "${SUDOERS_FILE}" > /dev/null
    sudo chmod 0440 "${SUDOERS_FILE}"
else
    echo "${RULE}" > "${SUDOERS_FILE}"
    chmod 0440 "${SUDOERS_FILE}"
fi

echo "[OK] Installed rule in ${SUDOERS_FILE} with permissions 0440."
