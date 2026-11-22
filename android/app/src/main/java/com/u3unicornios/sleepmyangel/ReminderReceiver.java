package com.u3unicornios.sleepmyangel;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

import org.json.JSONArray;
import org.json.JSONObject;

public class ReminderReceiver extends BroadcastReceiver {
    private static final String CHANNEL = "sleep_my_angel_reminders";

    @Override
    public void onReceive(Context context, Intent intent) {
        String id = intent.getStringExtra("id");
        String title = intent.getStringExtra("title");
        String message = intent.getStringExtra("message");
        createChannel(context);
        try {
            NotificationCompat.Builder notification = new NotificationCompat.Builder(context, CHANNEL)
                .setSmallIcon(context.getApplicationInfo().icon)
                .setContentTitle(title == null || title.isEmpty() ? "sleep my angel" : title)
                .setContentText(message == null || message.isEmpty() ? "um lembrete do seu cantinho ♡" : message)
                .setPriority(NotificationCompat.PRIORITY_DEFAULT)
                .setAutoCancel(true);
            NotificationManagerCompat.from(context).notify(id == null ? 1 : id.hashCode(), notification.build());
        } catch (SecurityException ignored) {
        }
        if (id == null) return;
        String saved = context.getSharedPreferences("sleep_my_angel_reminders", Context.MODE_PRIVATE).getString("items", "[]");
        try {
            JSONArray reminders = new JSONArray(saved);
            for (int index = 0; index < reminders.length(); index++) {
                JSONObject item = reminders.optJSONObject(index);
                if (item != null && id.equals(item.optString("id")) && item.optBoolean("enabled", true)) {
                    ReminderScheduler.scheduleNext(context, item);
                    break;
                }
            }
        } catch (Exception ignored) {
        }
    }

    private void createChannel(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager manager = context.getSystemService(NotificationManager.class);
        if (manager == null || manager.getNotificationChannel(CHANNEL) != null) return;
        NotificationChannel channel = new NotificationChannel(CHANNEL, "Lembretes", NotificationManager.IMPORTANCE_DEFAULT);
        channel.setDescription("Lembretes personalizados do sleep my angel");
        manager.createNotificationChannel(channel);
    }
}