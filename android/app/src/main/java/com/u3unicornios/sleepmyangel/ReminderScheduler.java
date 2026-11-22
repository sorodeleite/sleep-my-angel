package com.u3unicornios.sleepmyangel;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.Calendar;

public final class ReminderScheduler {
    private static final String PREFS = "sleep_my_angel_reminders";
    private static final String KEY = "items";

    private ReminderScheduler() {}

    public static void save(Context context, String value) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString(KEY, value).apply();
        scheduleAll(context, value);
    }

    public static void scheduleAll(Context context, String value) {
        try {
            JSONArray reminders = new JSONArray(value);
            for (int index = 0; index < reminders.length(); index++) {
                JSONObject item = reminders.optJSONObject(index);
                if (item == null) continue;
                if (item.optBoolean("enabled", true)) scheduleNext(context, item);
                else cancel(context, item.optString("id"));
            }
        } catch (Exception ignored) {
        }
    }

    public static void restore(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        scheduleAll(context, prefs.getString(KEY, "[]"));
    }

    public static void scheduleNext(Context context, JSONObject item) {
        String id = item.optString("id");
        String time = item.optString("time");
        JSONArray days = item.optJSONArray("days");
        if (id.isEmpty() || !time.matches("([01]\\d|2[0-3]):[0-5]\\d") || days == null || days.length() == 0) return;
        String[] parts = time.split(":");
        Calendar now = Calendar.getInstance();
        Calendar next = Calendar.getInstance();
        next.set(Calendar.SECOND, 0);
        next.set(Calendar.MILLISECOND, 0);
        next.set(Calendar.HOUR_OF_DAY, Integer.parseInt(parts[0]));
        next.set(Calendar.MINUTE, Integer.parseInt(parts[1]));
        boolean found = false;
        for (int offset = 0; offset < 8; offset++) {
            Calendar candidate = (Calendar) next.clone();
            candidate.add(Calendar.DAY_OF_YEAR, offset);
            int weekday = candidate.get(Calendar.DAY_OF_WEEK) - 1;
            boolean selected = false;
            for (int index = 0; index < days.length(); index++) {
                if (days.optInt(index, -1) == weekday) selected = true;
            }
            if (selected && candidate.after(now)) {
                next = candidate;
                found = true;
                break;
            }
        }
        if (!found) return;
        AlarmManager alarms = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarms == null) return;
        Intent intent = new Intent(context, ReminderReceiver.class);
        intent.putExtra("id", id);
        intent.putExtra("title", item.optString("title", "sleep my angel"));
        intent.putExtra("message", item.optString("message", ""));
        PendingIntent pending = PendingIntent.getBroadcast(context, id.hashCode(), intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) alarms.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, next.getTimeInMillis(), pending);
        else alarms.set(AlarmManager.RTC_WAKEUP, next.getTimeInMillis(), pending);
    }

    public static void cancel(Context context, String id) {
        if (id == null || id.isEmpty()) return;
        Intent intent = new Intent(context, ReminderReceiver.class);
        PendingIntent pending = PendingIntent.getBroadcast(context, id.hashCode(), intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        AlarmManager alarms = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarms != null) alarms.cancel(pending);
        pending.cancel();
    }
}