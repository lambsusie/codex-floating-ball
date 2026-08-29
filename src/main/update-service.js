const LATEST_RELEASE_URL = "https://api.github.com/repos/lambsusie/codex-floating-ball/releases/latest";
const RELEASES_PAGE_URL = "https://github.com/lambsusie/codex-floating-ball/releases";

function parseVersion(value) {
  const match = String(value || "")
    .trim()
    .match(/^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/);
  if (!match) return null;
  return {
    numbers: match.slice(1, 4).map(Number),
    prerelease: match[4] ? match[4].split(".") : []
  };
}

function comparePrerelease(left, right) {
  if (left.length === 0 && right.length === 0) return 0;
  if (left.length === 0) return 1;
  if (right.length === 0) return -1;

  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    if (left[index] === undefined) return -1;
    if (right[index] === undefined) return 1;
    if (left[index] === right[index]) continue;
    const leftNumber = /^\d+$/.test(left[index]) ? Number(left[index]) : null;
    const rightNumber = /^\d+$/.test(right[index]) ? Number(right[index]) : null;
    if (leftNumber !== null && rightNumber !== null) return leftNumber > rightNumber ? 1 : -1;
    if (leftNumber !== null) return -1;
    if (rightNumber !== null) return 1;
    return left[index].localeCompare(right[index]);
  }
  return 0;
}

function compareVersions(leftValue, rightValue) {
  const left = parseVersion(leftValue);
  const right = parseVersion(rightValue);
  if (!left || !right) throw new Error("Invalid semantic version.");

  for (let index = 0; index < 3; index += 1) {
    if (left.numbers[index] === right.numbers[index]) continue;
    return left.numbers[index] > right.numbers[index] ? 1 : -1;
  }
  return comparePrerelease(left.prerelease, right.prerelease);
}

function isAllowedReleaseUrl(value) {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      url.hostname === "github.com" &&
      url.pathname.startsWith("/lambsusie/codex-floating-ball/releases/")
    );
  } catch {
    return false;
  }
}

async function checkForUpdate({ currentVersion, fetchImpl = globalThis.fetch, timeoutMs = 10000 } = {}) {
  if (!parseVersion(currentVersion)) throw new Error("Current app version is invalid.");
  if (typeof fetchImpl !== "function") throw new Error("Update requests are unavailable.");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(LATEST_RELEASE_URL, {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": `Codex-Floating-Ball/${currentVersion}`,
        "X-GitHub-Api-Version": "2022-11-28"
      },
      signal: controller.signal
    });
    if (!response.ok) throw new Error(`GitHub release request failed with status ${response.status}.`);

    const release = await response.json();
    const latestVersion = String(release?.tag_name || "").replace(/^v/i, "");
    const releaseUrl = String(release?.html_url || "");
    if (!parseVersion(latestVersion) || !isAllowedReleaseUrl(releaseUrl)) {
      throw new Error("GitHub returned an invalid release.");
    }

    return {
      currentVersion,
      latestVersion,
      releaseUrl,
      updateAvailable: compareVersions(latestVersion, currentVersion) > 0
    };
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = {
  LATEST_RELEASE_URL,
  RELEASES_PAGE_URL,
  checkForUpdate,
  compareVersions,
  isAllowedReleaseUrl,
  parseVersion
};
