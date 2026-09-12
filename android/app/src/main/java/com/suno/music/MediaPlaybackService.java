package com.suno.music;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.os.Build;
import android.os.IBinder;
import android.support.v4.media.MediaMetadataCompat;
import android.support.v4.media.session.MediaSessionCompat;
import android.support.v4.media.session.PlaybackStateCompat;
import androidx.core.app.NotificationCompat;
import androidx.media.app.NotificationCompat.MediaStyle;
import android.os.PowerManager;
import android.net.wifi.WifiManager;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class MediaPlaybackService extends Service {
    public static final String CHANNEL_ID = "suno_music_playback";
    public static final int NOTIFICATION_ID = 1001;

    public static final String ACTION_UPDATE = "com.suno.music.ACTION_UPDATE";
    public static final String ACTION_PLAY = "com.suno.music.ACTION_PLAY";
    public static final String ACTION_PAUSE = "com.suno.music.ACTION_PAUSE";
    public static final String ACTION_PREV = "com.suno.music.ACTION_PREV";
    public static final String ACTION_NEXT = "com.suno.music.ACTION_NEXT";
    public static final String ACTION_STOP = "com.suno.music.ACTION_STOP";
    public static final String ACTION_SEEK = "com.suno.music.ACTION_SEEK";

    public interface MediaActionListener {
        void onMediaAction(String action, long position);
    }

    private static MediaActionListener actionListener;

    public static void setActionListener(MediaActionListener listener) {
        actionListener = listener;
    }

    private MediaSessionCompat mediaSession;
    private NotificationManager notificationManager;
    private ExecutorService imageExecutor = Executors.newSingleThreadExecutor();
    private PowerManager.WakeLock wakeLock;
    private WifiManager.WifiLock wifiLock;

    private String currentTitle = "Suno Music";
    private String currentArtist = "Playing";
    private String currentAlbum = "Suno";
    private String currentImageUrl = "";
    private boolean isPlaying = false;
    private long currentDuration = 0;
    private long currentPosition = 0;
    private Bitmap currentArtBitmap = null;

    private synchronized void initWakeLocks() {
        if (wakeLock == null) {
            try {
                PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
                if (pm != null) {
                    wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "SunoMusic:PlaybackWakeLock");
                    wakeLock.setReferenceCounted(false);
                }
            } catch (Exception e) {
                e.printStackTrace();
            }
        }
        if (wifiLock == null) {
            try {
                WifiManager wm = (WifiManager) getApplicationContext().getSystemService(Context.WIFI_SERVICE);
                if (wm != null) {
                    wifiLock = wm.createWifiLock(WifiManager.WIFI_MODE_FULL_HIGH_PERF, "SunoMusic:PlaybackWifiLock");
                    wifiLock.setReferenceCounted(false);
                }
            } catch (Exception e) {
                e.printStackTrace();
            }
        }
    }

    private synchronized void manageWakeLocks(boolean playing) {
        initWakeLocks();
        try {
            if (playing) {
                if (wakeLock != null && !wakeLock.isHeld()) {
                    wakeLock.acquire();
                }
                if (wifiLock != null && !wifiLock.isHeld()) {
                    wifiLock.acquire();
                }
            } else {
                if (wakeLock != null && wakeLock.isHeld()) {
                    wakeLock.release();
                }
                if (wifiLock != null && wifiLock.isHeld()) {
                    wifiLock.release();
                }
            }
        } catch (Exception ignored) {}
    }

    private synchronized void acquireTemporaryWakeLock(long timeoutMs) {
        initWakeLocks();
        try {
            if (wakeLock != null) {
                wakeLock.acquire(timeoutMs);
            }
        } catch (Exception ignored) {}
    }

    private synchronized void releaseWakeLocks() {
        try {
            if (wakeLock != null && wakeLock.isHeld()) {
                wakeLock.release();
            }
            if (wifiLock != null && wifiLock.isHeld()) {
                wifiLock.release();
            }
        } catch (Exception ignored) {}
    }

    @Override
    public void onCreate() {
        super.onCreate();
        notificationManager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        createNotificationChannel();
        initMediaSession();
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "Suno Music Playback",
                NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Shows media playback controls in notification and lock screen");
            channel.setShowBadge(false);
            channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
            if (notificationManager != null) {
                notificationManager.createNotificationChannel(channel);
            }
        }
    }

    private void initMediaSession() {
        mediaSession = new MediaSessionCompat(this, "SunoMediaSession");
        mediaSession.setActive(true);

        mediaSession.setCallback(new MediaSessionCompat.Callback() {
            @Override
            public void onPlay() {
                acquireTemporaryWakeLock(5000);
                isPlaying = true;
                manageWakeLocks(true);
                updateNotificationAndSession();
                if (actionListener != null) {
                    actionListener.onMediaAction("play", currentPosition);
                }
            }

            @Override
            public void onPause() {
                acquireTemporaryWakeLock(2000);
                isPlaying = false;
                manageWakeLocks(false);
                updateNotificationAndSession();
                if (actionListener != null) {
                    actionListener.onMediaAction("pause", currentPosition);
                }
            }

            @Override
            public void onSkipToNext() {
                acquireTemporaryWakeLock(5000);
                if (actionListener != null) {
                    actionListener.onMediaAction("next", 0);
                }
            }

            @Override
            public void onSkipToPrevious() {
                acquireTemporaryWakeLock(5000);
                if (actionListener != null) {
                    actionListener.onMediaAction("prev", 0);
                }
            }

            @Override
            public void onSeekTo(long pos) {
                acquireTemporaryWakeLock(3000);
                currentPosition = pos / 1000L;
                updateNotificationAndSession();
                if (actionListener != null) {
                    actionListener.onMediaAction("seek", currentPosition);
                }
            }
        });
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && intent.getAction() != null) {
            String action = intent.getAction();

            if (ACTION_UPDATE.equals(action)) {
                currentTitle = intent.getStringExtra("title") != null ? intent.getStringExtra("title") : "Suno Music";
                currentArtist = intent.getStringExtra("artist") != null ? intent.getStringExtra("artist") : "Unknown Artist";
                currentAlbum = intent.getStringExtra("album") != null ? intent.getStringExtra("album") : "Suno";
                String newImageUrl = intent.getStringExtra("imageUrl") != null ? intent.getStringExtra("imageUrl") : "";
                isPlaying = intent.getBooleanExtra("isPlaying", false);
                currentDuration = intent.getLongExtra("duration", 0);
                currentPosition = intent.getLongExtra("currentTime", 0);

                manageWakeLocks(isPlaying);

                if (!newImageUrl.equals(currentImageUrl)) {
                    currentImageUrl = newImageUrl;
                    loadArtworkAsync(currentImageUrl);
                } else {
                    updateNotificationAndSession();
                }
            } else if (ACTION_PLAY.equals(action)) {
                acquireTemporaryWakeLock(5000);
                isPlaying = true;
                manageWakeLocks(true);
                updateNotificationAndSession();
                if (actionListener != null) actionListener.onMediaAction("play", currentPosition);
            } else if (ACTION_PAUSE.equals(action)) {
                acquireTemporaryWakeLock(2000);
                isPlaying = false;
                manageWakeLocks(false);
                updateNotificationAndSession();
                if (actionListener != null) actionListener.onMediaAction("pause", currentPosition);
            } else if (ACTION_NEXT.equals(action)) {
                acquireTemporaryWakeLock(5000);
                if (actionListener != null) actionListener.onMediaAction("next", 0);
            } else if (ACTION_PREV.equals(action)) {
                acquireTemporaryWakeLock(5000);
                if (actionListener != null) actionListener.onMediaAction("prev", 0);
            } else if (ACTION_STOP.equals(action)) {
                releaseWakeLocks();
                stopForeground(true);
                stopSelf();
            }
        }
        return START_NOT_STICKY;
    }

    private void loadArtworkAsync(String urlStr) {
        if (urlStr == null || urlStr.isEmpty()) {
            currentArtBitmap = null;
            updateNotificationAndSession();
            return;
        }

        imageExecutor.execute(() -> {
            try {
                URL url = new URL(urlStr);
                HttpURLConnection connection = (HttpURLConnection) url.openConnection();
                connection.setDoInput(true);
                connection.setConnectTimeout(4000);
                connection.setReadTimeout(4000);
                connection.connect();
                InputStream input = connection.getInputStream();
                Bitmap bitmap = BitmapFactory.decodeStream(input);
                currentArtBitmap = bitmap;
            } catch (Exception e) {
                currentArtBitmap = null;
            }
            updateNotificationAndSession();
        });
    }

    private void updateNotificationAndSession() {
        if (mediaSession == null) return;

        long actions = PlaybackStateCompat.ACTION_PLAY
            | PlaybackStateCompat.ACTION_PAUSE
            | PlaybackStateCompat.ACTION_PLAY_PAUSE
            | PlaybackStateCompat.ACTION_SKIP_TO_NEXT
            | PlaybackStateCompat.ACTION_SKIP_TO_PREVIOUS
            | PlaybackStateCompat.ACTION_SEEK_TO;

        PlaybackStateCompat.Builder stateBuilder = new PlaybackStateCompat.Builder()
            .setActions(actions)
            .setState(
                isPlaying ? PlaybackStateCompat.STATE_PLAYING : PlaybackStateCompat.STATE_PAUSED,
                currentPosition * 1000L,
                isPlaying ? 1.0f : 0.0f
            );

        mediaSession.setPlaybackState(stateBuilder.build());

        MediaMetadataCompat.Builder metaBuilder = new MediaMetadataCompat.Builder()
            .putString(MediaMetadataCompat.METADATA_KEY_TITLE, currentTitle)
            .putString(MediaMetadataCompat.METADATA_KEY_ARTIST, currentArtist)
            .putString(MediaMetadataCompat.METADATA_KEY_ALBUM, currentAlbum)
            .putLong(MediaMetadataCompat.METADATA_KEY_DURATION, currentDuration * 1000L);

        if (currentArtBitmap != null) {
            metaBuilder.putBitmap(MediaMetadataCompat.METADATA_KEY_ALBUM_ART, currentArtBitmap);
        }
        mediaSession.setMetadata(metaBuilder.build());

        Notification notification = buildNotification();

        if (isPlaying) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);
            } else {
                startForeground(NOTIFICATION_ID, notification);
            }
        } else {
            // Keep notification visible in paused state so user can resume from lockscreen
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                stopForeground(STOP_FOREGROUND_DETACH);
            } else {
                stopForeground(false);
            }
            if (notificationManager != null) {
                notificationManager.notify(NOTIFICATION_ID, notification);
            }
        }
    }

    private Notification buildNotification() {
        Intent contentIntent = new Intent(this, MainActivity.class);
        contentIntent.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent pendingContentIntent = PendingIntent.getActivity(
            this,
            0,
            contentIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0)
        );

        PendingIntent prevIntent = PendingIntent.getService(
            this,
            1,
            new Intent(this, MediaPlaybackService.class).setAction(ACTION_PREV),
            PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0)
        );

        PendingIntent playPauseIntent = PendingIntent.getService(
            this,
            2,
            new Intent(this, MediaPlaybackService.class).setAction(isPlaying ? ACTION_PAUSE : ACTION_PLAY),
            PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0)
        );

        PendingIntent nextIntent = PendingIntent.getService(
            this,
            3,
            new Intent(this, MediaPlaybackService.class).setAction(ACTION_NEXT),
            PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0)
        );

        PendingIntent stopIntent = PendingIntent.getService(
            this,
            4,
            new Intent(this, MediaPlaybackService.class).setAction(ACTION_STOP),
            PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0)
        );

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_music_note)
            .setContentTitle(currentTitle)
            .setContentText(currentArtist)
            .setSubText(currentAlbum)
            .setContentIntent(pendingContentIntent)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setOngoing(isPlaying)
            .setShowWhen(false)
            .setSilent(true)
            .addAction(R.drawable.ic_skip_previous, "Previous", prevIntent)
            .addAction(isPlaying ? R.drawable.ic_pause : R.drawable.ic_play_arrow, isPlaying ? "Pause" : "Play", playPauseIntent)
            .addAction(R.drawable.ic_skip_next, "Next", nextIntent)
            .setStyle(
                new MediaStyle()
                    .setMediaSession(mediaSession.getSessionToken())
                    .setShowActionsInCompactView(0, 1, 2)
                    .setShowCancelButton(true)
                    .setCancelButtonIntent(stopIntent)
            );

        if (currentArtBitmap != null) {
            builder.setLargeIcon(currentArtBitmap);
        }

        return builder.build();
    }

    @Override
    public void onDestroy() {
        releaseWakeLocks();
        if (mediaSession != null) {
            mediaSession.setActive(false);
            mediaSession.release();
            mediaSession = null;
        }
        if (imageExecutor != null) {
            imageExecutor.shutdown();
        }
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
