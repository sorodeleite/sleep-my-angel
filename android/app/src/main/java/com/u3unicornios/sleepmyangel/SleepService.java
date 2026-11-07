package com.u3unicornios.sleepmyangel;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.os.Build;
import android.os.IBinder;
import android.os.PowerManager;

public class SleepService extends Service {
    public static final String EXTRA_TITLE = "title";

    private static final String CHANNEL_ID = "sleep_playback";
    private static final int NOTIFICATION_ID = 41;
    private static final long WAKE_LOCK_TIMEOUT = 12 * 60 * 60 * 1000L;

    private PowerManager.WakeLock wakeLock;
    private boolean foregroundStarted = false;

    @Override
    public void onCreate() {
        super.onCreate();
        createChannel();
        PowerManager powerManager = (PowerManager) getSystemService(POWER_SERVICE);
        if (powerManager != null) {
            wakeLock = powerManager.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "sleepmyangel:playback");
            wakeLock.setReferenceCounted(false);
        }
        startForegroundSafely(buildNotification("sleep my angel"));
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String title = intent != null ? intent.getStringExtra(EXTRA_TITLE) : null;
        if (title == null || title.trim().isEmpty()) {
            title = "sleep my angel";
        }

        if (!foregroundStarted) {
            startForegroundSafely(buildNotification(title));
        } else {
            NotificationManager manager = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
            if (manager != null) {
                try {
                    manager.notify(NOTIFICATION_ID, buildNotification(title));
                } catch (SecurityException ignored) {
                    stopSelf();
                    return START_NOT_STICKY;
                }
            }
        }

        if (wakeLock != null && !wakeLock.isHeld()) {
            wakeLock.acquire(WAKE_LOCK_TIMEOUT);
        }

        return START_NOT_STICKY;
    }

    private void startForegroundSafely(Notification notification) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);
            } else {
                startForeground(NOTIFICATION_ID, notification);
            }
            foregroundStarted = true;
        } catch (RuntimeException error) {
            foregroundStarted = false;
            stopSelf();
        }
    }

    @Override
    public void onDestroy() {
        if (wakeLock != null && wakeLock.isHeld()) {
            wakeLock.release();
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            stopForeground(STOP_FOREGROUND_REMOVE);
        } else {
            stopForeground(true);
        }
        super.onDestroy();
    }

    @Override
    public void onTaskRemoved(Intent rootIntent) {
        stopSelf();
        super.onTaskRemoved(rootIntent);
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    private void createChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationChannel channel = new NotificationChannel(
            CHANNEL_ID,
            "Reprodução",
            NotificationManager.IMPORTANCE_LOW
        );
        channel.setDescription("mantém o áudio do sleep my angel tocando");
        channel.setShowBadge(false);
        channel.setSound(null, null);
        channel.enableVibration(false);
        NotificationManager manager = getSystemService(NotificationManager.class);
        if (manager != null) {
            manager.createNotificationChannel(channel);
        }
    }

    private Notification buildNotification(String title) {
        Intent openIntent = new Intent(this, MainActivity.class);
        openIntent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent openPending = PendingIntent.getActivity(
            this,
            0,
            openIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        Notification.Builder builder = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
            ? new Notification.Builder(this, CHANNEL_ID)
            : new Notification.Builder(this);

        builder
            .setContentTitle(title)
            .setContentText("tocando em segundo plano")
            .setSmallIcon(R.drawable.ic_stat_sleep)
            .setContentIntent(openPending)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setShowWhen(false);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            builder.setColor(0xFFF4F4F5);
        }

        return builder.build();
    }
}
