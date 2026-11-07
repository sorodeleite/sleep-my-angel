package com.u3unicornios.sleepmyangel;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.webkit.JavascriptInterface;

import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static final int NOTIFICATION_PERMISSION = 501;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(AppUpdaterPlugin.class);
        super.onCreate(savedInstanceState);
        if (getBridge() != null && getBridge().getWebView() != null) {
            getBridge().getWebView().addJavascriptInterface(new PlaybackBridge(), "SleepPlayback");
        }
        requestNotificationPermission();
    }

    private void requestNotificationPermission() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) return;
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED) {
            return;
        }
        ActivityCompat.requestPermissions(
            this,
            new String[] { Manifest.permission.POST_NOTIFICATIONS },
            NOTIFICATION_PERMISSION
        );
    }

    private class PlaybackBridge {
        @JavascriptInterface
        public void start(String title) {
            Intent intent = new Intent(MainActivity.this, SleepService.class);
            intent.putExtra(SleepService.EXTRA_TITLE, title);
            try {
                ContextCompat.startForegroundService(MainActivity.this, intent);
            } catch (RuntimeException error) {
                try {
                    startService(intent);
                } catch (RuntimeException ignored) {
                    stopService(intent);
                }
            }
        }

        @JavascriptInterface
        public void stop() {
            try {
                stopService(new Intent(MainActivity.this, SleepService.class));
            } catch (RuntimeException ignored) {
                stopService(new Intent(MainActivity.this, SleepService.class));
            }
        }
    }
}
