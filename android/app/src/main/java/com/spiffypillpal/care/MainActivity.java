package com.spiffypillpal.care;

import android.os.Bundle;
import android.view.WindowManager;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        // Register custom plugins BEFORE super.onCreate() so Capacitor
        // discovers them before the WebView bridge is initialised.
        registerPlugin(AxisSecurityPlugin.class);

        super.onCreate(savedInstanceState);

        // Block screenshots, screen recording, and Circle to Search at the OS level.
        getWindow().setFlags(
            WindowManager.LayoutParams.FLAG_SECURE,
            WindowManager.LayoutParams.FLAG_SECURE
        );
    }
}
