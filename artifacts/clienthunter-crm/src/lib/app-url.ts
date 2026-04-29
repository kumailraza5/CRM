export function getAppUrl(path = "/") {
  const configuredUrl = import.meta.env.VITE_APP_URL?.replace(/\/+$/, "");
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  if (configuredUrl) {
    return `${configuredUrl}${basePath}${normalizedPath}`;
  }

  return `${window.location.origin}${basePath}${normalizedPath}`;
}
