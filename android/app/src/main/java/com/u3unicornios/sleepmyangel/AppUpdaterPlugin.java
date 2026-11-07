package com.u3unicornios.sleepmyangel;

import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@CapacitorPlugin(name = "AppUpdater")
public class AppUpdaterPlugin extends Plugin {
    private static final String RELEASES_API = "https://api.github.com/repos/sorodeleite/sleep-my-angel/releases/latest";
    private static final String UPDATE_DIR = "updates";
    private static final String APK_NAME = "sleep-my-angel.apk";
    private static final String VERSION_NAME = "downloaded-version.txt";
    private static final long MAX_APK_BYTES = 220L * 1024L * 1024L;

    private final ExecutorService executor = Executors.newSingleThreadExecutor();

    private File updateDir() {
        File dir = new File(getContext().getCacheDir(), UPDATE_DIR);
        if (!dir.exists()) dir.mkdirs();
        return dir;
    }

    private File apkFile() {
        return new File(updateDir(), APK_NAME);
    }

    private String downloadedVersion() {
        try {
            File file = new File(updateDir(), VERSION_NAME);
            if (!file.exists()) return "";
            byte[] data = new byte[(int) Math.min(file.length(), 256)];
            try (InputStream in = new java.io.FileInputStream(file)) {
                int read = in.read(data);
                return read > 0 ? new String(data, 0, read, "UTF-8").trim() : "";
            }
        } catch (Exception error) {
            return "";
        }
    }

    private void writeDownloadedVersion(String version) {
        try (FileOutputStream out = new FileOutputStream(new File(updateDir(), VERSION_NAME))) {
            out.write(String.valueOf(version == null ? "" : version).getBytes("UTF-8"));
        } catch (Exception ignored) {
        }
    }

    private JSObject appInfo() {
        JSObject info = new JSObject();
        Context context = getContext();
        try {
            PackageInfo packageInfo = context.getPackageManager().getPackageInfo(context.getPackageName(), 0);
            info.put("version", packageInfo.versionName == null ? "" : packageInfo.versionName);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                info.put("versionCode", packageInfo.getLongVersionCode());
            } else {
                info.put("versionCode", packageInfo.versionCode);
            }
        } catch (PackageManager.NameNotFoundException error) {
            info.put("version", "0");
            info.put("versionCode", 0);
        }
        info.put("packageName", context.getPackageName());
        info.put("canInstall", canInstall());
        info.put("downloaded", apkFile().exists());
        info.put("downloadedVersion", downloadedVersion());
        return info;
    }

    private boolean canInstall() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            return getContext().getPackageManager().canRequestPackageInstalls();
        }
        return true;
    }

    @PluginMethod
    public void info(PluginCall call) {
        call.resolve(appInfo());
    }

    @PluginMethod
    public void check(final PluginCall call) {
        executor.execute(() -> {
            HttpURLConnection connection = null;
            try {
                URL url = new URL(RELEASES_API);
                connection = (HttpURLConnection) url.openConnection();
                connection.setRequestMethod("GET");
                connection.setRequestProperty("Accept", "application/vnd.github+json");
                connection.setRequestProperty("User-Agent", "sleep-my-angel");
                connection.setConnectTimeout(15000);
                connection.setReadTimeout(25000);
                int status = connection.getResponseCode();
                if (status != 200) {
                    call.reject("o github respondeu " + status + " (tenta de novo em alguns minutos)");
                    return;
                }
                String body;
                try (InputStream in = connection.getInputStream()) {
                    ByteArrayOutputStream buffer = new ByteArrayOutputStream();
                    byte[] chunk = new byte[8192];
                    int read;
                    while ((read = in.read(chunk)) != -1) buffer.write(chunk, 0, read);
                    body = buffer.toString("UTF-8");
                }
                JSONObject release = new JSONObject(body);
                String tag = release.optString("tag_name", "").trim();
                String latest = tag.replaceFirst("^[vV]", "");
                String apkUrl = "";
                JSONArray assets = release.optJSONArray("assets");
                if (assets != null) {
                    for (int index = 0; index < assets.length(); index += 1) {
                        JSONObject asset = assets.getJSONObject(index);
                        String name = asset.optString("name", "");
                        if (name.toLowerCase().endsWith(".apk")) {
                            apkUrl = asset.optString("browser_download_url", "");
                            break;
                        }
                    }
                }
                JSObject result = appInfo();
                result.put("latestVersion", latest);
                result.put("tag", tag);
                result.put("notes", release.optString("body", ""));
                result.put("releaseUrl", release.optString("html_url", ""));
                result.put("apkUrl", apkUrl);
                result.put("hasUpdate", !apkUrl.isEmpty() && compareVersions(latest, result.getString("version", "0")) > 0);
                result.put("downloaded", apkFile().exists() && latest.equals(downloadedVersion()));
                call.resolve(result);
            } catch (Exception error) {
                call.reject("não consegui falar com o github: " + error.getMessage());
            } finally {
                if (connection != null) connection.disconnect();
            }
        });
    }

    @PluginMethod
    public void download(final PluginCall call) {
        final String apkUrl = call.getString("url", "");
        final String version = call.getString("version", "");
        if (apkUrl == null || apkUrl.isEmpty()) {
            call.reject("url do apk vazia");
            return;
        }
        executor.execute(() -> {
            HttpURLConnection connection = null;
            File temp = new File(updateDir(), APK_NAME + ".part");
            try {
                URL url = new URL(apkUrl);
                connection = (HttpURLConnection) url.openConnection();
                connection.setRequestMethod("GET");
                connection.setInstanceFollowRedirects(true);
                connection.setRequestProperty("User-Agent", "sleep-my-angel");
                connection.setConnectTimeout(20000);
                connection.setReadTimeout(60000);
                int status = connection.getResponseCode();
                if (status != 200) {
                    call.reject("o download respondeu " + status);
                    return;
                }
                long total = connection.getContentLengthLong();
                if (total > MAX_APK_BYTES) {
                    call.reject("esse apk é grande demais");
                    return;
                }
                if (temp.exists() && !temp.delete()) {
                    call.reject("não consegui limpar o download antigo");
                    return;
                }
                long received = 0;
                long lastNotified = 0;
                try (InputStream in = connection.getInputStream();
                     FileOutputStream out = new FileOutputStream(temp)) {
                    byte[] chunk = new byte[64 * 1024];
                    int read;
                    while ((read = in.read(chunk)) != -1) {
                        out.write(chunk, 0, read);
                        received += read;
                        if (received > MAX_APK_BYTES) {
                            throw new Exception("apk grande demais");
                        }
                        long now = System.currentTimeMillis();
                        if (now - lastNotified > 180) {
                            lastNotified = now;
                            notifyProgress(total > 0 ? (int) Math.min(100, (received * 100) / total) : 0, received, total, version);
                        }
                    }
                }
                File target = apkFile();
                if (target.exists() && !target.delete()) {
                    call.reject("não consegui substituir o apk antigo");
                    return;
                }
                if (!temp.renameTo(target)) {
                    call.reject("não consegui guardar o apk baixado");
                    return;
                }
                writeDownloadedVersion(version);
                notifyProgress(100, received, total, version);
                JSObject result = new JSObject();
                result.put("path", target.getAbsolutePath());
                result.put("version", version);
                result.put("size", received);
                call.resolve(result);
            } catch (Exception error) {
                if (temp.exists()) temp.delete();
                call.reject("o download falhou: " + error.getMessage());
            } finally {
                if (connection != null) connection.disconnect();
            }
        });
    }

    private void notifyProgress(final int progress, final long received, final long total, final String version) {
        if (getActivity() == null) return;
        getActivity().runOnUiThread(() -> {
            JSObject data = new JSObject();
            data.put("progress", progress);
            data.put("received", received);
            data.put("total", total);
            data.put("version", version);
            notifyListeners("downloadProgress", data);
        });
    }

    private boolean hasPendingApk() {
        File file = apkFile();
        return file.exists() && file.length() > 0;
    }

    @PluginMethod
    public void install(PluginCall call) {
        if (!hasPendingApk()) {
            call.reject("o apk ainda não foi baixado");
            return;
        }
        if (!canInstall()) {
            JSObject result = new JSObject();
            result.put("needsPermission", true);
            call.resolve(result);
            return;
        }
        try {
            Context context = getContext();
            Uri uri = FileProvider.getUriForFile(context, context.getPackageName() + ".fileprovider", apkFile());
            Intent intent = new Intent(Intent.ACTION_VIEW);
            intent.setDataAndType(uri, "application/vnd.android.package-archive");
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(intent);
            JSObject result = new JSObject();
            result.put("started", true);
            call.resolve(result);
        } catch (Exception error) {
            call.reject("não consegui abrir o instalador: " + error.getMessage());
        }
    }

    @PluginMethod
    public void openInstallSettings(PluginCall call) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                Intent intent = new Intent(
                    Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                    Uri.parse("package:" + getContext().getPackageName())
                );
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(intent);
            }
            call.resolve();
        } catch (Exception error) {
            call.reject("não consegui abrir as permissões: " + error.getMessage());
        }
    }

    @PluginMethod
    public void openUrl(PluginCall call) {
        String url = call.getString("url", "");
        if (url == null || url.isEmpty()) {
            call.reject("url vazia");
            return;
        }
        try {
            Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            call.resolve();
        } catch (Exception error) {
            call.reject("não consegui abrir o link: " + error.getMessage());
        }
    }

    private int compareVersions(String left, String right) {
        int[] a = versionParts(left);
        int[] b = versionParts(right);
        int length = Math.max(a.length, b.length);
        for (int index = 0; index < length; index += 1) {
            int one = index < a.length ? a[index] : 0;
            int two = index < b.length ? b[index] : 0;
            if (one > two) return 1;
            if (one < two) return -1;
        }
        return 0;
    }

    private int[] versionParts(String value) {
        String clean = String.valueOf(value == null ? "" : value).replaceFirst("^[vV]", "");
        String[] pieces = clean.split("[^0-9]+");
        int[] parts = new int[pieces.length];
        int count = 0;
        for (String piece : pieces) {
            if (piece.isEmpty()) continue;
            try {
                parts[count] = Integer.parseInt(piece);
                count += 1;
            } catch (NumberFormatException ignored) {
            }
        }
        int[] result = new int[count];
        System.arraycopy(parts, 0, result, 0, count);
        return result;
    }
}
