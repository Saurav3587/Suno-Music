package com.suno.music;

import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.List;

@CapacitorPlugin(name = "AppUpdate")
public class AppUpdatePlugin extends Plugin {

    @PluginMethod
    public void canInstallPackages(PluginCall call) {
        JSObject ret = new JSObject();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            ret.put("canInstall", getContext().getPackageManager().canRequestPackageInstalls());
        } else {
            ret.put("canInstall", true);
        }
        call.resolve(ret);
    }

    @PluginMethod
    public void openInstallPermissionSettings(PluginCall call) {
        try {
            openSettingsInternal(getContext());
            call.resolve();
        } catch (Exception e) {
            call.reject("Failed to open install settings: " + e.getMessage(), e);
        }
    }

    private void openSettingsInternal(Context context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            Intent intent = new Intent(
                Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                Uri.parse("package:" + context.getPackageName())
            );
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(intent);
        }
    }

    private File getApkFile(Context context) {
        File dir = context.getExternalCacheDir() != null ? context.getExternalCacheDir() : context.getCacheDir();
        return new File(dir, "suno-update.apk");
    }

    @PluginMethod
    public void installDownloadedApk(PluginCall call) {
        try {
            Context context = getContext();
            File apkFile = getApkFile(context);

            if (!apkFile.exists() || apkFile.length() == 0) {
                call.reject("Update APK not found. Please tap Update to download again.");
                return;
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                if (!context.getPackageManager().canRequestPackageInstalls()) {
                    openSettingsInternal(context);
                    JSObject ret = new JSObject();
                    ret.put("needsPermission", true);
                    call.resolve(ret);
                    return;
                }
            }

            triggerInstall(apkFile);
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to trigger installation: " + e.getMessage(), e);
        }
    }

    @PluginMethod
    public void downloadAndInstall(PluginCall call) {
        String downloadUrl = call.getString("url");
        if (downloadUrl == null || downloadUrl.isEmpty()) {
            call.reject("Download URL is required");
            return;
        }

        // Run background download task
        new Thread(() -> {
            HttpURLConnection conn = null;
            InputStream in = null;
            FileOutputStream out = null;

            try {
                Context context = getContext();
                File apkFile = getApkFile(context);

                if (apkFile.exists()) {
                    apkFile.delete();
                }

                URL url = new URL(downloadUrl);
                conn = (HttpURLConnection) url.openConnection();
                conn.setConnectTimeout(30000);
                conn.setReadTimeout(60000);
                conn.setInstanceFollowRedirects(true);
                conn.connect();

                // Handle HTTP redirects (301, 302, 307, 308)
                int responseCode = conn.getResponseCode();
                if (responseCode == HttpURLConnection.HTTP_MOVED_PERM ||
                    responseCode == HttpURLConnection.HTTP_MOVED_TEMP ||
                    responseCode == 307 || responseCode == 308) {
                    String newUrl = conn.getHeaderField("Location");
                    conn.disconnect();
                    url = new URL(newUrl);
                    conn = (HttpURLConnection) url.openConnection();
                    conn.setConnectTimeout(30000);
                    conn.setReadTimeout(60000);
                    conn.connect();
                    responseCode = conn.getResponseCode();
                }

                if (responseCode != HttpURLConnection.HTTP_OK) {
                    throw new Exception("Server returned HTTP " + responseCode + ": " + conn.getResponseMessage());
                }

                long totalBytes = conn.getContentLength();
                in = conn.getInputStream();
                out = new FileOutputStream(apkFile);

                byte[] buffer = new byte[8192];
                int bytesRead;
                long totalDownloaded = 0;
                int lastReportedProgress = -1;
                long lastReportTime = 0;

                while ((bytesRead = in.read(buffer)) != -1) {
                    out.write(buffer, 0, bytesRead);
                    totalDownloaded += bytesRead;

                    if (totalBytes > 0) {
                        int progress = (int) ((totalDownloaded * 100) / totalBytes);
                        long now = System.currentTimeMillis();
                        if (progress != lastReportedProgress && (now - lastReportTime > 80 || progress == 100)) {
                            lastReportedProgress = progress;
                            lastReportTime = now;
                            notifyProgress(progress);
                        }
                    }
                }

                out.flush();
                out.close();
                out = null;
                in.close();
                in = null;

                notifyProgress(100);

                // Make file globally readable for package installer
                apkFile.setReadable(true, false);

                // Check permission on Android 8.0+
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    if (!context.getPackageManager().canRequestPackageInstalls()) {
                        if (getActivity() != null) {
                            getActivity().runOnUiThread(() -> {
                                JSObject data = new JSObject();
                                data.put("needsPermission", true);
                                notifyListeners("permissionNeeded", data);
                            });
                        }
                        openSettingsInternal(context);

                        JSObject res = new JSObject();
                        res.put("needsPermission", true);
                        call.resolve(res);
                        return;
                    }
                }

                // Permission granted: launch package installer immediately
                triggerInstall(apkFile);

                JSObject res = new JSObject();
                res.put("success", true);
                call.resolve(res);

            } catch (Exception e) {
                JSObject errObj = new JSObject();
                errObj.put("error", e.getMessage());
                notifyListeners("downloadError", errObj);
                call.reject("Download failed: " + e.getMessage(), e);
            } finally {
                try {
                    if (out != null) out.close();
                    if (in != null) in.close();
                    if (conn != null) conn.disconnect();
                } catch (Exception ignored) {}
            }
        }).start();
    }

    private void notifyProgress(int percent) {
        if (getActivity() != null) {
            getActivity().runOnUiThread(() -> {
                JSObject data = new JSObject();
                data.put("progress", percent);
                notifyListeners("downloadProgress", data);
            });
        }
    }

    private void triggerInstall(File apkFile) throws Exception {
        Context context = getContext();
        Uri apkUri = FileProvider.getUriForFile(
            context,
            context.getPackageName() + ".fileprovider",
            apkFile
        );

        Intent intent = new Intent(Intent.ACTION_VIEW);
        intent.setDataAndType(apkUri, "application/vnd.android.package-archive");
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP);

        // Explicitly grant read URI permission to all resolving package installer packages
        PackageManager pm = context.getPackageManager();
        List<ResolveInfo> resInfoList = pm.queryIntentActivities(intent, PackageManager.MATCH_DEFAULT_ONLY);
        for (ResolveInfo resolveInfo : resInfoList) {
            String packageName = resolveInfo.activityInfo.packageName;
            context.grantUriPermission(packageName, apkUri, Intent.FLAG_GRANT_READ_URI_PERMISSION);
        }

        context.startActivity(intent);
    }
}
