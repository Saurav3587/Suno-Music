package com.suno.music;

import android.Manifest;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
import androidx.core.content.ContextCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

@CapacitorPlugin(
    name = "MusicNotification",
    permissions = {
        @Permission(
            strings = { Manifest.permission.POST_NOTIFICATIONS },
            alias = "notifications"
        )
    }
)
public class MusicNotificationPlugin extends Plugin {

    @Override
    public void load() {
        super.load();
        MediaPlaybackService.setActionListener((action, position) -> {
            if (getActivity() != null) {
                getActivity().runOnUiThread(() -> {
                    JSObject data = new JSObject();
                    data.put("action", action);
                    data.put("position", position);
                    notifyListeners("mediaAction", data);
                });
            } else {
                JSObject data = new JSObject();
                data.put("action", action);
                data.put("position", position);
                notifyListeners("mediaAction", data);
            }
        });
    }

    @PluginMethod
    public void updatePlayback(PluginCall call) {
        Context context = getContext();
        if (context == null) {
            call.reject("Context is null");
            return;
        }

        String title = call.getString("title", "Suno Music");
        String artist = call.getString("artist", "Unknown Artist");
        String album = call.getString("album", "Suno");
        String imageUrl = call.getString("imageUrl", "");
        boolean isPlaying = Boolean.TRUE.equals(call.getBoolean("isPlaying", false));
        long duration = Math.round(call.getData().optDouble("duration", 0.0));
        long currentTime = Math.round(call.getData().optDouble("currentTime", 0.0));

        Intent intent = new Intent(context, MediaPlaybackService.class);
        intent.setAction(MediaPlaybackService.ACTION_UPDATE);
        intent.putExtra("title", title);
        intent.putExtra("artist", artist);
        intent.putExtra("album", album);
        intent.putExtra("imageUrl", imageUrl);
        intent.putExtra("isPlaying", isPlaying);
        intent.putExtra("duration", duration);
        intent.putExtra("currentTime", currentTime);

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && isPlaying) {
                context.startForegroundService(intent);
            } else {
                context.startService(intent);
            }
            call.resolve();
        } catch (Exception e) {
            call.reject("Failed to start MediaPlaybackService: " + e.getMessage());
        }
    }

    @PluginMethod
    public void stopPlayback(PluginCall call) {
        Context context = getContext();
        if (context != null) {
            Intent intent = new Intent(context, MediaPlaybackService.class);
            intent.setAction(MediaPlaybackService.ACTION_STOP);
            try {
                context.startService(intent);
            } catch (Exception ignored) {}
        }
        call.resolve();
    }

    @PluginMethod
    public void requestNotificationPermission(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(getContext(), Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                requestPermissionForAlias("notifications", call, "permissionCallback");
                return;
            }
        }
        JSObject ret = new JSObject();
        ret.put("granted", true);
        call.resolve(ret);
    }

    @PermissionCallback
    private void permissionCallback(PluginCall call) {
        JSObject ret = new JSObject();
        boolean granted = true;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            granted = ContextCompat.checkSelfPermission(getContext(), Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED;
        }
        ret.put("granted", granted);
        call.resolve(ret);
    }
}
