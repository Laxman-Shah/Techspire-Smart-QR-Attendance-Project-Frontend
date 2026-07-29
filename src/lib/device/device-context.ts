import { getInstallationId, getBrowserFingerprint } from "./installation";

export interface DeviceContextRequest {
  InstallationIdentifier: string;
  BrowserFingerprint?: string;
  DeviceName?: string;
  DeviceType?: string;
  OperatingSystem?: string;
  OperatingSystemVersion?: string;
  BrowserName?: string;
  BrowserVersion?: string;
}

/**
 * Builds a device context object compatible with backend DeviceContextRequest.
 * This function should only run in the browser (not during SSR).
 */
export function buildDeviceContext(): DeviceContextRequest {
  if (typeof window === "undefined") {
    return {
      InstallationIdentifier: "server-side-placeholder",
    };
  }

  const userAgent = navigator.userAgent;
  const platform = navigator.platform;

  // Parse device type
  let deviceType = "Desktop";
  if (/Mobile|Android|iPhone|iPad|iPod/i.test(userAgent)) {
    deviceType = /Tablet|iPad/i.test(userAgent) ? "Tablet" : "Mobile";
  }

  // Parse operating system
  let operatingSystem = "Unknown";
  let operatingSystemVersion = "Unknown";

  if (/Windows/i.test(userAgent)) {
    operatingSystem = "Windows";
    const match = /Windows NT (\d+\.\d+)/.exec(userAgent);
    if (match) {
      operatingSystemVersion = match[1];
    }
  } else if (/Mac OS X/i.test(userAgent)) {
    operatingSystem = "macOS";
    const match = /Mac OS X (\d+[_\.]\d+[_\.]\d+)/.exec(userAgent);
    if (match) {
      operatingSystemVersion = match[1].replace(/_/g, ".");
    }
  } else if (/Linux/i.test(userAgent)) {
    operatingSystem = "Linux";
  } else if (/Android/i.test(userAgent)) {
    operatingSystem = "Android";
    const match = /Android (\d+\.\d+)/.exec(userAgent);
    if (match) {
      operatingSystemVersion = match[1];
    }
  } else if (/iOS|iPhone|iPad|iPod/i.test(userAgent)) {
    operatingSystem = "iOS";
    const match = /OS (\d+[_\.]\d+[_\.]\d+)/.exec(userAgent);
    if (match) {
      operatingSystemVersion = match[1].replace(/_/g, ".");
    }
  }

  // Parse browser name and version
  let browserName = "Unknown";
  let browserVersion = "Unknown";

  if (/Edg/i.test(userAgent) && !/Edge/i.test(userAgent)) {
    browserName = "Edge";
    const match = /Edg\/(\d+\.\d+\.\d+\.\d+)/.exec(userAgent);
    if (match) browserVersion = match[1];
  } else if (/Chrome/i.test(userAgent) && !/Edg/i.test(userAgent)) {
    browserName = "Chrome";
    const match = /Chrome\/(\d+\.\d+\.\d+\.\d+)/.exec(userAgent);
    if (match) browserVersion = match[1];
  } else if (/Safari/i.test(userAgent) && !/Chrome/i.test(userAgent)) {
    browserName = "Safari";
    const match = /Version\/(\d+\.\d+)/.exec(userAgent);
    if (match) browserVersion = match[1];
  } else if (/Firefox/i.test(userAgent)) {
    browserName = "Firefox";
    const match = /Firefox\/(\d+\.\d+)/.exec(userAgent);
    if (match) browserVersion = match[1];
  } else if (/MSIE|Trident/i.test(userAgent)) {
    browserName = "Internet Explorer";
    const match = /MSIE (\d+\.\d+)/.exec(userAgent) || /rv:(\d+\.\d+)/.exec(userAgent);
    if (match) browserVersion = match[1];
  }

  // Build device name
  const deviceName = `${browserName} on ${operatingSystem}`;

  return {
    InstallationIdentifier: getInstallationId(),
    BrowserFingerprint: getBrowserFingerprint() || undefined,
    DeviceName: deviceName,
    DeviceType: deviceType,
    OperatingSystem: operatingSystem,
    OperatingSystemVersion: operatingSystemVersion,
    BrowserName: browserName,
    BrowserVersion: browserVersion,
  };
}
