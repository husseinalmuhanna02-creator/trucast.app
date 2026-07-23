package com.trucast.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // تسجيل جسر مشاركة الشاشة الذي أنشأناه للتو
        registerPlugin(ScreenSharePlugin.class);
        super.onCreate(savedInstanceState);
    }
}
